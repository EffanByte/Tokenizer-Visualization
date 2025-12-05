/**
 * Script to download BERT vocab from HuggingFace and convert to JSON format.
 * Run with: node scripts/download_vocab.js
 * 
 * This fetches bert-base-uncased vocab and keeps top N tokens by frequency.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const VOCAB_URL = 'https://huggingface.co/bert-base-uncased/raw/main/vocab.txt';
const OUTPUT_FILE = path.join(__dirname, '../public/vocab.json');
const MAX_TOKENS = 5000; // Keep top N tokens for performance

function downloadVocab() {
  console.log('Downloading BERT vocab from HuggingFace...');
  
  https.get(VOCAB_URL, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.error(`Error: HTTP ${res.statusCode}`);
        process.exit(1);
      }
      
      // Parse vocab (one token per line)
      const tokens = data.split('\n').filter(line => line.trim());
      console.log(`Downloaded ${tokens.length} tokens`);
      
      // Keep top MAX_TOKENS by frequency (index = inverse frequency)
      const filtered = tokens.slice(0, MAX_TOKENS).map((token, idx) => ({
        token: token.trim(),
        // Higher index = lower frequency, use inverse for score (higher = better)
        score: MAX_TOKENS - idx
      }));
      
      console.log(`Filtered to top ${filtered.length} tokens`);
      
      // Write to JSON
      const output = { vocab: filtered };
      fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
      
      console.log(`✓ Vocab written to ${OUTPUT_FILE}`);
    });
  }).on('error', (err) => {
    console.error('Download error:', err);
    process.exit(1);
  });
}

downloadVocab();
