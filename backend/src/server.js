import Fastify from "fastify";
import cors from "@fastify/cors";
import dotenv from "dotenv";
import { getGeminiModel } from "./gemini.js";
import { insertRecommendation, getRecentRecommendations } from "./db.js";

dotenv.config();

const app = Fastify({ logger: true });

/* =========================
   CORS (secure)
   ========================= */
const allowedOrigins = [
  "http://localhost:5173",
  "https://movie-recommendation-app-flax-six.vercel.app",
];

await app.register(cors, {
  origin: (origin, cb) => {
    // allow Postman/curl (no origin header)
    if (!origin) return cb(null, true);

    if (allowedOrigins.includes(origin)) return cb(null, true);

    // block others
    cb(new Error("Not allowed by CORS"), false);
  },
});

/* =========================
   Basic routes
   ========================= */
app.get("/", async () => ({
  ok: true,
  message: "Movie Recommendation API is running",
  endpoints: ["/health", "/recommendations", "/history"],
}));

app.get("/health", async () => ({ ok: true }));

/* =========================
   Debug env (DEV only)
   ========================= */
if (process.env.NODE_ENV !== "production") {
  app.get("/debug-env", async () => {
    const key = process.env.GEMINI_API_KEY || "";
    return {
      hasGeminiKey: Boolean(key),
      keyStartsWith: key.slice(0, 6),
      keyLength: key.length,
      model: process.env.GEMINI_MODEL || "models/gemini-2.5-flash",
      nodeEnv: process.env.NODE_ENV || "not_set",
    };
  });
}

/* =========================
   History
   ========================= */
app.get("/history", async (request) => {
  const limit = Number(request.query?.limit ?? 20);
  const safeLimit = Number.isFinite(limit) ? limit : 20;
  return { items: getRecentRecommendations(safeLimit) };
});

/* =========================
   Recommendations
   ========================= */
app.post("/recommendations", async (request, reply) => {
  const { user_input } = request.body ?? {};

  // validate
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

    // If Gemini not configured -> fallback
    if (!modelClient) {
      return sendFallback(reply, cleanedInput, "Gemini key not configured");
    }

    // Strict JSON prompt
    const prompt = `
You are a movie recommendation engine.

User preference: "${cleanedInput}"

Return ONLY valid JSON and NOTHING ELSE in exactly this structure:
{"movies":["Movie 1","Movie 2","Movie 3"]}

Rules:
- Recommend 3 to 5 movies
- Use real, well-known movie titles
- No markdown, no explanations, no extra text
`.trim();

    // Gemini call with timeout (prevents long hanging)
    const text = await generateWithTimeout(modelClient, prompt, 12000); // 12 seconds
    const parsed = safeParseJson(text);

    // bad format -> fallback
    if (!parsed || !Array.isArray(parsed.movies) || parsed.movies.length < 3) {
      return sendFallback(reply, cleanedInput, "Gemini returned bad format");
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
    return sendFallback(reply, cleanedInput, err?.message || "Gemini error");
  }
});

/* =========================
   Helpers
   ========================= */

async function generateWithTimeout(modelClient, prompt, ms = 12000) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Gemini request timeout")), ms),
  );

  const run = (async () => {
    const result = await modelClient.generateContent(prompt);
    return (result?.response?.text() || "").trim();
  })();

  return Promise.race([run, timeout]);
}

function sendFallback(reply, user_input, reason) {
  const fallbackMovies = [
    "Drishyam (2015)",
    "Kahaani (2012)",
    "Andhadhun (2018)",
    "Badla (2019)",
    "Talvar (2015)",
  ];

  const timestamp = new Date().toISOString();

  // save fallback result too (DB requirement satisfied)
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
  // direct parse
  try {
    return JSON.parse(text);
  } catch {}

  // extract first JSON object
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/* =========================
   Start server
   ========================= */
const PORT = Number(process.env.PORT || 3001);

app
  .listen({ port: PORT, host: "0.0.0.0" })
  .then(() => app.log.info(`Backend running at http://localhost:${PORT}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
