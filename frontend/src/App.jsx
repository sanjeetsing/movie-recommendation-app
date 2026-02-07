import { useMemo, useState } from "react";
import "./App.css";

function DotsLoader() {
  return (
    <span className="dots" aria-label="Loading" role="status">
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
    </span>
  );
}

export default function App() {
  const API_URL = useMemo(
    () => import.meta.env.VITE_API_URL || "http://localhost:3001",
    [],
  );

  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [movies, setMovies] = useState([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setNote("");
    setMovies([]);

    const text = userInput.trim();
    if (text.length < 3) {
      setError("Please enter at least 3 characters.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_input: text }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Request failed");
        return;
      }

      setMovies(Array.isArray(data.movies) ? data.movies : []);
      if (data?.note) setNote(String(data.note));
    } catch {
      setError("Network error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  function fillExample(example) {
    setUserInput(example);
    setError("");
    setNote("");
    setMovies([]);
  }

  return (
    <div className="page">
      {/* Top centered container */}
      <div className="shellTop">
        <header className="header">
          <div className="badge">AI + SQLite</div>
          <h1>Movie Recommendation App</h1>
          <p className="sub">
            Describe your taste (genre, mood, language, actors, similar movies)
            and get <b>3–5</b> suggestions.
          </p>

          <div className="chips">
            <button
              type="button"
              className="chip"
              onClick={() => fillExample("thriller movies like Drishyam")}
            >
              Drishyam-like thrillers
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => fillExample("feel-good family movies")}
            >
              Feel-good family
            </button>
            <button
              type="button"
              className="chip"
              onClick={() =>
                fillExample("mind-bending sci-fi movies like Inception")
              }
            >
              Mind-bending sci-fi
            </button>
          </div>
        </header>

        {/* Preference centered */}
        <section className="card narrow">
          <form onSubmit={onSubmit} className="form">
            <label className="label">Your preference</label>

            <div className="field">
              <textarea
                className="textarea"
                rows={5}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder='Example: "thriller movies like Drishyam"'
              />
            </div>

            <button className="btn" disabled={loading}>
              {loading ? (
                <>
                  <DotsLoader /> Loading
                </>
              ) : (
                "Recommend movies"
              )}
            </button>

            {error ? <div className="alert error">{error}</div> : null}
            {note ? <div className="alert note">{note}</div> : null}
          </form>
        </section>

        {/* Loading overlay (nice, obvious feedback) */}
        {loading && (
          <div className="overlay" aria-hidden="true">
            <div className="overlayCard">
              <div className="overlayTitle">Finding movies</div>
              <div className="overlaySub">
                Please wait <DotsLoader />
              </div>
            </div>
          </div>
        )}

        {/* Recommendations below */}
        <section className="card wide">
          <div className="cardTitleRow">
            <h2>Recommendations</h2>
            <a
              className="link"
              href={`${API_URL}/history`}
              target="_blank"
              rel="noreferrer"
            >
              View history ↗
            </a>
          </div>

          {movies.length === 0 ? (
            <div className="empty">
              <div className="emptyIcon">🎬</div>
              <div>
                <div className="emptyTitle">No results yet</div>
                <div className="emptyText">
                  Enter a preference above and click <b>Recommend movies</b>.
                </div>
              </div>
            </div>
          ) : (
            <ul className="listGrid">
              {movies.map((m, idx) => (
                <li key={idx} className="listCard">
                  <div className="pill">{idx + 1}</div>
                  <div className="movieTitle">{m}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="footer">
          <span>Saved in SQLite (movies.sqlite)</span>
          <span className="sep">•</span>
          <span>Fastify API + React UI</span>
        </footer>
      </div>
    </div>
  );
}
