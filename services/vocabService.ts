  import { VocabItem } from '../types';

  /**
   * Load tokenizer vocab from Hugging Face model hub using HF CDN (huggingface-cdn).
   * Returns a VocabItem array with scores derived from token ID (lower ID = more frequent).
   */

  
  export const loadHFTokenizerVocab = async (modelName: string): Promise<VocabItem[]> => {
    const urlsToTry = [
      `https://huggingface-cdn.co/${modelName}/resolve/main/vocab.json`,
      `https://huggingface.co/${modelName}/raw/main/vocab.json`,
    ];

    for (const vocabUrl of urlsToTry) {
      try {
        console.log(`[HF Vocab] Trying: ${vocabUrl}`);
        
        const response = await fetch(vocabUrl);
        
        if (!response.ok) {
          console.warn(`[HF Vocab] HTTP ${response.status} from ${vocabUrl}, trying next...`);
          continue;
        }

        const vocabJson: Record<string, number> = await response.json();
        const tokenCount = Object.keys(vocabJson).length;
        console.log(`[HF Vocab] Successfully loaded ${tokenCount} tokens from ${modelName} (${vocabUrl})`);
        
        // Convert HF vocab (token -> id) to VocabItem array
        // Score = inverse of ID (lower ID = more frequent in training = higher score for better selection)
        const items: VocabItem[] = Object.entries(vocabJson)
          .map(([token, id]) => {
            const numId = typeof id === 'number' ? id : 0;
            return {
              token,
              // Higher score for lower IDs (common tokens get picked first)
              score: Math.max(0, 10000 - numId)
            };
          })
          .filter(item => item.token && item.token.length > 0) // Remove empty tokens
          .sort((a, b) => b.score - a.score);

        console.log(`[HF Vocab] Processed ${items.length} items. Top 10 tokens:`, items.slice(0, 10).map(i => i.token));
        return items;
      } catch (error) {
        console.warn(`[HF Vocab] Failed with ${vocabUrl}:`, error);
        continue;
      }
    }

    console.error(`[HF Vocab] Failed to load vocab from ${modelName} - all URLs failed`);
    return [];
  };

  /**
   * Load vocab from a custom URL (e.g., your own JSON file).
   */
  export const loadVocabFromUrl = async (url: string): Promise<VocabItem[]> => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load vocab from ${url}: ${response.statusText}`);
      }

      const data = await response.json();

      // Support two formats:
      // 1. Array of VocabItem: [{ token: "...", score: ... }, ...]
      // 2. Object mapping token -> score: { "token": score, ... }
      let items: VocabItem[] = [];

      if (Array.isArray(data)) {
        items = data;
      } else if (typeof data === 'object') {
        items = Object.entries(data).map(([token, score]) => ({
          token,
          score: typeof score === 'number' ? score : 1
        }));
      }

      return items.sort((a, b) => b.score - a.score).slice(0, 2000);
    } catch (error) {
      console.error('Failed to load vocab from URL:', error);
      return [];
    }
  };

  /**
   * Common Hugging Face model names for quick access.
   * Map preset names to full model IDs on HF.
   */
// Map presets to *local* static vocab files served from /public
const LOCAL_HF_VOCAB_PATHS = {
  'roberta-base': '/vocab/roberta-base-vocab.json',
  'gpt2': '/vocab/gpt2-vocab.json',
} as const;

export type HFModelPreset = keyof typeof LOCAL_HF_VOCAB_PATHS;

export const isValidHFPreset = (name: string): name is HFModelPreset => {
  return name in LOCAL_HF_VOCAB_PATHS;
};

async function loadLocalHFVocab(preset: HFModelPreset): Promise<VocabItem[]> {
  const url = LOCAL_HF_VOCAB_PATHS[preset];
  console.log(`[HF Local] Loading ${preset} from ${url}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load local HF vocab from ${url}: ${response.status} ${response.statusText}`);
  }

  const vocabJson: Record<string, number> = await response.json();

  const items: VocabItem[] = Object.entries(vocabJson)
    .map(([token, id]) => {
      const numId = typeof id === 'number' ? id : 0;
      return {
        token,
        // Same logic as your original loadHFTokenizerVocab:
        // lower ID -> more frequent -> higher score
        score: Math.max(0, 10000 - numId),
      };
    })
    .filter(item => item.token && item.token.length > 0)
    .sort((a, b) => b.score - a.score);

  console.log(`[HF Local] Processed ${items.length} vocab items for ${preset}`);
  return items;
}

export const loadHFPreset = async (preset: HFModelPreset): Promise<VocabItem[]> => {
  return loadLocalHFVocab(preset);
};