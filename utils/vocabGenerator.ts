import { VocabItem } from '../types';

/**
 * Generate vocabulary dynamically from input text.
 * Uses BPE-like merging to identify frequent subword patterns.
 */
export const generateVocabFromText = (text: string, minFreq: number = 2, maxVocabSize: number = 500): VocabItem[] => {
  const normalized = text.toLowerCase().trim();
  if (!normalized) return [];

  // Step 1: Start with character-level tokens
  const vocab = new Map<string, number>();
  
  // Count character unigrams
  for (const char of normalized) {
    vocab.set(char, (vocab.get(char) ?? 0) + 1);
  }

  // Step 2: Iteratively merge frequent adjacent pairs (BPE-like)
  let iterations = 0;
  const maxIterations = 50;

  while (vocab.size < maxVocabSize && iterations < maxIterations) {
    iterations++;
    
    // Find all adjacent pairs in the text given current vocab
    const pairCounts = new Map<string, number>();
    
    let current = normalized;
    for (const token of vocab.keys()) {
      if (token.length === 1) continue; // Skip single chars for pair counting
    }

    // Rebuild text using current vocab as tokens
    const words = normalized.split(/\s+/);
    for (const word of words) {
      if (!word) continue;
      
      // Tokenize word using current vocab (greedy longest match)
      let i = 0;
      while (i < word.length) {
        let found = false;
        for (let len = Math.min(10, word.length - i); len >= 1; len--) {
          const substr = word.substring(i, i + len);
          if (vocab.has(substr)) {
            // Found a token; now look for adjacent pairs
            if (i + len < word.length) {
              for (let nextLen = Math.min(10, word.length - i - len); nextLen >= 1; nextLen--) {
                const nextSubstr = word.substring(i + len, i + len + nextLen);
                if (vocab.has(nextSubstr)) {
                  const pair = substr + '|' + nextSubstr;
                  pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + 1);
                  break;
                }
              }
            }
            i += len;
            found = true;
            break;
          }
        }
        if (!found) {
          i += 1; // Skip unknown char
        }
      }
    }

    // Find most frequent pair
    let bestPair = '';
    let bestCount = minFreq - 1;
    for (const [pair, count] of pairCounts.entries()) {
      if (count > bestCount) {
        bestCount = count;
        bestPair = pair;
      }
    }

    if (!bestPair) break; // No more pairs to merge

    // Add merged token to vocab
    const [left, right] = bestPair.split('|');
    const merged = left + right;
    vocab.set(merged, bestCount);
  }

  // Step 3: Convert to VocabItem array, sorted by frequency
  const items: VocabItem[] = Array.from(vocab.entries())
    .map(([token, freq]) => ({
      token,
      score: freq // Use frequency as score (higher = better)
    }))
    .sort((a, b) => b.score - a.score);

  return items;
};

/**
 * Generate vocabulary using character n-grams from input text.
 * Alternative to BPE merging; simpler and deterministic.
 */
export const generateVocabFromNgrams = (text: string, minN: number = 1, maxN: number = 4, minFreq: number = 1): VocabItem[] => {
  const normalized = text.toLowerCase().trim();
  if (!normalized) return [];

  const vocab = new Map<string, number>();
  
  // Extract n-grams
  for (let n = minN; n <= maxN; n++) {
    for (let i = 0; i <= normalized.length - n; i++) {
      const ngram = normalized.substring(i, i + n);
      if (!/\s/.test(ngram)) { // Skip n-grams containing spaces
        vocab.set(ngram, (vocab.get(ngram) ?? 0) + 1);
      }
    }
  }

  // Filter by min frequency and convert to VocabItem
  const items: VocabItem[] = Array.from(vocab.entries())
    .filter(([_, freq]) => freq >= minFreq)
    .map(([token, freq]) => ({
      token,
      score: freq
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 500); // Cap at 500 items

  return items;
};

/**
 * Augment vocab with common affixes and special tokens.
 */
export const augmentVocabWithAffixes = (vocab: VocabItem[]): VocabItem[] => {
  const commonAffixes = [
    { token: '##ing', score: 50 },
    { token: '##er', score: 45 },
    { token: '##ed', score: 40 },
    { token: '##ly', score: 35 },
    { token: '##tion', score: 50 },
    { token: '##ness', score: 40 },
    { token: 'un', score: 35 },
    { token: 're', score: 30 },
    { token: 'in', score: 25 },
    { token: 'dis', score: 25 },
  ];

  const vocabSet = new Set(vocab.map(v => v.token));
  const augmented = [...vocab];

  for (const affix of commonAffixes) {
    if (!vocabSet.has(affix.token)) {
      augmented.push(affix);
    }
  }

  return augmented.sort((a, b) => b.score - a.score);
};
