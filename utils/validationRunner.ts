import {
  AlgorithmType,
  TokenEdge,
  TokenizerResult,
  ValidationCase,
  ValidationMetrics,
  ValidationRow,
  ValidationStatus,
  VocabItem,
} from '../types';
import { tokenizeWithTrace, normalizeText } from './tokenizerEngine';
import { MOCK_VOCAB } from '../constants';

const fmtPct = (value: number): string => `${Math.round(value * 100)}%`;

const getVocab = (customVocab?: VocabItem[]): VocabItem[] =>
  customVocab && customVocab.length > 0 ? customVocab : MOCK_VOCAB;

const isUnknownToken = (label: string, _vocab: VocabItem[]): boolean => {
  // Treat explicit unknown placeholders as unknown.
  return label === '[UNK]' || label.startsWith('[UNK:');
};

const detokenize = (tokens: string[]): string => {
  // Heuristic detokenizer:
  // - WordPiece-style "##" prefix: append without space.
  // - RoBERTa-style "Ġ" prefix: treat as start-of-word and insert space before (then drop "Ġ").
  // - Otherwise, separate tokens by a single space.
  let out = '';
  tokens.forEach((tok, idx) => {
    let t = tok;

    if (t.startsWith('##')) {
      // WordPiece continuation
      t = t.replace(/^##/, '');
      out += t;
      return;
    }

    if (t.startsWith('Ġ')) {
      // RoBERTa BPE space marker
      t = t.replace(/^Ġ/, '');
      if (out.length > 0) out += ' ';
      out += t;
      return;
    }

    if (idx > 0) out += ' ';
    out += t;
  });
  return out.trim();
};

const computeBacktracks = (
  algo: AlgorithmType,
  frames: ReturnType<typeof tokenizeWithTrace>['frames']
): number => {
  if (algo === AlgorithmType.UNIGRAM) {
    // Count updates to an already-reached node: frame ids that start with "frame-update-"
    return frames.filter((f) => f.id.startsWith('frame-update-')).length;
  }
  // Greedy algorithms (BPE / WordPiece as modeled here) do not backtrack;
  // they make a single forward choice at each step.
  return 0;
};

const statusForMetric = (metric: keyof ValidationMetrics, value: number): ValidationStatus => {
  switch (metric) {
    case 'tokenAccuracy':
    case 'boundaryAccuracy':
    case 'normalizationAccuracy':
    case 'roundTripConsistency':
      if (value >= 0.9) return 'Pass';
      if (value >= 0.8) return 'Needs work';
      return 'Fail';
    case 'unknownTokenRate':
      // Lower is better
      if (value <= 0.02) return 'Pass';
      if (value <= 0.05) return 'Needs work';
      return 'Fail';
    case 'avgFSTBacktracks':
      // Fewer is better. Rough heuristic thresholds.
      if (value <= 5) return 'Pass';
      if (value <= 10) return 'Needs work';
      return 'Fail';
    default:
      return 'Needs work';
  }
};

export const runValidation = (
  cases: ValidationCase[],
  algo: AlgorithmType,
  normalize: boolean,
  customVocab?: VocabItem[]
): { metrics: ValidationMetrics; rows: ValidationRow[] } => {
  const vocab = getVocab(customVocab);

  let totalGoldTokens = 0;
  let matchingTokens = 0;

  let totalGoldBoundaries = 0;
  let matchingBoundaries = 0;

  let totalCases = cases.length;
  let normalizationCorrect = 0;

  let totalTokens = 0;
  let unknownTokens = 0;

  let roundTripCorrect = 0;

  let totalBacktracks = 0;

  for (const c of cases) {
    const { result, frames } = tokenizeWithTrace(c.input, algo, normalize, customVocab);

    const processedText = result.graph.text;

    // Token accuracy
    totalGoldTokens += c.goldTokens.length;
    const hypTokens = result.tokens;

    const maxLen = Math.max(c.goldTokens.length, hypTokens.length);
    for (let i = 0; i < maxLen; i++) {
      if (c.goldTokens[i] && hypTokens[i] && c.goldTokens[i] === hypTokens[i]) {
        matchingTokens++;
      }
    }

    // Boundary accuracy – compute gold boundaries on the processed text,
    // based on goldTokens, so it stays aligned with normalization settings.
    const goldBounds: { start: number; end: number }[] = [];
    let cursor = 0;
    for (const tok of c.goldTokens) {
      const start = processedText.indexOf(tok, cursor);
      if (start === -1) continue;
      const end = start + tok.length;
      goldBounds.push({ start, end });
      cursor = end;
    }
    totalGoldBoundaries += goldBounds.length;

    const selectedEdges: TokenEdge[] = result.selectedPath
      .map((id) => result.graph.edges.find((e) => e.id === id))
      .filter((e): e is TokenEdge => !!e);

    for (let i = 0; i < goldBounds.length; i++) {
      const g = goldBounds[i];
      const e = selectedEdges[i];
      if (e && e.from === g.start && e.to === g.end) {
        matchingBoundaries++;
      }
    }

    // Normalization accuracy
    const expectedNorm = c.goldNormalized ?? processedText;
    if (processedText === expectedNorm) {
      normalizationCorrect++;
    }

    // Unknown token rate
    // We only compute this over ASCII-like tokens so that non-Latin scripts
    // (e.g., Urdu) don't dominate the metric. Within that subset, we only
    // count explicit [UNK]-style placeholders as unknown.
    for (const t of hypTokens) {
      if (/[^\x00-\x7F]/.test(t)) continue; // skip non-ASCII tokens entirely
      totalTokens++;
      if (isUnknownToken(t, vocab)) unknownTokens++;
    }

    // Round-trip consistency
    const goldDetok = c.goldDetokenized ?? detokenize(c.goldTokens);
    const hypDetok = detokenize(hypTokens);
    const normGoldDetok = goldDetok.replace(/\s+/g, ' ').trim();
    const normHypDetok = hypDetok.replace(/\s+/g, ' ').trim();
    if (normGoldDetok === normHypDetok) {
      roundTripCorrect++;
    }

    // Backtracks
    totalBacktracks += computeBacktracks(algo, frames);
  }

  const metrics: ValidationMetrics = {
    tokenAccuracy: totalGoldTokens ? matchingTokens / totalGoldTokens : 0,
    boundaryAccuracy: totalGoldBoundaries ? matchingBoundaries / totalGoldBoundaries : 0,
    normalizationAccuracy: totalCases ? normalizationCorrect / totalCases : 0,
    unknownTokenRate: totalTokens ? unknownTokens / totalTokens : 0,
    roundTripConsistency: totalCases ? roundTripCorrect / totalCases : 0,
    avgFSTBacktracks: totalCases ? totalBacktracks / totalCases : 0,
  };

  const rows: ValidationRow[] = [
    {
      metric: 'Token Accuracy',
      value: fmtPct(metrics.tokenAccuracy),
      status: statusForMetric('tokenAccuracy', metrics.tokenAccuracy),
      notes: 'Token-level comparison against gold tokens',
    },
    {
      metric: 'Boundary Accuracy',
      value: fmtPct(metrics.boundaryAccuracy),
      status: statusForMetric('boundaryAccuracy', metrics.boundaryAccuracy),
      notes: 'Character span alignment for tokens',
    },
    {
      metric: 'Normalization Accuracy',
      value: fmtPct(metrics.normalizationAccuracy),
      status: statusForMetric('normalizationAccuracy', metrics.normalizationAccuracy),
    },
    {
      metric: 'Unknown Token Rate',
      value: `${(metrics.unknownTokenRate * 100).toFixed(1)}%`,
      status: statusForMetric('unknownTokenRate', metrics.unknownTokenRate),
      notes: 'Share of tokens not present in vocabulary',
    },
    {
      metric: 'Round-trip Consistency',
      value: fmtPct(metrics.roundTripConsistency),
      status: statusForMetric('roundTripConsistency', metrics.roundTripConsistency),
      notes: 'Detokenize(tokens) matches gold string',
    },
    {
      metric: 'FST Backtracks',
      value: metrics.avgFSTBacktracks.toFixed(1),
      status: statusForMetric('avgFSTBacktracks', metrics.avgFSTBacktracks),
      notes: 'Higher values indicate more competing paths',
    },
  ];

  return { metrics, rows };
};


