import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.24.1";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getRateLimitKey(req: Request): string {
  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    return authHeader.split(" ")[1] || "anonymous";
  }
  return "anonymous";
}

function checkRateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const userLimit = rateLimitStore.get(key);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    return false;
  }

  userLimit.count++;
  return true;
}

async function logRequest(userId: string | null, question: string, success: boolean, error?: string) {
  try {
    await supabase.from("api_logs").insert({
      user_id: userId,
      endpoint: "chess-mentor",
      question: question.substring(0, 500),
      success,
      error_message: error,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to log request:", err);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const rateLimitKey = getRateLimitKey(req);

    if (!checkRateLimit(rateLimitKey, 10, 60000)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        }
      );
    }

    const { question, context } = await req.json();

    if (!question) {
      await logRequest(null, "", false, "Question missing");
      return new Response(
        JSON.stringify({ error: "Question is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const contextInfo = [];
    if (context?.gameInfo) {
      contextInfo.push(`Game: ${context.gameInfo.white_player} vs ${context.gameInfo.black_player}, Result: ${context.gameInfo.result}`);
    }
    if (context?.currentPosition) {
      contextInfo.push(`Position: ${context.currentPosition}`);
    }
    if (context?.evaluation) {
      contextInfo.push(`Evaluation: ${context.evaluation.evaluation} (${context.evaluation.isMate ? 'Mate' : 'centipawns'})`);
    }

    const systemPrompt = `You are ChessMate, an expert chess coach. Analyze the following question with clear, actionable insights.

Format your response with markdown:
## 📋 Summary
[Direct answer in 1-2 sentences]

### 🎯 Key Points
1. **[Title]** - [Explanation with chess notation]
2. **[Title]** - [Tactical/strategic insight]

### 💡 Recommendations
- [Specific actionable advice]

${contextInfo.length > 0 ? `\nContext: ${contextInfo.join(' | ')}` : ''}

Question: ${question}`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const answer = response.text();

    await logRequest(rateLimitKey !== "anonymous" ? rateLimitKey : null, question, true);

    console.log({
      timestamp: new Date().toISOString(),
      user: rateLimitKey,
      action: "chess_mentor_query",
      question_length: question.length,
      response_length: answer.length,
    });

    return new Response(
      JSON.stringify({ answer }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error("Error:", error);

    await logRequest(null, "", false, errorMessage);

    console.error({
      timestamp: new Date().toISOString(),
      error: errorMessage,
      stack: errorStack,
    });

    return new Response(
      JSON.stringify({
        error: errorMessage || "Failed to generate response",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
