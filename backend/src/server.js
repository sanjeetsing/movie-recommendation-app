import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import { openai } from "./openai.js";
import { insertRecommendation, getRecentRecommendations } from "./db.js";

dotenv.config();

const app = Fastify({ logger: true });

// Allow frontend calls
await app.register(cors, { origin: true });

// Health check
app.get("/health", async () => ({ ok: true }));

// Debug endpoint to check environment variables (safe)
app.get("/debug-env", async () => {
  const key = process.env.OPENAI_API_KEY || "";
  return {
    hasKey: Boolean(key),
    keyStartsWith: key.slice(0, 3),
    keyLength: key.length,
    model: process.env.OPENAI_MODEL || null,
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
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  try {
    // If OpenAI client is not available (no key), fallback
    if (!openai) {
      return sendFallback(reply, cleanedInput, "OpenAI key not configured");
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

    const response = await openai.responses.create({
      model,
      input: prompt,
    });

    const text = (response.output_text || "").trim();
    const parsed = safeParseJson(text);

    if (!parsed || !Array.isArray(parsed.movies) || parsed.movies.length < 3) {
      return sendFallback(reply, cleanedInput, "OpenAI returned bad format");
    }

    const movies = parsed.movies
      .slice(0, 5)
      .map((m) => String(m).trim())
      .filter(Boolean);

    const timestamp = new Date().toISOString();

    insertRecommendation({
      user_input: cleanedInput,
      recommended_movies: movies,
      timestamp,
    });

    return reply.code(200).send({ user_input: cleanedInput, movies });
  } catch (err) {
    request.log.error(err);

    const status = err?.status;
    const code = err?.code;

    if (status === 401 || code === "invalid_api_key") {
      return sendFallback(reply, cleanedInput, "OpenAI key invalid (401)");
    }

    if (status === 429 || code === "insufficient_quota") {
      return sendFallback(reply, cleanedInput, "OpenAI quota exceeded (429)");
    }

    return reply.code(500).send({
      error: "Server error",
      message: err?.message || "Unknown error",
    });
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
  try {
    return JSON.parse(text);
  } catch {}

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
