import Database from "better-sqlite3";

const db = new Database("movies.sqlite");

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_input TEXT NOT NULL,
    recommended_movies TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );
`);

export function insertRecommendation({
  user_input,
  recommended_movies,
  timestamp,
}) {
  const stmt = db.prepare(`
    INSERT INTO recommendations (user_input, recommended_movies, timestamp)
    VALUES (?, ?, ?)
  `);

  const info = stmt.run(
    user_input,
    JSON.stringify(recommended_movies),
    timestamp,
  );
  return info.lastInsertRowid;
}

export function getRecentRecommendations(limit = 20) {
  const stmt = db.prepare(`
    SELECT id, user_input, recommended_movies, timestamp
    FROM recommendations
    ORDER BY id DESC
    LIMIT ?
  `);

  const rows = stmt.all(limit);
  return rows.map((r) => ({
    ...r,
    recommended_movies: safeJsonParse(r.recommended_movies, []),
  }));
}

function safeJsonParse(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
