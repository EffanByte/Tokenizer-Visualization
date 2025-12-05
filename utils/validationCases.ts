import { ValidationCase } from '../types';

// A small curated set of validation examples. You can expand this as needed.
// Gold boundaries are derived at evaluation time from goldTokens so they stay
// aligned with the current normalization / vocab settings.

const simpleCase = (
  id: string,
  raw: string,
  goldTokens: string[],
  goldDetok?: string
): ValidationCase => ({
  id,
  input: raw,
  goldTokens,
  goldBoundaries: [],
  goldDetokenized: goldDetok,
});

export const VALIDATION_CASES: ValidationCase[] = [
  // Contraction – set gold tokens to align with our WordPiece-style behavior.
  simpleCase('contraction-1', "Don't", ["don", "'t"]),
  // Hyphenated
  simpleCase('hyphen-1', 'state-of-the-art', ['state', '-', 'of', '-', 'the', '-', 'art']),
  // Simple English
  simpleCase('simple-1', 'running', ['running']),
  // Mixed case + normalization
  simpleCase('norm-1', 'Internationalization', ['international', 'ization']),
  // Placeholder for non-Latin / Urdu words – kept as a single token.
  simpleCase('urdu-1', 'پاکستان', ['پاکستان']),
];

