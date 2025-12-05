import { AlgorithmType, FSTGraphData, TokenEdge, TokenizerResult, StepFrame, VocabItem } from '../types';
import { MOCK_VOCAB, UNIGRAM_PROBS, BPE_RANKS } from '../constants';

// --- Step 3.1: Normalization ---
export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .trim();
};

// --- Step 3.2: Token Matching (Building the Lattice/Graph) ---
// This finds possible tokens in the string from our vocab.
// To keep the lattice manageable (and reduce backtracking), we:
//  - limit maximum token length
//  - only create a single-character "unknown" edge when no vocab token starts at that position.
const buildLattice = (text: string, algo: AlgorithmType, customVocab?: VocabItem[]): { edges: TokenEdge[], nodes: number[] } => {
  const edges: TokenEdge[] = [];
  const nodes: number[] = Array.from({ length: text.length + 1 }, (_, i) => i);
  const n = text.length;
  const vocab = customVocab || MOCK_VOCAB;
  const MAX_TOKEN_LENGTH = 20; // safety limit for lattice density
  
  // Build lookup maps for scoring
  const unigramProbs: Record<string, number> = {};
  const bpeRanks: Record<string, number> = {};
  if (customVocab) {
    // Derive probabilities and ranks from custom vocab
    const expScores = customVocab.map(v => Math.exp(v.score));
    const expSum = expScores.reduce((s, x) => s + x, 0) || 1;
    customVocab.forEach((v, idx) => {
      unigramProbs[v.token] = expScores[idx] / expSum;
      bpeRanks[v.token] = idx; // Lower index = better rank
    });
  } else {
    Object.assign(unigramProbs, UNIGRAM_PROBS);
    Object.assign(bpeRanks, BPE_RANKS);
  }

  for (let i = 0; i < n; i++) {
    let hasMatchAtPosition = false;

    const maxJ = Math.min(n, i + MAX_TOKEN_LENGTH);
    for (let j = i + 1; j <= maxJ; j++) {
      const substr = text.substring(i, j);
      
      // Attempt to match with Vocab
      let match = vocab.find(v => v.token === substr);

      // WordPiece-style suffix logic: if not at start of word, prefer ##substr
      if (!match && algo === AlgorithmType.WORDPIECE && i > 0) {
        const suffixMatch = vocab.find(v => v.token === `##${substr}`);
        if (suffixMatch) {
          match = suffixMatch;
        }
      }

      if (!match) continue;

      hasMatchAtPosition = true;

      let score = match.score;
      
      // Adjust score definition based on algorithm for visualization
      if (algo === AlgorithmType.UNIGRAM) {
        // Cost = -log(prob). We want to MINIMIZE cost.
        const prob = unigramProbs[match.token] || 0.0001;
        score = -Math.log(prob);
      } else if (algo === AlgorithmType.BPE) {
        // BPE greedy prefers known merges (lower rank id).
        score = bpeRanks[match.token] ?? 999;
      } else {
        // WordPiece: greedy longest match. Score = length helps visualization
        score = substr.length;
      }

      edges.push({
        id: `edge-${i}-${j}-${match.token}`,
        from: i,
        to: j,
        label: match.token,
        score: score,
      });
    }

    // If no vocab token starts at this position, add a single-character fallback edge.
    if (!hasMatchAtPosition) {
      const unknownChar = text[i];
      edges.push({
        id: `edge-${i}-${i + 1}-fallback-${unknownChar}`,
        from: i,
        to: i + 1,
        // Use the raw character as the label so it behaves like a normal token
        // but is still heavily penalized compared to real vocab items.
        label: unknownChar,
        score: 10, // Penalize fallbacks so they are chosen only when necessary
      });
    }
  }
  return { edges, nodes };
};

// --- Step 5: Decoding ---

// 5.1 Greedy Decoding (Forward Max Match) - Used for WordPiece approximation here
// Note: Real BPE iteratively merges pairs across the whole corpus. 
// For a pre-trained BPE visualization on a single string, we often treat it as a greedy application of merge rules 
// or longest match against the vocab. We will use Longest Match for WordPiece.
const greedyDecode = (edges: TokenEdge[], length: number): string[] => {
  let current = 0;
  const path: string[] = [];

  while (current < length) {
    // Find edges starting at 'current'
    const candidates = edges.filter(e => e.from === current);
    
    if (candidates.length === 0) break; // Dead end

    // Greedy strategy: Longest token (maximize 'to')
    // If tie, pick one with best inherent score
    candidates.sort((a, b) => {
        const lenDiff = (b.to - b.from) - (a.to - a.from);
        if (lenDiff !== 0) return lenDiff;
        return 0; 
    });

    const best = candidates[0];
    path.push(best.id);
    current = best.to;
  }
  return path;
};

// Special Greedy for BPE: Iteratively apply "merges" (simulated by Rank ID)
// Actually, for visualization simplicity on a lattice, we can simulate BPE as:
// Shortest Path on a graph where edge weights are based on merge priority? 
// No, standard BPE inference is usually greedy longest match against the finalized vocab.
// We will stick to Greedy Longest Match for BPE/WordPiece in this visualizer.

// 5.2 Viterbi Decoding (Shortest Path) - Used for Unigram
const viterbiDecode = (edges: TokenEdge[], length: number): string[] => {
  // DP Array: minCost[i] = { cost, edgeId, prevNode }
  const minCost = Array(length + 1).fill({ cost: Infinity, edgeId: null, prevNode: -1 });
  minCost[0] = { cost: 0, edgeId: null, prevNode: -1 };

  for (let i = 0; i < length; i++) {
    if (minCost[i].cost === Infinity) continue; // Unreachable

    const outgoing = edges.filter(e => e.from === i);
    for (const edge of outgoing) {
      const newCost = minCost[i].cost + edge.score; // edge.score is -log(prob)
      if (newCost < minCost[edge.to].cost) {
        minCost[edge.to] = { cost: newCost, edgeId: edge.id, prevNode: i };
      }
    }
  }

  // Backtrack
  const path: string[] = [];
  let curr = length;
  while (curr > 0) {
    const node = minCost[curr];
    if (!node.edgeId) break; // Should not happen if path exists
    path.unshift(node.edgeId);
    curr = node.prevNode;
  }
  return path;
};

// --- Main Function ---
export const tokenize = (inputText: string, algo: AlgorithmType, normalize: boolean, customVocab?: VocabItem[]): TokenizerResult => {
  const processedText = normalize ? normalizeText(inputText) : inputText;
  
  const { edges, nodes } = buildLattice(processedText, algo, customVocab);
  let selectedPath: string[] = [];

  if (algo === AlgorithmType.UNIGRAM) {
    selectedPath = viterbiDecode(edges, processedText.length);
  } else {
    // BPE and WordPiece (Simulated Greedy)
    selectedPath = greedyDecode(edges, processedText.length);
  }

  // Filter edges to extract final tokens
  const tokens = selectedPath.map(id => edges.find(e => e.id === id)?.label || '');

  return {
    graph: { nodes, edges, text: processedText },
    selectedPath,
    tokens
  };
};

// --- Tracing / Step-by-step tokenization ---
// Returns both the usual TokenizerResult and an ordered list of StepFrame for UI playback
export const tokenizeWithTrace = (inputText: string, algo: AlgorithmType, normalize: boolean, customVocab?: VocabItem[]): { result: TokenizerResult; frames: StepFrame[] } => {
  const processedText = normalize ? normalizeText(inputText) : inputText;
  const { edges, nodes } = buildLattice(processedText, algo, customVocab);
  const frames: StepFrame[] = [];

  if (algo === AlgorithmType.UNIGRAM) {
    // Viterbi with snapshots
    const length = processedText.length;
    // DP Array: minCost[i] = { cost, edgeId, prevNode }
    const minCost: Array<{ cost: number; edgeId: string | null; prevNode: number }> = Array(length + 1).fill(null as any).map(() => ({ cost: Infinity, edgeId: null, prevNode: -1 }));
    minCost[0] = { cost: 0, edgeId: null, prevNode: -1 };

    for (let i = 0; i < length; i++) {
      if (minCost[i].cost === Infinity) continue;

      const outgoing = edges.filter(e => e.from === i);
      // Create a frame showing we are considering outgoing edges from node i
      frames.push({
        id: `frame-consider-${i}`,
        description: `Considering outgoing edges from node ${i}`,
        candidates: outgoing.map(e => e.id),
        partialPath: [],
        viterbiSnapshot: minCost.map((m, idx) => ({ node: idx, cost: m.cost, edgeId: m.edgeId, prev: m.prevNode }))
      });

      for (const edge of outgoing) {
        const newCost = minCost[i].cost + edge.score;
        if (newCost < minCost[edge.to].cost) {
          minCost[edge.to] = { cost: newCost, edgeId: edge.id, prevNode: i };
          // Snapshot frame showing an update
          frames.push({
            id: `frame-update-${i}-${edge.to}`,
            description: `Update cost for node ${edge.to} via ${edge.id}`,
            candidates: [edge.id],
            chosen: edge.id,
            partialPath: [],
            viterbiSnapshot: minCost.map((m, idx) => ({ node: idx, cost: m.cost, edgeId: m.edgeId, prev: m.prevNode }))
          });
        }
      }
    }

    // Backtrack to produce chosen path frames
    const path: string[] = [];
    let curr = processedText.length;
    while (curr > 0) {
      const node = minCost[curr];
      if (!node || !node.edgeId) break;
      path.unshift(node.edgeId);
      curr = node.prevNode;
      frames.push({
        id: `frame-backtrack-${curr}`,
        description: `Backtracking chose ${path[0]}`,
        candidates: [],
        chosen: path[0],
        partialPath: [...path],
        viterbiSnapshot: minCost.map((m, idx) => ({ node: idx, cost: m.cost, edgeId: m.edgeId, prev: m.prevNode }))
      });
    }

    const result: TokenizerResult = {
      graph: { nodes, edges, text: processedText },
      selectedPath: path,
      tokens: path.map(id => edges.find(e => e.id === id)?.label || '')
    };

    return { result, frames };
  } else {
    // Greedy decode tracing (BPE/WordPiece)
    const length = processedText.length;
    let current = 0;
    const path: string[] = [];

    while (current < length) {
      const candidates = edges.filter(e => e.from === current);
      // Frame: considering candidates
      frames.push({
        id: `frame-consider-${current}`,
        description: `Considering tokens at index ${current}`,
        candidates: candidates.map(c => c.id),
        partialPath: [...path]
      });

      if (candidates.length === 0) break;

      candidates.sort((a, b) => {
        const lenDiff = (b.to - b.from) - (a.to - a.from);
        if (lenDiff !== 0) return lenDiff;
        return 0;
      });

      const best = candidates[0];
      path.push(best.id);
      current = best.to;

      // Frame: chosen
      frames.push({
        id: `frame-choose-${best.id}`,
        description: `Chose ${best.label} (${best.id})`,
        candidates: candidates.map(c => c.id),
        chosen: best.id,
        partialPath: [...path]
      });
    }

    const result: TokenizerResult = {
      graph: { nodes, edges, text: processedText },
      selectedPath: path,
      tokens: path.map(id => edges.find(e => e.id === id)?.label || '')
    };

    return { result, frames };
  }
};
