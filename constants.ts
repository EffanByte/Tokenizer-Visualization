import { VocabItem } from './types';

// Vocabulary will be loaded asynchronously from public/vocab.json
// For now, use a placeholder that will be replaced at runtime
let VOCAB_DATA: VocabItem[] = [];
let VOCAB_LOADED = false;

// Load vocabulary from external JSON file at runtime (BERT-base-uncased filtered)
async function loadVocabAsync() {
  try {
    const response = await fetch('/vocab.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.vocab && Array.isArray(data.vocab)) {
      VOCAB_DATA = data.vocab;
      VOCAB_LOADED = true;
      console.log(`✓ Loaded ${VOCAB_DATA.length} tokens from vocab.json`);
    }
  } catch (err) {
    console.warn('Could not load vocab.json, will use fallback vocabulary:', err);
    VOCAB_DATA = FALLBACK_VOCAB;
    VOCAB_LOADED = true;
  }
}

// Trigger loading immediately
loadVocabAsync();

// A small fallback vocabulary for demonstration purposes (used if JSON fails to load).
// Includes common subwords to demonstrate splitting.
const FALLBACK_VOCAB: VocabItem[] = [
  // Common Starts
  { token: 't', score: 1 },
  { token: 'th', score: 2 },
  { token: 'the', score: 5 },
  { token: 'a', score: 1 },
  { token: 'an', score: 2 },
  { token: 'un', score: 3 },
  { token: 'in', score: 2 },
  { token: 'inter', score: 4 },
  { token: 'run', score: 3 },
  { token: 'running', score: 6 },
  
  // Middles/Ends
  { token: 'at', score: 1 },
  { token: 'tre', score: 2 },
  { token: 're', score: 1 },
  { token: 'r', score: 0.5 },
  { token: 'ing', score: 4 },
  { token: 'n', score: 0.5 },
  { token: 'i', score: 0.5 },
  { token: 'tion', score: 5 },
  { token: 'national', score: 6 },
  { token: 'ali', score: 3 },
  { token: 'zation', score: 5 },
  { token: 'is', score: 2 },
  { token: 'on', score: 1 },
  { token: 'count', score: 4 },
  { token: 'er', score: 2 },
  { token: 'intui', score: 4 },
  { token: 'tive', score: 4 },
  { token: 'happ', score: 3 },
  { token: 'y', score: 1 },
  { token: 'ness', score: 3 },
  { token: 'est', score: 2 },
  { token: 'low', score: 3 },
  { token: 'new', score: 3 },
  { token: 'neural', score: 5 },
  { token: 'net', score: 3 },
  { token: 'work', score: 3 },
  { token: 'works', score: 4 },
  // Tokens added to improve demo coverage (A+B)
  { token: 'token', score: 5 },
  { token: 'tokeni', score: 4 },
  { token: 'tokeniz', score: 5 },
  { token: 'tokenize', score: 6 },
  { token: 'tokenizer', score: 7 },
  { token: 'ize', score: 3 },
  { token: 'izer', score: 4 },
  
  // WordPiece specific (## markers) - Simplified logic will treat these separately
  { token: '##ing', score: 4 },
  { token: '##tion', score: 5 },
  { token: '##er', score: 2 },
  { token: '##ness', score: 3 },
  { token: '##y', score: 1 },
  { token: '##s', score: 1 },
];

// Export MOCK_VOCAB: use VOCAB_DATA if loaded, otherwise fallback
export const MOCK_VOCAB: VocabItem[] = VOCAB_DATA.length > 0 ? VOCAB_DATA : FALLBACK_VOCAB;

export const UNIGRAM_PROBS: Record<string, number> = {};
// Convert scores to pseudo-probs for Unigram (normalized softmax-like)
const _expScores = MOCK_VOCAB.map(v => Math.exp(v.score));
const _expSum = _expScores.reduce((s, x) => s + x, 0) || 1;
MOCK_VOCAB.forEach((v, idx) => {
  UNIGRAM_PROBS[v.token] = _expScores[idx] / _expSum;
});

export const BPE_RANKS: Record<string, number> = {};
// Convert scores to ranks (Higher score = More frequent = Lower Rank ID)
MOCK_VOCAB.sort((a, b) => b.score - a.score).forEach((v, i) => {
    BPE_RANKS[v.token] = i;
});
