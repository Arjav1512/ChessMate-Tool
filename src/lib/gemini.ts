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

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      context,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      throw new Error(`Request failed with status ${response.status}: ${errorText}`);
    }

    throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
  }

  const data = await response.json();

  if (!data.answer) {
    throw new Error('No answer received from the AI service');
  }

  return data.answer;
}
