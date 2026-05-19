"use client";

import { Cpu, GitBranch, Database, Shield, Zap, Terminal } from "lucide-react";

const CARDS = [
  {
    icon: GitBranch, color: "#67e8f9",
    title: "LangGraph Multi-Agent",
    desc: "A cyclic state machine that forces adversarial self-correction. The Investigator drafts an RCA, but the Critic validates it against hallucinations and missing steps. Max 2 revision cycles.",
  },
  {
    icon: Cpu, color: "#818cf8",
    title: "Dual-Mode LLM Inference",
    desc: "Runs 100% air-gapped on-premise using Ollama (llama3.1), OR cloud-native using the Groq API (llama-3.1-8b-instant) LPU engine at 500 tok/s. Zero code changes required.",
  },
  {
    icon: Database, color: "#34d399",
    title: "ChromaDB Vector RAG",
    desc: "Semantic memory for the SRE agent. Retrieves the top 3 similar historical incidents in under 10ms and injects their root causes into the LLM context to prevent repeating mistakes.",
  },
  {
    icon: Shield, color: "#fb923c",
    title: "Neo4j Blast Radius",
    desc: "GraphRAG dependency mapping. When a service errors, the system queries Neo4j to instantly identify all downstream consumers affected, feeding blast radius context to the Investigator.",
  },
  {
    icon: Zap, color: "#fbbf24",
    title: "Redis Semantic Cache",
    desc: "Deduplication layer. Identical error patterns hitting simultaneously bypass the LLM layer entirely, serving a validated RCA from memory in ~4ms instead of ~8 seconds.",
  },
  {
    icon: Terminal, color: "#7dd3fc",
    title: "FastAPI + WebSockets",
    desc: "High-throughput async backend. Ingests logs, runs anomaly detection, and streams real-time state machine transitions to the Next.js frontend without long-polling.",
  },
];

export default function TechStackSection() {
  return (
    <section id="tech-stack" style={{ padding: "72px 24px 120px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 52 }}>
        <h2 style={{
          fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
          fontWeight: 800, marginBottom: 14,
          letterSpacing: "-0.035em",
          fontFamily: "var(--font-ui)",
        }}>
          Built for{" "}
          <span className="gradient-text-emerald">Enterprise Scale</span>
        </h2>
        <p style={{
          color: "var(--text-secondary)", maxWidth: 560,
          margin: "0 auto", fontSize: 15, lineHeight: 1.75,
        }}>
          This is not a wrapper. Kairos implements the same architectural patterns
          used by Staff SREs at top-tier engineering organizations.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: 18,
      }}>
        {CARDS.map((card, i) => (
          <div
            key={i}
            className="glass-panel"
            style={{
              padding: "22px 24px",
              transition: "transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease",
              cursor: "default",
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform   = "translateY(-4px)";
              el.style.borderColor = `${card.color}35`;
              el.style.boxShadow   = `var(--shadow-glass), 0 16px 40px ${card.color}10`;
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform   = "translateY(0)";
              el.style.borderColor = "var(--glass-border)";
              el.style.boxShadow   = "var(--shadow-glass)";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${card.color}12`,
                border: `1px solid ${card.color}20`,
                color: card.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <card.icon size={18} />
              </div>
              <h3 style={{
                fontSize: 15, fontWeight: 700,
                color: "var(--text-primary)",
                fontFamily: "var(--font-ui)",
              }}>
                {card.title}
              </h3>
            </div>
            <p style={{
              fontSize: 13.5, color: "var(--text-secondary)",
              lineHeight: 1.72,
            }}>
              {card.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
