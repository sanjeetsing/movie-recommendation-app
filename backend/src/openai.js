import OpenAI from "openai";

// Create client only if key exists (so Render won't crash)
const apiKey = process.env.OPENAI_API_KEY;

export const openai = apiKey ? new OpenAI({ apiKey }) : null;
