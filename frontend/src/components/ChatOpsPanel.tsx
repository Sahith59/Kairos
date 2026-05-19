"use client";

import { useState, useRef, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

const SUGGESTIONS = [
  "Has PaymentService timed out before?",
  "What's the fix for connection pool exhaustion?",
  "Which service fails most often?",
  "How do we handle NullPointerException in OrderService?",
];

interface QueryResult {
  answer: string;
  sources_found: number;
  has_llm: boolean;
}

export default function ChatOpsPanel() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focused || question) return;
    const t = setInterval(() => {
      setPlaceholderVisible(false);
      setTimeout(() => {
        setSuggestionIdx(i => (i + 1) % SUGGESTIONS.length);
        setPlaceholderVisible(true);
      }, 300);
    }, 3500);
    return () => clearInterval(t);
  }, [focused, question]);

  const ask = async () => {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setResult(data);
      setTimeout(() => answerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
    } catch {
      setResult({ answer: "Backend unreachable. Make sure the Kairos server is running.", sources_found: 0, has_llm: false });
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") ask();
    if (e.key === "Escape") { setQuestion(""); setResult(null); }
  };

  const useSuggestion = (s: string) => {
    setQuestion(s);
    inputRef.current?.focus();
  };

  return (
    <div
      className="glass-panel"
      style={{
        marginBottom: 20,
        /* accent glow on the top edge to make it pop */
        boxShadow: "inset 0 1px 0 rgba(79,142,247,0.35), inset 0 0 0 1px rgba(255,255,255,0.04), 0 2px 4px rgba(0,0,0,0.2), 0 16px 48px rgba(0,0,0,0.45)",
        borderTop: "1px solid rgba(79,142,247,0.4)",
      }}
    >
      {/* ── Panel header ── */}
      <div className="panel-header" style={{ padding: "10px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
        <div className="panel-header-left" style={{ gap: 10 }}>
          {/* Brain / search icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f8ef7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.88A2.5 2.5 0 0 1 9.5 2Z"/>
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.88A2.5 2.5 0 0 0 14.5 2Z"/>
          </svg>
          <span className="panel-title" style={{ fontSize: 13, letterSpacing: "0.01em" }}>
            Incident Intelligence
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, fontFamily: "var(--font-mono)",
            color: "#4f8ef7", background: "rgba(79,142,247,0.12)",
            border: "1px solid rgba(79,142,247,0.25)",
            padding: "2px 7px", borderRadius: 4, letterSpacing: "0.05em",
          }}>
            RAG · mistral:7b
          </span>
        </div>
        <span style={{
          fontSize: 10, color: "var(--text-muted)",
          fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
        }}>
          Ask anything about past incidents
        </span>
      </div>

      {/* ── Panel body ── */}
      <div style={{ padding: "14px 18px" }}>

        {/* Query bar */}
        <div style={{
          display: "flex", alignItems: "center",
          background: focused ? "rgba(79,142,247,0.06)" : "rgba(0,0,0,0.25)",
          border: `1px solid ${focused ? "rgba(79,142,247,0.5)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: 10,
          transition: "all 0.2s ease",
          boxShadow: focused ? "0 0 0 3px rgba(79,142,247,0.1)" : "none",
          overflow: "hidden",
        }}>
          {/* Terminal prompt */}
          <div style={{
            padding: "0 14px",
            display: "flex", alignItems: "center",
            borderRight: `1px solid ${focused ? "rgba(79,142,247,0.2)" : "rgba(255,255,255,0.06)"}`,
            height: 46, flexShrink: 0,
            transition: "border-color 0.2s ease",
          }}>
            <span style={{
              fontSize: 14, fontWeight: 700,
              color: focused ? "#4f8ef7" : "rgba(255,255,255,0.3)",
              fontFamily: "var(--font-mono)",
              transition: "color 0.2s ease",
              userSelect: "none",
            }}>
              &gt;_
            </span>
          </div>

          <input
            ref={inputRef}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKey}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholderVisible ? SUGGESTIONS[suggestionIdx] : ""}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              padding: "0 16px",
              height: 46,
              fontSize: 13,
              color: "var(--text-primary)",
              fontFamily: "var(--font-ui)",
              caretColor: "#4f8ef7",
            }}
          />

          <button
            onClick={ask}
            disabled={loading || !question.trim()}
            style={{
              height: 46,
              padding: "0 20px",
              background: loading
                ? "rgba(79,142,247,0.08)"
                : question.trim()
                ? "rgba(79,142,247,0.15)"
                : "transparent",
              border: "none",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              color: question.trim() ? "#4f8ef7" : "var(--text-muted)",
              fontSize: 11, fontWeight: 700,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: loading || !question.trim() ? "default" : "pointer",
              transition: "all 0.15s ease",
              flexShrink: 0,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {loading ? <LoadingDots /> : <>Ask <span style={{ fontSize: 10, opacity: 0.5, fontWeight: 400 }}>↵</span></>}
          </button>
        </div>

        {/* Suggestion chips */}
        {!question && !result && !loading && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => useSuggestion(s)}
                style={{
                  padding: "4px 10px", borderRadius: 6,
                  fontSize: 11, fontFamily: "var(--font-ui)",
                  color: "var(--text-secondary)",
                  background: "rgba(79,142,247,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  cursor: "pointer",
                  transition: "all 0.12s ease",
                  letterSpacing: "0.01em",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.color = "#4f8ef7";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(79,142,247,0.3)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(79,142,247,0.08)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(79,142,247,0.04)";
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div style={{
            marginTop: 12, padding: "12px 16px",
            background: "rgba(79,142,247,0.04)",
            border: "1px solid rgba(79,142,247,0.15)",
            borderRadius: 8,
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4f8ef7" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <span style={{ fontSize: 11, color: "#4f8ef7", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
              Searching knowledge base
            </span>
            <LoadingDots />
          </div>
        )}

        {/* Answer card */}
        {result && !loading && (
          <div
            ref={answerRef}
            style={{
              marginTop: 12,
              background: "rgba(6,8,22,0.6)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderLeft: "3px solid #4f8ef7",
              borderRadius: "0 8px 8px 0",
              padding: "14px 18px",
              animation: "fadeSlideDown 0.2s ease forwards",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
              <p style={{
                fontSize: 13, lineHeight: 1.7,
                color: "var(--text-primary)",
                fontFamily: "var(--font-ui)",
                flex: 1, margin: 0,
              }}>
                {result.answer}
              </p>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, flexShrink: 0 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.06em",
                  padding: "3px 8px", borderRadius: 4,
                  color: result.sources_found > 0 ? "#4f8ef7" : "var(--text-muted)",
                  background: result.sources_found > 0 ? "rgba(79,142,247,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${result.sources_found > 0 ? "rgba(79,142,247,0.3)" : "rgba(255,255,255,0.06)"}`,
                  whiteSpace: "nowrap",
                }}>
                  {result.sources_found} incident{result.sources_found !== 1 ? "s" : ""} searched
                </span>
                {result.has_llm && (
                  <span style={{
                    fontSize: 9, color: "#34d399",
                    fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
                  }}>
                    ● mistral:7b
                  </span>
                )}
                {!result.has_llm && (
                  <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    fallback mode
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => { setResult(null); setQuestion(""); }}
              style={{
                marginTop: 10, fontSize: 10, color: "var(--text-muted)",
                fontFamily: "var(--font-mono)", background: "none", border: "none",
                cursor: "pointer", padding: 0, letterSpacing: "0.04em",
                transition: "color 0.12s ease",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"}
            >
              esc · clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 3, height: 3, borderRadius: "50%",
          background: "#4f8ef7", display: "inline-block",
          animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </span>
  );
}
