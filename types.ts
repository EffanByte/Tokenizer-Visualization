export enum AlgorithmType {
  BPE = 'BPE',
  WORDPIECE = 'WordPiece',
  UNIGRAM = 'Unigram'
}

export enum VocabMode {
  HF_ROBERTA = 'HF RoBERTa',
  HF_GPT2 = 'HF GPT2'
}

export interface TokenEdge {
  id: string;
  from: number;
  to: number;
  label: string;
  score: number; // Probability or Rank
  isStart?: boolean;
  isEnd?: boolean;
}

export interface FSTGraphData {
  nodes: number[]; // Character indices
  edges: TokenEdge[];
  text: string;
}

export interface TokenizerResult {
  graph: FSTGraphData;
  selectedPath: string[]; // Array of edge IDs
  tokens: string[];
}

// --- Validation & Evaluation Types ---

export interface ValidationCase {
  id: string;
  input: string;
  goldTokens: string[];
  // Character span for each gold token, in terms of indices into the (normalized) text.
  goldBoundaries: Array<{ start: number; end: number }>;
  // Optional expected normalized form of the input.
  goldNormalized?: string;
  // Optional expected string after tokenization + detokenization.
  goldDetokenized?: string;
}

export interface ValidationMetrics {
  tokenAccuracy: number;
  boundaryAccuracy: number;
  normalizationAccuracy: number;
  unknownTokenRate: number;
  roundTripConsistency: number;
  avgFSTBacktracks: number;
}

export type ValidationStatus = 'Pass' | 'Fail' | 'Needs work';

export interface ValidationRow {
  metric: string;
  value: string;
  status: ValidationStatus;
  notes?: string;
}

export interface StepFrame {
  id: string; // unique frame id
  description?: string; // short human text describing the frame
  candidates: string[]; // edge IDs being considered at this step
  chosen?: string; // edge ID chosen at this step (if any)
  partialPath: string[]; // selectedPath up to this step
  // Optional snapshot of Viterbi costs (node -> cost)
  viterbiSnapshot?: Array<{ node: number; cost: number; edgeId: string | null; prev: number }>; 
}

export interface VocabItem {
  token: string;
  score: number; // Log prob or Rank (lower rank = better for BPE)
}