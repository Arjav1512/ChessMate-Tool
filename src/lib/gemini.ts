const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
  try {
    const apiUrl = `${SUPABASE_URL}/functions/v1/chess-mentor`;

    console.log('Calling Edge Function:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        context,
      }),
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);

      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        throw new Error(`Request failed with status ${response.status}: ${errorText}`);
      }

      throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log('Response data:', data);

    if (!data.answer) {
      throw new Error('No answer received from the AI service');
    }

    return data.answer;
  } catch (error) {
    console.error('Chess Mentor API error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Error',
      stack: error instanceof Error ? error.stack : undefined
    });

    throw error;
  }
}
