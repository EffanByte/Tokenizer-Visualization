import { GoogleGenAI } from "@google/genai";

export interface Env {
  GEMINI_API_KEY: string;
}

// Pages Function type
export interface PagesFunction<Env = any> {
  (context: EventContext<Env, any, any>): Response | Promise<Response>;
}

interface EventContext<Env, P extends string, Data> {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<any>) => void;
  passThroughOnException: () => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: Env;
  params: Record<P, string>;
  data: Data;
}

// Initialize Gemini Client
const getClient = (env: Env) => {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  // Handle CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { action, ...params } = body;

    const ai = getClient(env);
    if (!ai) {
      return new Response(JSON.stringify({ error: 'API Key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result: any;

    switch (action) {
      case 'insight': {
        const { text, tokens, algorithm } = params;
        const prompt = `
You are an expert in NLP tokenization algorithms.

The user is visualizing the "${algorithm}" algorithm on the text: "${text}".
The algorithm produced these tokens: [${tokens.join(', ')}].

Briefly explain in 2-3 sentences why this segmentation happened according to ${algorithm}'s rules.
If it's Unigram, mention probability/cost. If BPE/WordPiece, mention greedy matching or subword frequency.
Be concise but insightful.
`;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-lite',
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        const textOut = (response as any).candidates?.[0]?.content?.parts?.map((p: any) => p.text).join(' ').trim();
        result = { insight: textOut || "No insight generated." };
        break;
      }

      case 'reference': {
        const { text, algorithm } = params;
        const prompt = `
You are a tokenizer for ${algorithm}.

Break the following input word or short phrase into subword tokens according to a reasonable modern NLP tokenization scheme.

Input: "${text}"

Respond ONLY with a JSON array of strings, where each string is a token, for example:
["inter", "##national", "##ization"]

Do not add any explanation or extra text, just the JSON array.
`;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-lite',
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        const raw = (response as any).candidates?.[0]?.content?.parts?.map((p: any) => p.text).join(' ').trim() ?? "";
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            result = { tokens: parsed.map((t) => String(t)) };
          } else {
            result = { tokens: [] };
          }
        } catch {
          // Fallback: split on whitespace/newlines if JSON parse fails.
          result = {
            tokens: raw
              .replace(/[\[\]]/g, '')
              .split(/[\s,]+/)
              .filter(Boolean),
          };
        }
        break;
      }

      case 'assessment': {
        const { text, tokens, algorithm } = params;
        const prompt = `
You are evaluating the quality of a tokenizer output.

Input text: "${text}"
Algorithm: ${algorithm}
Tokenizer output tokens: [${tokens.join(", ")}]

Your task:
1. Judge whether the token boundaries are semantically and morphologically sensible.
2. Identify any confusing or suboptimal token splits.
3. Suggest clearer or more linguistically appropriate token boundaries if helpful.

Important:
- Tokenization correctness has no single ground truth.
- Provide a *probabilistic* judgment, not a binary right/wrong decision.

Respond ONLY as a compact JSON object with the following shape:
{
  "score": <number from 0 to 100, where higher = better tokenization>,
  "summary": "<1-2 sentence natural language summary>",
  "issues": ["<bullet 1>", "<bullet 2>", "..."],
  "suggestions": ["<alternative segmentation or boundary suggestion 1>", "..."]
}

Do not include any extra keys or text outside the JSON object.
`;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-lite',
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        const raw = (response as any).candidates?.[0]?.content?.parts?.map((p: any) => p.text).join(' ').trim() ?? "";

        try {
          const parsed = JSON.parse(raw);
          result = {
            score: typeof parsed.score === "number" ? parsed.score : null,
            summary: typeof parsed.summary === "string" ? parsed.summary : "",
            issues: Array.isArray(parsed.issues) ? parsed.issues.map((i: any) => String(i)) : [],
            suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map((s: any) => String(s)) : [],
            raw,
          };
        } catch {
          // If JSON parsing fails, still return the raw text as a summary fallback.
          result = {
            score: null,
            summary: raw || "No assessment generated.",
            issues: [],
            suggestions: [],
            raw,
          };
        }
        break;
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Gemini API Error:", error);
    return new Response(JSON.stringify({ error: 'Internal server error', message: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

