# Copilot Instructions for TokenFlow (FST Visualizer)

This project is a React + Vite TypeScript app that visualizes tokenization lattices
for three simplified tokenizer algorithms (BPE, WordPiece, Unigram). It supports both
mock vocabulary and real tokenizer vocabs from Hugging Face models.

1) How to run
- Install: `npm install`
- Run dev server: `npm run dev` (Vite, default port 3000)
- Build: `npm run build` / Preview: `npm run preview`
- The project expects a Gemini API key. Set `GEMINI_API_KEY` in `.env.local` or
  export an environment variable. Vite maps this to `process.env.API_KEY` in
  `vite.config.ts` (see `define` section).

2) High-level architecture
- UI: `App.tsx` composes the app. `components/Controls.tsx` manages inputs, vocab mode,
  algorithm selection, and step playback. `components/FSTGraph.tsx` renders the lattice SVG
  and highlights candidates/chosen/selected paths. `components/StepInspector.tsx` shows
  frame details (candidates, chosen edge, partial path, Viterbi snapshots).
- Tokenization logic: `utils/tokenizerEngine.ts` — three key phases:
  - normalization (`normalizeText`)
  - lattice building (`buildLattice`) — finds all possible token edges
  - decoding (`greedyDecode` for BPE/WordPiece, `viterbiDecode` for Unigram)
  - tracing (`tokenizeWithTrace`) — emits StepFrame list for UI playback
- Vocabulary modes: 
  - `MOCK` — default curated vocab in `constants.ts`
  - `HF_BERT`, `HF_ROBERTA`, `HF_GPT2` — loaded from Hugging Face via jsdelivr CDN
- Data shapes: see `types.ts` — important fields:
  - `FSTGraphData` (nodes: number[], edges: TokenEdge[], text: string)
  - `TokenEdge.id` format: `edge-{from}-{to}-{token}` — maps to UI highlights
  - `StepFrame` (id, description, candidates, chosen, partialPath, viterbiSnapshot)
- External ML APIs:
  - `services/geminiService.ts` — calls Gemini for algorithm breakdown explanations
  - `services/vocabService.ts` — loads HF tokenizer vocabs from jsdelivr CDN

3) Project-specific patterns and gotchas
- Tokenization is simplified for visualization; BPE/WordPiece use greedy longest-match,
  not production-faithful algorithms. See `tokenizerEngine.ts` comments.
- Custom vocab (`customVocab?: VocabItem[]`) is optional; when undefined, uses `MOCK_VOCAB`.
  `buildLattice` derives scoring (Unigram probs, BPE ranks) dynamically if custom vocab provided.
- UI expects `graph.nodes` = indices 0..n and `graph.text` = normalized string; keep consistent.
- HF vocab loading uses jsdelivr CDN (https://cdn.jsdelivr.net/gh/huggingface/...) for
  CORS reliability. Returns empty array on failure; app silently falls back to Mock vocab.
- Scoring interpretation:
  - Unigram: edge.score = -log(prob), minimized by Viterbi
  - BPE: edge.score = rank id (lower = better), greedy picks longest match
  - WordPiece: edge.score = length (visualization heuristic), greedy longest-match

4) Recommended edit surfaces (common tasks)
- Change mock vocab: edit `constants.ts` (update `MOCK_VOCAB`, re-derive `UNIGRAM_PROBS`/`BPE_RANKS`)
- Change decoding: edit `utils/tokenizerEngine.ts` (`viterbiDecode`/`greedyDecode`/`buildLattice`)
- Add visualization features: edit `components/FSTGraph.tsx` (arcs, nodes, labels)
- Improve Gemini prompt: edit `services/geminiService.ts` (prompt text for algorithm breakdown)
- Add vocab modes: edit `types.ts` (add VocabMode enum), `services/vocabService.ts` (add loader)

5) Conventions & style
- Functional React components, default exports for components
- TypeScript with explicit interfaces in `types.ts`
- Tailwind utility classes (no CSS files); minimal markup

6) Debugging tips
- Missing HF vocab: check browser console for CDN fetch errors; app falls back to Mock
- Character-level output: indicates vocab loading failed (either HF fetch or empty result)
- Token mismatch: inspect `result.graph` and `result.tokens` in console
- Step frames empty: ensure `showSteps` is true and frames are generated before step playback
- Viterbi snapshot empty: only Unigram algo emits snapshots; BPE/WordPiece use greedy (no DP)

7) Files to open first
- `utils/tokenizerEngine.ts` — core algorithm, lattice building, decoding
- `constants.ts` — mock vocab setup
- `services/vocabService.ts` — HF vocab loading
- `App.tsx` — vocab mode state, vocab effect, tokenization call
- `components/StepInspector.tsx` — frame rendering logic
examples of expected `edges` arrays or a suggested test harness), tell me which
part to expand and I'll update the file.
