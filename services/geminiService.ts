import { AlgorithmType } from "../types";

// Get the API base URL - use relative path for Pages Functions
const getApiUrl = () => {
  // In production, this will be the same origin
  // In development with wrangler, it will be the local dev server
  return '/api/gemini';
};

export const generateTokenizerInsight = async (
  text: string,
  tokens: string[],
  algorithm: AlgorithmType
): Promise<string> => {
  try {
    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'insight',
        text,
        tokens,
        algorithm,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      return error.error || "Could not generate insights at this time.";
    }

    const data = await response.json();
    return data.insight || "No insight generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Could not generate insights at this time.";
  }
};

export const generateTokenReference = async (
  text: string,
  algorithm: AlgorithmType
): Promise<string[]> => {
  try {
    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'reference',
        text,
        algorithm,
      }),
    });

    if (!response.ok) {
      console.error("Gemini Token Reference Error: HTTP", response.status);
      return [];
    }

    const data = await response.json();
    return data.tokens || [];
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
  try {
    const response = await fetch(getApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'assessment',
        text,
        tokens,
        algorithm,
      }),
    });

    if (!response.ok) {
      console.error("Gemini LLM Token Assessment Error: HTTP", response.status);
      return null;
    }

    const data = await response.json();
    const assessment: LLMTokenAssessment = {
      score: typeof data.score === "number" ? data.score : null,
      summary: typeof data.summary === "string" ? data.summary : "",
      issues: Array.isArray(data.issues) ? data.issues.map((i: any) => String(i)) : [],
      suggestions: Array.isArray(data.suggestions) ? data.suggestions.map((s: any) => String(s)) : [],
      raw: typeof data.raw === "string" ? data.raw : "",
    };
    return assessment;
  } catch (error) {
    console.error("Gemini LLM Token Assessment Error:", error);
    return null;
  }
};
