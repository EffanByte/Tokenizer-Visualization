import React, { useState, useEffect, useCallback } from 'react';
import { AlgorithmType, TokenizerResult, StepFrame, VocabMode, VocabItem, ValidationRow } from './types';
import { tokenize, tokenizeWithTrace } from './utils/tokenizerEngine';
import { loadHFPreset, isValidHFPreset } from './services/vocabService';
import FSTGraph from './components/FSTGraph';
import Controls from './components/Controls';
import StepInspector from './components/StepInspector';
import { generateTokenizerInsight, assessTokenizationWithLLM, LLMTokenAssessment } from './services/geminiService';
import { LayoutGrid, Cpu, BookOpen, Sparkles } from 'lucide-react';
import ValidationModal from './components/ValidationModal';
import { VALIDATION_CASES } from './utils/validationCases';
import { runValidation } from './utils/validationRunner';
import { generateTokenReference } from './services/geminiService';

const App: React.FC = () => {
  const [text, setText] = useState("unhappiness");
  const [algo, setAlgo] = useState<AlgorithmType>(AlgorithmType.UNIGRAM);
  const [normalize, setNormalize] = useState(true);
  
  const [result, setResult] = useState<TokenizerResult | null>(null);
  const [insight, setInsight] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  // Vocab state
  const [vocabMode, setVocabMode] = useState<VocabMode>(VocabMode.HF_ROBERTA);
  const [customVocab, setCustomVocab] = useState<VocabItem[] | undefined>(undefined);
  const [vocabLoading, setVocabLoading] = useState(false);
  // Step playback state
  const [showSteps, setShowSteps] = useState(false);
  const [frames, setFrames] = useState<StepFrame[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [vocabError, setVocabError] = useState<string>("");

  // Validation state
  const [showValidation, setShowValidation] = useState(false);
  const [validationRows, setValidationRows] = useState<ValidationRow[] | null>(null);
  const [llmAssessment, setLlmAssessment] = useState<LLMTokenAssessment | null>(null);

  // Load vocab based on mode
  useEffect(() => {
    const loadVocab = async () => {
      setVocabLoading(true);
      setVocabError("");
      let newVocab: VocabItem[] | undefined;

      try {
        if (vocabMode === VocabMode.HF_ROBERTA) {
          newVocab = await loadHFPreset('roberta-base');
          if (!newVocab || newVocab.length === 0) {
            setVocabError("Failed to load RoBERTa vocab.");
            newVocab = undefined;
          }
        } else if (vocabMode === VocabMode.HF_GPT2) {
          newVocab = await loadHFPreset('gpt2');
          if (!newVocab || newVocab.length === 0) {
            setVocabError("Failed to load GPT2 vocab.");
            newVocab = undefined;
          }
        }
      } catch (err) {
        console.error('[App] Failed to load vocab:', err);
        setVocabError(`Error loading vocab: ${err instanceof Error ? err.message : String(err)}`);
        newVocab = undefined;
      }

      setCustomVocab(newVocab);
      console.log('[App] Using vocabulary with', newVocab ? newVocab.length : 0, 'tokens'); 
      setVocabLoading(false);
    };

    loadVocab();
  }, [vocabMode]);

  // Real-time tokenization effect
  useEffect(() => {
    if (!text) return;
    if (showSteps) {
      const { result: res, frames } = tokenizeWithTrace(text, algo, normalize, customVocab);
      setResult(res);
      setFrames(frames);
      setStepIndex(0);
    } else {
      const res = tokenize(text, algo, normalize, customVocab);
      setResult(res);
      setFrames([]);
      setStepIndex(0);
    }
    setInsight(""); // Clear old insights when basic params change
  }, [text, algo, normalize, showSteps, customVocab]);

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying) return;
    if (!showSteps || frames.length === 0) {
      setIsPlaying(false);
      return;
    }
    const id = setInterval(() => {
      setStepIndex(prev => {
        if (prev >= frames.length - 1) {
          clearInterval(id);
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 700);
    return () => clearInterval(id);
  }, [isPlaying, showSteps, frames]);

  const handleGeminiAnalysis = useCallback(async () => {
    if (!result) return;
    setIsAnalyzing(true);
    const analysis = await generateTokenizerInsight(result.graph.text, result.tokens, algo);
    // Strip code fences and ```json markers if present
    const cleaned = analysis
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    setInsight(cleaned);
    setIsAnalyzing(false);
  }, [result, algo]);

  const handleRunValidation = useCallback(() => {
    setIsValidating(true);
    try {
      const { rows } = runValidation(VALIDATION_CASES, algo, normalize, customVocab);
      setValidationRows(rows);
      setShowValidation(true);
    } finally {
      setIsValidating(false);
    }
  }, [algo, normalize, customVocab]);

  const handleLlmTokenAssessment = useCallback(async () => {
    if (!result) return;
    setIsAnalyzing(true);
    try {
      const assessment = await assessTokenizationWithLLM(result.graph.text, result.tokens, algo);
      if (assessment) {
        // Clean any stray code fences from summary/raw before display
        const sanitize = (text: string) =>
          text.replace(/```json/gi, '').replace(/```/g, '').trim();
        setLlmAssessment({
          ...assessment,
          summary: sanitize(assessment.summary),
          raw: sanitize(assessment.raw),
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [result, algo]);

  return (
    <div className="min-h-screen bg-background text-gray-100 font-sans selection:bg-primary/30">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary to-accent rounded-lg shadow-lg shadow-primary/20">
              <Cpu className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                TokenFlow
              </h1>
              <p className="text-xs text-gray-500 font-mono">FST Visualizer</p>
            </div>
          </div>
          <div className="flex gap-4">
             <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Docs</a>
             <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Controls */}
          <div className="lg:col-span-3">
            <Controls
              text={text}
              setText={setText}
              algo={algo}
              setAlgo={setAlgo}
              normalize={normalize}
              setNormalize={setNormalize}
              onAnalyze={handleGeminiAnalysis}
              isAnalyzing={isAnalyzing}
              onRunValidation={handleRunValidation}
              isValidating={isValidating}
              vocabMode={vocabMode}
              setVocabMode={setVocabMode}
              vocabLoading={vocabLoading}
              showSteps={showSteps}
              setShowSteps={setShowSteps}
              stepIndex={stepIndex}
              setStepIndex={setStepIndex}
              maxSteps={frames.length}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
            />
          </div>

          {/* Right Column: Visualization & Stats */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* Vocab Error Alert */}
            {vocabError && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 text-sm">{vocabError}</p>
              </div>
            )}
            
            {/* Main Visualizer */}
            <div className="bg-surface/30 rounded-xl p-1 border border-border">
              <div className="bg-background rounded-lg p-4 border border-border/50">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <LayoutGrid size={18} className="text-primary"/> 
                      Tokenizer Lattice
                    </h2>
                    <span className="text-xs font-mono text-zinc-500 bg-zinc-900 px-2 py-1 rounded">
                      Nodes: {result?.graph.nodes.length} | Edges: {result?.graph.edges.length}
                    </span>
                </div>
                {result && (
                  <FSTGraph
                    data={result.graph}
                    // If stepping, show partialPath from current frame, otherwise full selectedPath
                    selectedPath={frames.length > 0 ? (frames[stepIndex]?.partialPath ?? []) : result.selectedPath}
                    candidateEdges={frames.length > 0 ? (frames[stepIndex]?.candidates ?? []) : []}
                    chosenEdge={frames.length > 0 ? (frames[stepIndex]?.chosen ?? null) : null}
                  />
                )}
              </div>
            </div>

            {/* Bottom Row: Tokens, Inspector & Insights */}
            
            {/* Step Inspector (full-width) */}
            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Step Inspector</h3>
              <StepInspector frame={frames[stepIndex] ?? null} edges={result?.graph.edges ?? []} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    
              {/* Token Output */}
              <div className="bg-surface border border-border rounded-xl p-6">
                 <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Final Tokens</h3>
                 <div className="flex flex-wrap gap-2">
                    {result?.tokens.map((t, i) => (
                      <span key={i} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-cyan-400 font-mono text-sm shadow-sm">
                        {t}
                      </span>
                    ))}
                    {result?.tokens.length === 0 && (
                      <span className="text-zinc-500 italic">No tokens found in vocabulary.</span>
                    )}
                 </div>
              </div>

              {/* AI Insights + LLM-based quality assessment */}
              <div className="bg-surface border border-border rounded-xl p-6 relative overflow-hidden space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={14} className="text-accent" /> AI Analysis
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleGeminiAnalysis}
                      disabled={!result || isAnalyzing}
                      className="text-xs px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Explain Segmentation
                    </button>
                    <button
                      onClick={handleLlmTokenAssessment}
                      disabled={!result || isAnalyzing}
                      className="text-xs px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Score Tokenization
                    </button>
                  </div>
                </div>
                <div className="prose prose-invert prose-sm max-w-none">
                  {isAnalyzing && !insight && !llmAssessment ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-2 bg-zinc-700 rounded w-3/4"></div>
                      <div className="h-2 bg-zinc-700 rounded w-1/2"></div>
                      <div className="h-2 bg-zinc-700 rounded w-5/6"></div>
                    </div>
                  ) : (
                    <>
                      {insight && (
                        <p className="text-gray-300 leading-relaxed mb-2">{insight}</p>
                      )}
                      {llmAssessment && (
                        <div className="mt-2 space-y-2">
                          {llmAssessment.score !== null && (
                            <div className="text-xs text-gray-300">
                              <span className="font-semibold">LLM Semantic Tokenization Score:</span>{" "}
                              {llmAssessment.score}/100
                            </div>
                          )}
                          {llmAssessment.summary && (
                            <p className="text-gray-200 text-sm">{llmAssessment.summary}</p>
                          )}
                          {llmAssessment.issues.length > 0 && (
                            <div className="text-xs text-gray-300">
                              <div className="font-semibold mb-1">Potential Issues:</div>
                              <ul className="list-disc list-inside space-y-0.5">
                                {llmAssessment.issues.map((i, idx) => (
                                  <li key={idx}>{i}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {llmAssessment.suggestions.length > 0 && (
                            <div className="text-xs text-gray-300">
                              <div className="font-semibold mb-1">Suggested Alternatives:</div>
                              <ul className="list-disc list-inside space-y-0.5">
                                {llmAssessment.suggestions.map((s, idx) => (
                                  <li key={idx}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      {!insight && !llmAssessment && (
                        <p className="text-zinc-600 text-sm">
                          Use "Explain Segmentation" or "Score Tokenization" to get LLM-based analysis.
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <BookOpen size={100} />
                </div>
              </div>

            </div>

            {/* Pedagogical Note */}
            <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4">
              <h4 className="text-blue-400 text-sm font-bold mb-1">Algorithm Note: {algo}</h4>
              <p className="text-blue-200/70 text-xs leading-relaxed">
                {algo === AlgorithmType.BPE && "Byte-Pair Encoding (BPE) uses a greedy approach based on frequent merged pairs. In this visualizer, we simulate it using pre-calculated ranks."}
                {algo === AlgorithmType.WORDPIECE && "WordPiece maximizes the likelihood of the training data, effectively behaving like a greedy longest-match strategy for inference, favoring longer known subwords."}
                {algo === AlgorithmType.UNIGRAM && "Unigram uses a probabilistic model. The visualizer shows the Viterbi path (highlighted), which is the sequence of tokens that minimizes the total negative log-probability."}
              </p>
            </div>

          </div>
        </div>
      </main>
      <ValidationModal
        open={showValidation && !!validationRows}
        onClose={() => setShowValidation(false)}
        rows={validationRows ?? []}
      />
    </div>
  );
};

export default App;