<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# TokenFlow FST Visualizer

A React-based visualizer for Finite State Transducer (FST) tokenization algorithms, deployed as a Cloudflare Pages Functions project.

## Features

- Visualize BPE, WordPiece, and Unigram tokenization algorithms
- Step-by-step FST graph visualization
- AI-powered tokenization insights using Gemini API
- Tokenization quality assessment

## Setup

**Prerequisites:** Node.js and Wrangler CLI

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Wrangler CLI (if not already installed):
   ```bash
   npm install -g wrangler
   ```

3. Set up your Gemini API key:
   - For local development: Set `GEMINI_API_KEY` as an environment variable or in `.dev.vars`
   - For Cloudflare Pages: Add `GEMINI_API_KEY` as a secret in your Pages project settings

## Development

### Local Development (Vite dev server)
```bash
npm run dev
```
This runs the frontend only. Note: Gemini API calls will fail in this mode unless you're using Pages Functions.

### Local Development with Pages Functions
```bash
npm run build
npm run pages:dev
```
This builds the frontend and runs it with Pages Functions locally, allowing you to test the full stack.

## Deployment

### Deploy to Cloudflare Pages

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy using Wrangler:
   ```bash
   npm run pages:deploy
   ```

   Or deploy via the Cloudflare dashboard:
   - Connect your repository to Cloudflare Pages
   - Set build command: `npm run build`
   - Set output directory: `dist`
   - Add `GEMINI_API_KEY` as an environment variable/secret

## Project Structure

- `functions/api/gemini.ts` - Cloudflare Pages Function for Gemini API calls
- `services/geminiService.ts` - Frontend service that calls the Pages Function
- `components/` - React components for the UI
- `utils/` - Tokenization engine and utilities
- `dist/` - Build output directory

## Environment Variables

- `GEMINI_API_KEY` - Your Google Gemini API key (required for AI features)
