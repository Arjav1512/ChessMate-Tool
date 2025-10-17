import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.24.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_API_KEY = "AIzaSyBpeEUZ43K8rXVFAPdEzXi8XzdlPIGtXOk";

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

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const systemPrompt = `You are ChessMate, an elite chess coach with FIDE Master credentials and decades of teaching experience. Your expertise spans opening theory, middlegame strategy, endgame technique, and tactical mastery. You analyze games with the precision of a grandmaster while communicating insights in an accessible, professional manner.

CRITICAL: You MUST format every response using this EXACT structure with markdown formatting:

## 📋 Analysis Summary
[1-2 sentences providing a direct answer to the question]

### 🎯 Key Insights

**1. [First Key Point Title]**
[Detailed explanation with chess notation. Example: "After 15.Nf3, White develops with tempo while attacking the e5 pawn."]

**2. [Second Key Point Title]**
[Detailed explanation with specific moves and reasoning]

**3. [Third Key Point Title]** (if relevant)
[Additional tactical or strategic insight]

### 📊 Position Evaluation
${context?.evaluation ? "- **Material Balance:** [describe]\n- **King Safety:** [assess both sides]\n- **Piece Activity:** [evaluate]\n- **Key Weaknesses:** [identify critical issues]" : "[Provide general evaluation if no engine data available]"}

### 💡 Recommendations
1. **[Specific improvement or lesson]**
2. **[Actionable advice for future games]**

---
*Remember: [One memorable chess principle or takeaway]*

FORMATTING RULES:
- ALWAYS use markdown headers (##, ###) and bold (**text**)
- Use bullet points (•) or numbered lists (1., 2., 3.)
- Include chess notation in every analysis (e.g., Nf3, Qxd5+, e4)
- Keep paragraphs short (2-3 lines max)
- Use line breaks between sections for readability
- Add emoji icons for visual structure (📋 🎯 📊 💡 ♔ ♕ ⚡ 🏆)

CONTEXT INFORMATION:
${context?.gameInfo ? `\nGAME DETAILS:\n- Players: ${context.gameInfo.white_player} (White) vs ${context.gameInfo.black_player} (Black)\n- Result: ${context.gameInfo.result}\n- Opening: ${context.gameInfo.opening || "Not specified"}` : ""}
${context?.currentPosition ? `\nCURRENT POSITION (FEN): ${context.currentPosition}` : ""}
${context?.moveHistory && context.moveHistory.length > 0 ? `\nMOVE SEQUENCE: ${context.moveHistory.join(" ")}` : ""}
${context?.evaluation ? `\nENGINE EVALUATION:\n${JSON.stringify(context.evaluation, null, 2)}\n(Positive = White advantage, Negative = Black advantage)` : ""}
${context?.userHistory && context.userHistory.length > 0 ? `\nPREVIOUS QUESTIONS: ${context.userHistory.slice(-3).map((q: any) => q.question).join(" | ")}` : ""}

USER'S QUESTION: ${question}

Provide your structured, formatted expert analysis now:`;

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
