import { GoogleGenAI } from "@google/genai";
import { AlgorithmType } from "../types";

// Initialize Gemini Client
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const generateTokenizerInsight = async (
  text: string,
  tokens: string[],
  algorithm: AlgorithmType
): Promise<string> => {
  const ai = getClient();
  if (!ai) return "API Key not configured. Please set process.env.API_KEY.";

  const prompt = `
You are an expert in NLP tokenization algorithms.

The user is visualizing the "${algorithm}" algorithm on the text: "${text}".
The algorithm produced these tokens: [${tokens.join(', ')}].

Briefly explain in 2-3 sentences why this segmentation happened according to ${algorithm}'s rules.
If it's Unigram, mention probability/cost. If BPE/WordPiece, mention greedy matching or subword frequency.
Be concise but insightful.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const textOut = (response as any).candidates?.[0]?.content?.parts?.map((p: any) => p.text).join(' ').trim();
    return textOut || "No insight generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Could not generate insights at this time.";
  }
};

export const generateTokenReference = async (
  text: string,
  algorithm: AlgorithmType
): Promise<string[]> => {
  const ai = getClient();
  if (!ai) return [];

  const prompt = `
You are a tokenizer for ${algorithm}.

Break the following input word or short phrase into subword tokens according to a reasonable modern NLP tokenization scheme.

Input: "${text}"

Respond ONLY with a JSON array of strings, where each string is a token, for example:
["inter", "##national", "##ization"]

Do not add any explanation or extra text, just the JSON array.
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const raw = (response as any).candidates?.[0]?.content?.parts?.map((p: any) => p.text).join(' ').trim() ?? "";
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((t) => String(t));
      }
    } catch {
      // fall through
    }
    // Fallback: split on whitespace/newlines if JSON parse fails.
    return raw
      .replace(/[\[\]]/g, '')
      .split(/[\s,]+/)
      .filter(Boolean);
  } catch (error) {
    console.error("Gemini Token Reference Error:", error);
    return [];
  }
};

export interface LLMTokenAssessment {
  score: number | null; // 0-100 semantic quality score, if provided
  summary: string; // brief plain-English explanation
  issues: string[]; // bullet list of issues / notes
  suggestions: string[]; // suggested alternative tokenizations / boundaries in text form
  raw: string; // raw LLM text (for debugging / display)
}

export const assessTokenizationWithLLM = async (
  text: string,
  tokens: string[],
  algorithm: AlgorithmType
): Promise<LLMTokenAssessment | null> => {
  const ai = getClient();
  if (!ai) return null;

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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    const raw = (response as any).candidates?.[0]?.content?.parts?.map((p: any) => p.text).join(' ').trim() ?? "";

    try {
      const parsed = JSON.parse(raw);
      const assessment: LLMTokenAssessment = {
        score: typeof parsed.score === "number" ? parsed.score : null,
        summary: typeof parsed.summary === "string" ? parsed.summary : "",
        issues: Array.isArray(parsed.issues) ? parsed.issues.map((i: any) => String(i)) : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map((s: any) => String(s)) : [],
        raw,
      };
      return assessment;
    } catch {
      // If JSON parsing fails, still return the raw text as a summary fallback.
      const fallback: LLMTokenAssessment = {
        score: null,
        summary: raw || "No assessment generated.",
        issues: [],
        suggestions: [],
        raw,
      };
      return fallback;
    }
  } catch (error) {
    console.error("Gemini LLM Token Assessment Error:", error);
    return null;
  }
};
