import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface GameInfo {
  white_player?: string;
  black_player?: string;
  result?: string;
  event?: string;
  date?: string;
}

interface EvaluationInfo {
  evaluation: string;
  isMate: boolean;
  bestMove?: string;
}

interface QuestionContext {
  question: string;
  answer: string;
  created_at?: string;
}

export async function askChessMentor(
  question: string,
  context: {
    gameInfo?: GameInfo;
    currentPosition?: string;
    moveHistory?: string[];
    evaluation?: EvaluationInfo;
    userHistory?: QuestionContext[];
  }
): Promise<string> {
  const apiUrl = `${SUPABASE_URL}/functions/v1/chess-mentor`;

  // The Edge Function requires a user JWT — it identifies the caller for
  // DB-backed rate limiting and rejects requests without a `sub` claim.
  // If the session expired mid-flow, surface a clear error rather than
  // silently spamming Gemini with the public anon key.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Your session has expired. Please sign in again.');
  }
  const token = session.access_token;

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, context }),
    });
  } catch {
    throw new Error(
      'AI coach is unreachable. Make sure the chess-mentor edge function is deployed ' +
      'and GEMINI_API_KEY is set in your Supabase project secrets.',
    );
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');

    let errorData: { error?: string; message?: string } = {};
    try { errorData = JSON.parse(errorText); } catch { /* use raw text */ }

    const detail = errorData.error || errorData.message || errorText || `HTTP ${response.status}`;

    if (response.status === 429) {
      throw new Error('Rate limit reached (10 requests/min). Try again in a moment.');
    }
    if (response.status === 500 && detail.includes('GEMINI_API_KEY')) {
      throw new Error('AI coach is not configured — GEMINI_API_KEY missing in edge function secrets.');
    }
    throw new Error(detail);
  }

  const data = await response.json();

  if (!data.answer) {
    throw new Error('No answer received from the AI service');
  }

  return data.answer;
}
