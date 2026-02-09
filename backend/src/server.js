import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import { getGeminiModel } from "./gemini.js";
import { insertRecommendation, getRecentRecommendations } from "./db.js";

dotenv.config();

const app = Fastify({ logger: true });

// Allow frontend calls
await app.register(cors, { origin: true });

// Health check
app.get("/health", async () => ({ ok: true }));

// Debug endpoint to check environment variables (safe)
app.get("/debug-env", async () => {
  const key = process.env.GEMINI_API_KEY || "";
  return {
    hasGeminiKey: Boolean(key),
    keyStartsWith: key.slice(0, 6), // safe preview
    keyLength: key.length,
    model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  };
});

// Optional: check saved history in SQLite
app.get("/history", async (request) => {
  const limit = Number(request.query?.limit ?? 20);
  const safeLimit = Number.isFinite(limit) ? limit : 20;
  return { items: getRecentRecommendations(safeLimit) };
});

// POST /recommendations
app.post("/recommendations", async (request, reply) => {
  const { user_input } = request.body ?? {};

  // Validate input
  if (
    !user_input ||
    typeof user_input !== "string" ||
    user_input.trim().length < 3
  ) {
    return reply
      .code(400)
      .send({ error: "user_input is required (min 3 chars)" });
  }

  const cleanedInput = user_input.trim();

  try {
    const modelClient = getGeminiModel();

    // If Gemini key missing or model not available -> fallback
    if (!modelClient) {
      return sendFallback(reply, cleanedInput, "Gemini key not configured");
    }

    const prompt = `
You are a movie recommendation engine.

User preference: "${cleanedInput}"

Return ONLY valid JSON in exactly this format:
{
  "movies": ["Movie 1", "Movie 2", "Movie 3"]
}

Rules:
- Recommend 3 to 5 movies
- Use real, well-known movie titles
- No markdown, no explanations, no extra text
`.trim();

    // Gemini call
    const result = await modelClient.generateContent(prompt);
    const text = (result?.response?.text() || "").trim();

    const parsed = safeParseJson(text);

    // If Gemini returns unexpected format -> fallback
    if (!parsed || !Array.isArray(parsed.movies) || parsed.movies.length < 3) {
      return sendFallback(reply, cleanedInput, "Gemini returned bad format");
    }

    const movies = parsed.movies
      .slice(0, 5)
      .map((m) => String(m).trim())
      .filter(Boolean);

    const timestamp = new Date().toISOString();

    // Save to SQLite
    insertRecommendation({
      user_input: cleanedInput,
      recommended_movies: movies,
      timestamp,
    });

    return reply.code(200).send({ user_input: cleanedInput, movies });
  } catch (err) {
    request.log.error(err);

    // Any Gemini error -> fallback (keeps app working)
    return sendFallback(reply, cleanedInput, err?.message || "Gemini error");
  }
});

function sendFallback(reply, user_input, reason) {
  const fallbackMovies = [
    "Drishyam (2015)",
    "Kahaani (2012)",
    "Andhadhun (2018)",
    "Badla (2019)",
    "Talvar (2015)",
  ];

  const timestamp = new Date().toISOString();

  insertRecommendation({
    user_input,
    recommended_movies: fallbackMovies,
    timestamp,
  });

  return reply.code(200).send({
    user_input,
    movies: fallbackMovies,
    note: `Fallback used: ${reason}`,
  });
}

function safeParseJson(text) {
  // Try direct JSON parse
  try {
    return JSON.parse(text);
  } catch {}

  // Fallback: extract first JSON object
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

const PORT = Number(process.env.PORT || 3001);

app
  .listen({ port: PORT, host: "0.0.0.0" })
  .then(() => app.log.info(`Backend running at http://localhost:${PORT}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
