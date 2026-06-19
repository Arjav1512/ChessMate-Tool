import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.24.1";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------------
// CORS — restrict to configured origins instead of wildcard "*"
// Set ALLOWED_ORIGINS env var to a comma-separated list, e.g.
//   https://chessmate.app,https://www.chessmate.app
// If the env var is absent we fall back to echoing the request origin
// (which is acceptable for local dev but should be set in production).
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** True for localhost / loopback origins used during local development. */
function isLocalhostOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]";
  } catch {
    return false;
  }
}

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin = requestOrigin ?? "";
  let allowed: string;

  if (ALLOWED_ORIGINS.length === 0) {
    // No allowlist configured. Fail CLOSED for deployed environments: permit
    // only localhost (dev) and deny anything else, rather than echoing an
    // attacker-controlled origin. Production MUST set ALLOWED_ORIGINS.
    // "null" is a value no real browser origin matches, so the response is
    // rejected as a CORS failure.
    allowed = isLocalhostOrigin(origin) ? origin : "null";
  } else if (ALLOWED_ORIGINS.includes(origin)) {
    allowed = origin;
  } else {
    // Origin not in allowlist — return the first configured origin.
    // The browser will reject the response as a CORS failure.
    allowed = ALLOWED_ORIGINS[0];
  }

  return {
    "Access-Control-Allow-Origin": allowed,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  };
}

// ---------------------------------------------------------------------------
// Authentication — the caller's JWT is VERIFIED against the Supabase auth
// server (signature + expiry) via auth.getUser(token), and the authenticated
// user id is used as the rate-limit key. We do NOT trust an unverified
// base64 decode of the token: a forged `sub` could otherwise bypass per-user
// rate limiting and run up Gemini cost. Defense-in-depth: supabase/config.toml
// also pins `verify_jwt = true` so the platform rejects bad tokens before this
// function even runs.
// ---------------------------------------------------------------------------

/**
 * Verify the bearer token and return the authenticated user id, or null if the
 * token is missing, expired, forged, or otherwise invalid.
 */
async function getVerifiedUserId(token: string): Promise<string | null> {
  if (!token) return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id;
  } catch (err) {
    console.error("JWT verification failed:", err);
    return null;
  }
}

/**
 * Count how many times `userId` hit this endpoint in the last `windowMs` ms.
 * Returns true if the request is allowed, false if the limit is exceeded.
 * Fails open (returns true) when the DB query errors so a DB outage doesn't
 * lock out all users.
 */
async function checkRateLimit(
  userId: string,
  max = 10,
  windowMs = 60_000,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMs).toISOString();
  const { count, error } = await supabase
    .from("api_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", windowStart);

  if (error) {
    console.error("Rate-limit DB query failed (failing open):", error.message);
    return true; // fail open
  }

  return (count ?? 0) < max;
}

async function logRequest(
  userId: string | null,
  question: string,
  success: boolean,
  error?: string,
) {
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
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Extract user ID from the JWT for DB-backed rate limiting
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;
    const userId = await getVerifiedUserId(token);

    // Reject unauthenticated callers. A verified user id is required so that
    // per-user rate limiting cannot be bypassed with the public anon key or a
    // forged token, which would let a caller run up Gemini cost.
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Authentication required." }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const allowed = await checkRateLimit(userId, 10, 60_000);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        },
      );
    }

    const { question, context } = await req.json();

    if (!question) {
      await logRequest(userId, "", false, "Question missing");
      return new Response(
        JSON.stringify({ error: "Question is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const contextInfo = [];
    if (context?.gameInfo) {
      contextInfo.push(
        `Game: ${context.gameInfo.white_player} vs ${context.gameInfo.black_player}, Result: ${context.gameInfo.result}`,
      );
    }
    if (context?.currentPosition) {
      contextInfo.push(`Position: ${context.currentPosition}`);
    }
    if (context?.evaluation) {
      contextInfo.push(
        `Evaluation: ${context.evaluation.evaluation} (${context.evaluation.isMate ? "Mate" : "centipawns"})`,
      );
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

${contextInfo.length > 0 ? `\nContext: ${contextInfo.join(" | ")}` : ""}

Question: ${question}`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const answer = response.text();

    await logRequest(userId, question, true);

    console.log({
      timestamp: new Date().toISOString(),
      user: userId,
      action: "chess_mentor_query",
      question_length: question.length,
      response_length: answer.length,
    });

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error occurred";
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error("Error:", error);

    await logRequest(null, "", false, errorMessage);

    console.error({
      timestamp: new Date().toISOString(),
      error: errorMessage,
      stack: errorStack,
    });

    return new Response(
      JSON.stringify({ error: errorMessage || "Failed to generate response" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
