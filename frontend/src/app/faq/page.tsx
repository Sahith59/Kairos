"use client";

import { useState } from "react";

interface FAQItem {
  num: string;
  q: string;
  a: React.ReactNode;
}

const ITEMS: FAQItem[] = [
  {
    num: "01",
    q: "Is my API key safe?",
    a: (
      <>
        <p>Yes. Your API key is stored exclusively in <strong>server process RAM</strong> — it is never written to disk, logged to any file, inserted into a database, or transmitted to any third party beyond the LLM provider you selected.</p>
        <p>When the server restarts, all in-memory configuration is cleared and you will be prompted to re-enter your key. The source code is open and auditable — you can verify this yourself in <code>backend/agent.py</code> and <code>backend/main.py</code>.</p>
      </>
    ),
  },
  {
    num: "02",
    q: "How do I connect my real production logs?",
    a: (
      <>
        <p>Use the <strong>Integration Hub</strong> (click "Integrate" in the nav) to get ready-to-paste snippets for your stack. Kairos accepts logs via:</p>
        <ul>
          <li><strong>HTTP API</strong> — POST <code>/ingest</code> with JSON payload from any service</li>
          <li><strong>Python logging handler</strong> — drop-in replacement for your existing handler</li>
          <li><strong>Logstash</strong> — HTTP output plugin pointing to Kairos</li>
          <li><strong>Fluent Bit</strong> — HTTP output pointing to <code>/ingest</code></li>
        </ul>
        <p>Each source produces the same result: a real-time RCA on the Cockpit dashboard within seconds of ingestion.</p>
      </>
    ),
  },
  {
    num: "03",
    q: "Which LLM should I use?",
    a: (
      <>
        <p>Choose based on your priorities:</p>
        <ul>
          <li><strong>Ollama (local)</strong> — completely private, free, no API key. Response time ~20-40s depending on your hardware. Best for sensitive environments.</li>
          <li><strong>Groq</strong> — free tier with generous limits, ~1-2s responses using open-weight models. Best balance of speed and cost for most teams.</li>
          <li><strong>OpenAI GPT-4o</strong> — highest accuracy on complex multi-service incidents. Best overall quality if cost is not a concern.</li>
          <li><strong>Anthropic Claude</strong> — best multi-step reasoning and instruction-following. Excellent for nuanced RCAs with long log contexts.</li>
        </ul>
      </>
    ),
  },
  {
    num: "04",
    q: "Can multiple users use this at the same time?",
    a: (
      <>
        <p>Kairos is a <strong>single-tenant tool</strong> — it is designed for a team or an owner running their own deployment. There is one active LLM configuration at a time, shared across all users connected to that instance.</p>
        <p>Concurrent log ingestion is supported; the backend queues analysis jobs. However, simultaneous LLM config changes from different users will overwrite each other. The recommended pattern is one Kairos instance per team, with one person managing the LLM settings.</p>
      </>
    ),
  },
  {
    num: "05",
    q: "What happens if the server restarts?",
    a: (
      <>
        <p>On restart, all in-memory state is cleared:</p>
        <ul>
          <li><strong>LLM configuration</strong> — cleared. Re-enter your provider and API key via Settings.</li>
          <li><strong>Active incident state</strong> — cleared. Any in-progress RCA is lost.</li>
          <li><strong>Redis cache</strong> — persists across restarts (separate process). Recent RCAs and vector embeddings survive.</li>
          <li><strong>ChromaDB vector store</strong> — persists (stored on disk). Historical log embeddings are retained.</li>
        </ul>
        <p>For production deployments, set your LLM config via environment variables (<code>LLM_PROVIDER</code>, <code>GROQ_API_KEY</code>, etc.) so the server auto-configures on startup without manual intervention.</p>
      </>
    ),
  },
  {
    num: "06",
    q: "How do I deploy this to production?",
    a: (
      <>
        <p>Three deployment paths are supported:</p>
        <ul>
          <li><strong>Railway</strong> — one-click deploy via <code>railway.json</code>. Set env vars in the Railway dashboard. Cheapest managed option.</li>
          <li><strong>Docker Compose</strong> — run <code>docker-compose up -d</code> on any Linux VM. All services (FastAPI, Next.js, Redis, ChromaDB) start together.</li>
          <li><strong>Manual</strong> — run the FastAPI backend and Next.js frontend separately. Useful for custom infra or Kubernetes.</li>
        </ul>
        <p>Environment variables are the primary configuration method for production. See <code>.env.railway.template</code> for a complete list of supported variables including LLM provider, API keys, and service URLs.</p>
      </>
    ),
  },
];

export default function FAQPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIdx(prev => (prev === i ? null : i));

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)", paddingTop: 72 }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "52px 24px 80px" }}>

        {/* Page header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "4px 12px", borderRadius: 20,
            background: "rgba(79,142,247,0.08)",
            border: "1px solid rgba(79,142,247,0.2)",
            marginBottom: 16,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)" }} />
            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent)", letterSpacing: "0.08em" }}>
              SUPPORT
            </span>
          </div>
          <h1 style={{
            fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            fontFamily: "var(--font-ui)",
            color: "var(--text-primary)",
            marginBottom: 12,
            lineHeight: 1.15,
          }}>
            Frequently Asked<br />Questions
          </h1>
          <p style={{
            fontSize: 14, color: "var(--text-muted)",
            fontFamily: "var(--font-ui)", lineHeight: 1.7, maxWidth: 480,
          }}>
            Everything you need to know about security, integrations, LLM choices, and deployment.
          </p>
        </div>

        {/* Accordion */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ITEMS.map((item, i) => {
            const isOpen = openIdx === i;
            return (
              <div
                key={i}
                className="glass-panel"
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  border: isOpen
                    ? "1px solid rgba(79,142,247,0.25)"
                    : "1px solid var(--border-subtle)",
                  transition: "border-color 0.2s ease",
                }}
              >
                {/* Question row */}
                <button
                  onClick={() => toggle(i)}
                  style={{
                    width: "100%",
                    display: "flex", alignItems: "center", gap: 16,
                    padding: "18px 20px",
                    background: "transparent", border: "none", cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{
                    fontSize: 10, fontWeight: 800, fontFamily: "var(--font-mono)",
                    color: isOpen ? "var(--accent)" : "var(--text-muted)",
                    letterSpacing: "0.06em", flexShrink: 0,
                    transition: "color 0.2s ease",
                  }}>
                    {item.num}
                  </span>
                  <span style={{
                    flex: 1,
                    fontSize: 14, fontWeight: 600, fontFamily: "var(--font-ui)",
                    color: isOpen ? "var(--text-primary)" : "var(--text-secondary)",
                    letterSpacing: "-0.01em",
                    transition: "color 0.2s ease",
                  }}>
                    {item.q}
                  </span>
                  <span style={{
                    color: isOpen ? "var(--accent)" : "var(--text-muted)",
                    display: "flex", alignItems: "center", flexShrink: 0,
                    transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.22s cubic-bezier(0.4,0,0.2,1), color 0.2s ease",
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </span>
                </button>

                {/* Answer — smooth expand */}
                <div style={{
                  maxHeight: isOpen ? 600 : 0,
                  overflow: "hidden",
                  transition: "max-height 0.3s cubic-bezier(0.4,0,0.2,1)",
                }}>
                  <div style={{
                    padding: "0 20px 20px 48px",
                    fontSize: 13,
                    fontFamily: "var(--font-ui)",
                    color: "var(--text-muted)",
                    lineHeight: 1.75,
                  }}>
                    <style>{`
                      .faq-body p { margin: 0 0 10px; }
                      .faq-body p:last-child { margin-bottom: 0; }
                      .faq-body ul { margin: 8px 0 10px; padding-left: 18px; }
                      .faq-body li { margin-bottom: 6px; }
                      .faq-body strong { color: var(--text-secondary); font-weight: 600; }
                      .faq-body code {
                        font-family: var(--font-mono); font-size: 11px;
                        background: rgba(79,142,247,0.08); border: 1px solid rgba(79,142,247,0.15);
                        padding: 1px 5px; border-radius: 4px; color: #7dd3fc;
                      }
                    `}</style>
                    <div className="faq-body">{item.a}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div style={{
          marginTop: 48, padding: "16px 20px", borderRadius: 10,
          background: "rgba(255,255,255,0.02)",
          border: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ color: "var(--text-muted)", flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-ui)", margin: 0, lineHeight: 1.6 }}>
            Still have questions? Open an issue on GitHub or check the <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, background: "rgba(255,255,255,0.05)", padding: "1px 5px", borderRadius: 3 }}>README</code> for advanced configuration options.
          </p>
        </div>

      </div>
    </main>
  );
}
