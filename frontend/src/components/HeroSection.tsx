"use client";

import { useEffect, useState, useRef } from "react";
import { Activity, Shield, Zap, Database, GitBranch, AlertTriangle, ArrowRight } from "lucide-react";

// ── Kairos scramble animation ─────────────────────────────────────────────────
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%&*";
const WORD = "KAIROS";

function KairosWord() {
  const [letters, setLetters] = useState<string[]>(Array(WORD.length).fill("·"));
  const [resolved, setResolved] = useState<boolean[]>(Array(WORD.length).fill(false));
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    WORD.split("").forEach((target, idx) => {
      const startDelay = idx * 110 + 300;
      let scrambleCount = 0;
      const maxScrambles = 10 + idx * 2;

      setTimeout(() => {
        const tick = setInterval(() => {
          if (scrambleCount >= maxScrambles) {
            clearInterval(tick);
            setLetters(prev => { const n = [...prev]; n[idx] = target; return n; });
            setResolved(prev => { const n = [...prev]; n[idx] = true; return n; });
          } else {
            setLetters(prev => {
              const n = [...prev];
              n[idx] = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
              return n;
            });
            scrambleCount++;
          }
        }, 55);
      }, startDelay);
    });
  }, []);

  return (
    <div style={{ marginBottom: 40, position: "relative" }}>
      <style>{`
        @keyframes kairos-glow {
          0%, 100% { text-shadow: 0 0 40px rgba(79,142,247,0.25), 0 0 80px rgba(79,142,247,0.08); }
          50%       { text-shadow: 0 0 60px rgba(79,142,247,0.45), 0 0 120px rgba(79,142,247,0.18), 0 0 200px rgba(79,142,247,0.06); }
        }
        @keyframes eq-pulse {
          0%, 100% { transform: scaleY(0.2); opacity: 0.3; }
          50%       { transform: scaleY(1);   opacity: 0.7; }
        }
        @keyframes letter-in {
          from { opacity: 0; transform: translateY(6px); filter: blur(4px); }
          to   { opacity: 1; transform: translateY(0);   filter: blur(0); }
        }
      `}</style>

      {/* The word */}
      <div style={{
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        gap: "clamp(6px, 1.2vw, 16px)",
        animation: resolved.every(Boolean) ? "kairos-glow 3.5s ease-in-out infinite" : "none",
      }}>
        {letters.map((ch, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{
              fontSize: "clamp(3.8rem, 9vw, 7.5rem)",
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              letterSpacing: "-0.04em",
              lineHeight: 1,
              color: resolved[i] ? "#ffffff" : "#4f8ef7",
              opacity: resolved[i] ? 1 : 0.7,
              transition: resolved[i] ? "color 0.3s ease, opacity 0.3s ease" : "none",
              animation: resolved[i] ? "letter-in 0.25s ease forwards" : "none",
              display: "block",
              minWidth: "clamp(2.5rem, 5.5vw, 5rem)",
              textAlign: "center",
            }}>
              {ch}
            </span>
            {/* EQ bar beneath each letter */}
            <div style={{
              width: "clamp(12px, 2vw, 22px)",
              height: 24,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 2,
              opacity: resolved[i] ? 1 : 0,
              transition: "opacity 0.4s ease",
            }}>
              {[0, 1, 2].map(b => (
                <div key={b} style={{
                  width: 3,
                  height: "100%",
                  background: "rgba(79,142,247,0.5)",
                  borderRadius: 2,
                  transformOrigin: "bottom",
                  animation: `eq-pulse ${1.2 + b * 0.3 + i * 0.07}s ease-in-out ${b * 0.18 + i * 0.05}s infinite`,
                }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tagline beneath the word */}
      <p style={{
        marginTop: 14,
        fontSize: "clamp(9px, 1.1vw, 12px)",
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.28em",
        textTransform: "uppercase",
        color: "rgba(79,142,247,0.55)",
        textAlign: "center",
        opacity: resolved.every(Boolean) ? 1 : 0,
        transition: "opacity 0.6s ease 0.3s",
      }}>
        The decisive moment · Autonomous Incident Intelligence
      </p>
    </div>
  );
}

type HealthData = {
  components?: {
    redis: boolean; neo4j: boolean; llm: string;
    llm_ready: boolean; chroma: boolean; langgraph: boolean;
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export default function HeroSection({ onDemo }: { onDemo: () => void }) {
  const [health, setHealth]           = useState<HealthData>({});
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/health`);
        if (res.ok) setHealth(await res.json());
      } catch {}
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  const handleDemo = async () => {
    setDemoLoading(true);
    try {
      await fetch(`${API_URL}/demo`, { method: "POST" });
      onDemo();
    } catch {}
    setTimeout(() => setDemoLoading(false), 2500);
  };

  const c = health.components;
  const badges = [
    { label: "LangGraph", ok: c?.langgraph, icon: GitBranch },
    { label: c?.llm ? `LLM: ${c.llm}` : "LLM", ok: c?.llm_ready, icon: Activity },
    { label: "ChromaDB",  ok: c?.chroma,    icon: Database },
    { label: "Redis",     ok: c?.redis,     icon: Zap },
    { label: "Neo4j",     ok: c?.neo4j,     icon: Shield },
  ];

  return (
    <section id="hero" style={{
      minHeight: "92vh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      textAlign: "center",
      padding: "80px 24px 64px",
      position: "relative", overflow: "hidden",
    }}>
      {/* Refined dot-grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "44px 44px",
        pointerEvents: "none",
      }} />

      {/* Kairos animated word */}
      <KairosWord />

      {/* Eyebrow */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "6px 16px", borderRadius: 100,
        border: "1px solid rgba(129,140,248,0.3)",
        background: "rgba(129,140,248,0.07)",
        color: "#a5b4fc", fontSize: 11, fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        marginBottom: 32,
        backdropFilter: "blur(8px)",
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "#34d399", boxShadow: "0 0 7px #34d399", display: "block",
        }} />
        AI-Native Site Reliability Engineering
      </div>

      {/* Headline */}
      <h1 style={{
        fontSize: "clamp(2.8rem, 6.5vw, 5.2rem)",
        fontWeight: 800,
        lineHeight: 1.05,
        letterSpacing: "-0.04em",
        maxWidth: 860,
        marginBottom: 24,
        fontFamily: "var(--font-ui)",
        color: "var(--text-primary)",
      }}>
        Your AI First Responder
        <br />
        <span className="gradient-text-accent" style={{ paddingBottom: 4, display: "inline-block" }}>
          for Production Incidents
        </span>
      </h1>

      {/* Description */}
      <p style={{
        fontSize: "clamp(1rem, 2vw, 1.13rem)",
        color: "var(--text-secondary)",
        maxWidth: 640, lineHeight: 1.78,
        marginBottom: 14,
      }}>
        Kairos watches your logs 24/7, detects anomalies in real-time, and delivers a
        validated{" "}
        <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>
          3-part Root Cause Analysis
        </strong>{" "}
        in seconds — powered by a self-reflective{" "}
        <strong style={{ color: "#a5b4fc", fontWeight: 600 }}>
          LangGraph Investigator &rarr; Critic
        </strong>{" "}
        loop running entirely on your infrastructure.
      </p>

      {/* MTTR comparison pill */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 10,
        marginBottom: 44, padding: "9px 18px", borderRadius: 100,
        background: "rgba(52,211,153,0.06)",
        border: "1px solid rgba(52,211,153,0.15)",
        backdropFilter: "blur(8px)",
      }}>
        <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          Human SRE MTTR: ~23 min
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: 10 }}>&rarr;</span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: "#34d399", fontFamily: "var(--font-mono)" }}>
          Kairos MTTR: ~8 seconds
        </span>
      </div>

      {/* CTAs */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginBottom: 56 }}>
        <button
          className="btn-primary btn-demo"
          onClick={handleDemo}
          disabled={demoLoading}
          style={{ fontSize: 14, padding: "13px 26px" }}
        >
          {demoLoading ? (
            <>
              <span className="animate-spin-slow" style={{ display: "inline-block", fontSize: 14 }}>*</span>
              Firing Incident
            </>
          ) : (
            <>
              <AlertTriangle size={15} />
              Simulate Production Incident
            </>
          )}
        </button>

        <a href="#cockpit" style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "13px 26px", borderRadius: "var(--radius-md)",
          border: "1px solid var(--glass-border)",
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(12px)",
          color: "var(--text-primary)", textDecoration: "none",
          fontWeight: 600, fontSize: 14,
          transition: "all 0.2s",
        }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = "rgba(129,140,248,0.35)";
            el.style.background  = "rgba(129,140,248,0.06)";
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = "var(--glass-border)";
            el.style.background  = "rgba(255,255,255,0.03)";
          }}
        >
          Open Live Cockpit
          <ArrowRight size={14} />
        </a>
      </div>

      {/* System Status */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 7,
        justifyContent: "center", alignItems: "center",
        padding: "13px 22px",
        background: "rgba(255,255,255,0.025)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--glass-border)",
        backdropFilter: "blur(20px)",
        maxWidth: 680,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
      }}>
        <span style={{
          fontSize: 9, color: "var(--text-muted)", fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase", marginRight: 6,
        }}>
          System Status
        </span>
        {badges.map(b => (
          <div key={b.label} style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 11px", borderRadius: 100,
            border: `1px solid ${
              b.ok === undefined ? "rgba(58,68,98,0.4)"
              : b.ok ? "rgba(52,211,153,0.25)"
              : "rgba(58,68,98,0.3)"
            }`,
            background:
              b.ok === undefined ? "rgba(255,255,255,0.03)"
              : b.ok ? "rgba(52,211,153,0.06)"
              : "rgba(255,255,255,0.02)",
            fontSize: 11, fontWeight: 600,
            color: b.ok === undefined ? "var(--text-muted)" : b.ok ? "#6ee7b7" : "var(--text-muted)",
            transition: "all 0.4s",
          }}>
            <b.icon size={10} />
            {b.label}
            <span style={{
              width: 5, height: 5, borderRadius: "50%", display: "block",
              background: b.ok === undefined ? "#2a3456" : b.ok ? "#34d399" : "#2a3456",
              boxShadow: b.ok ? "0 0 5px #34d399" : "none",
            }} />
          </div>
        ))}
      </div>
    </section>
  );
}
