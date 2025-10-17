import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.24.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { question, context } = await req.json();

    if (!question) {
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

    return new Response(
      JSON.stringify({ answer }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Failed to generate response",
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
