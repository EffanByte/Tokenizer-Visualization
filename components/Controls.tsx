import React from 'react';
import { AlgorithmType, VocabMode } from '../types';
import { Settings, RefreshCw, Type, Sparkles, BookMarked, BarChart2 } from 'lucide-react';

interface Props {
  text: string;
  setText: (s: string) => void;
  algo: AlgorithmType;
  setAlgo: (a: AlgorithmType) => void;
  normalize: boolean;
  setNormalize: (b: boolean) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  onRunValidation: () => void;
  isValidating: boolean;
  // Vocab selection
  vocabMode?: VocabMode;
  setVocabMode?: (m: VocabMode) => void;
  vocabLoading?: boolean;
  // Step playback controls (optional)
  showSteps?: boolean;
  setShowSteps?: (b: boolean) => void;
  stepIndex?: number;
  setStepIndex?: (n: number) => void;
  maxSteps?: number;
  isPlaying?: boolean;
  setIsPlaying?: (b: boolean) => void;
}

const Controls: React.FC<Props> = ({ 
  text,
  setText,
  algo,
  setAlgo,
  normalize,
  setNormalize,
  onAnalyze,
  isAnalyzing,
  onRunValidation,
  isValidating,
  vocabMode = VocabMode.HF_ROBERTA,
  setVocabMode,
  vocabLoading = false,
  showSteps = false,
  setShowSteps,
  stepIndex = 0,
  setStepIndex,
  maxSteps = 0,
  isPlaying = false,
  setIsPlaying,
}) => {
  return (
    <div className="bg-surface border border-border rounded-xl p-6 space-y-6 h-fit sticky top-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
          <Type size={16} /> Input Text
        </label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:outline-none transition-all"
          placeholder="Type a word (e.g., internationalization)"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
          <BookMarked size={16} /> Vocabulary
        </label>
        <div className="grid grid-cols-1 gap-2">
          {Object.values(VocabMode).map((m) => (
            <button
              key={m}
              onClick={() => setVocabMode && setVocabMode(m)}
              disabled={vocabLoading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                vocabMode === m 
                  ? 'bg-primary/20 text-primary border border-primary/50' 
                  : 'bg-background hover:bg-zinc-800 text-gray-400 border border-border'
              } disabled:opacity-50`}
            >
              {m}
            </button>
          ))}
        </div>
        {vocabLoading && <div className="text-xs text-zinc-500 animate-pulse">Loading vocab...</div>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
          <Settings size={16} /> Algorithm
        </label>
        <div className="grid grid-cols-1 gap-2">
          {Object.values(AlgorithmType).map((t) => (
            <button
              key={t}
              onClick={() => setAlgo(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                algo === t 
                  ? 'bg-primary/20 text-primary border border-primary/50' 
                  : 'bg-background hover:bg-zinc-800 text-gray-400 border border-border'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
        <span className="text-sm text-gray-400 font-medium">Normalize</span>
        <button
          onClick={() => setNormalize(!normalize)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            normalize ? 'bg-primary' : 'bg-zinc-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              normalize ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <div className="space-y-2">
        <button
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="w-full bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            <RefreshCw className="animate-spin" size={20} />
          ) : (
            <Sparkles size={20} />
          )}
          Analyze with Gemini
        </button>
        <button
          onClick={onRunValidation}
          disabled={isValidating}
          className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isValidating ? (
            <RefreshCw className="animate-spin" size={18} />
          ) : (
            <BarChart2 size={18} />
          )}
          Run Validation
        </button>
      </div>

      {/* Step controls */}
      <div className="mt-4">
        <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
          <span className="text-sm text-gray-400 font-medium">Show Steps</span>
          <button
            onClick={() => setShowSteps && setShowSteps(!showSteps)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              showSteps ? 'bg-primary' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                showSteps ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {showSteps && (
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setStepIndex && setStepIndex(Math.max(0, (stepIndex || 0) - 1))}
              className="px-3 py-2 bg-background border border-border rounded-md"
            >Prev</button>
            <button
              onClick={() => setIsPlaying && setIsPlaying(!isPlaying)}
              className="px-3 py-2 bg-background border border-border rounded-md"
            >{isPlaying ? 'Pause' : 'Play'}</button>
            <button
              onClick={() => setStepIndex && setStepIndex(Math.min((maxSteps || 1) - 1, (stepIndex || 0) + 1))}
              className="px-3 py-2 bg-background border border-border rounded-md"
            >Next</button>
            <div className="text-xs text-zinc-400 ml-2">Step {stepIndex + 1} / {maxSteps}</div>
          </div>
        )}
      </div>

      <div className="text-xs text-zinc-500 pt-4 border-t border-border space-y-1">
        <p>Hugging Face vocabulary active (RoBERTa / GPT-2).</p>
        <p>Try: "running", "unhappiness", "internationalization"</p>
        <p>Use "Run Validation" to see metric summaries.</p>
      </div>
    </div>
  );
};

export default Controls;
