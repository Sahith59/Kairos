"use client";

type ArchNode = { id: string; label: string; sublabel: string; dotColor: string; };
type ArchRow  = { nodes: ArchNode[]; connector?: string; connectorColor?: string; };

const ROWS: ArchRow[] = [
  {
    nodes: [{ id: "logs", label: "Microservices", sublabel: "Log Sources", dotColor: "#94a3b8" }],
    connector: "POST /ingest", connectorColor: "#94a3b8",
  },
  {
    nodes: [{ id: "api", label: "FastAPI", sublabel: "Async Backend", dotColor: "#67e8f9" }],
    connector: "Anomaly Detected", connectorColor: "#f87171",
  },
  {
    nodes: [
      { id: "chroma", label: "ChromaDB",  sublabel: "Vector RAG",       dotColor: "#34d399" },
      { id: "neo4j",  label: "Neo4j",     sublabel: "Graph Blast Radius", dotColor: "#818cf8" },
      { id: "redis",  label: "Redis",     sublabel: "Semantic Cache",    dotColor: "#fbbf24" },
    ],
    connector: "LangGraph Loop", connectorColor: "#818cf8",
  },
  {
    nodes: [
      { id: "inv",   label: "Investigator",  sublabel: "Drafts RCA + Tools",    dotColor: "#67e8f9" },
      { id: "tools", label: "Tool Bindings", sublabel: "DB / Pod Health",       dotColor: "#34d399" },
      { id: "critic",label: "Lead Critic",   sublabel: "Hallucination Check",   dotColor: "#c084fc" },
    ],
    connector: "WebSocket", connectorColor: "#67e8f9",
  },
  {
    nodes: [{ id: "ui", label: "SRE Cockpit", sublabel: "Real-time Next.js", dotColor: "#818cf8" }],
  },
];

const TECH_PILLS = [
  "Python 3.11", "FastAPI", "LangGraph", "LangChain",
  "Ollama / Groq", "ChromaDB", "Redis", "Neo4j",
  "Next.js 16", "WebSockets", "Docker",
];

export default function ArchitectureSection() {
  return (
    <section id="architecture" style={{
      padding: "88px 24px",
      maxWidth: 1100, margin: "0 auto",
      overflow: "visible",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 60 }}>
        <div style={{
          display: "inline-block", padding: "4px 14px", borderRadius: 100,
          border: "1px solid rgba(129,140,248,0.28)",
          background: "rgba(129,140,248,0.07)",
          color: "#a5b4fc", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          marginBottom: 18,
          backdropFilter: "blur(8px)",
        }}>
          System Architecture
        </div>

        <h2 style={{
          fontSize: "clamp(2rem, 5vw, 3.2rem)",
          fontWeight: 800, letterSpacing: "-0.04em",
          lineHeight: 1.1, marginBottom: 14,
          fontFamily: "var(--font-ui)",
          overflow: "visible",
        }}>
          How Kairos{" "}
          <span className="gradient-text-cyan" style={{ display: "inline", paddingBottom: 4 }}>
            Thinks
          </span>
        </h2>

        <p style={{
          color: "var(--text-secondary)", fontSize: 15,
          maxWidth: 520, margin: "0 auto", lineHeight: 1.75,
        }}>
          A fully automated pipeline from raw logs to validated root cause analysis.
          Every component runs as an isolated Docker microservice.
        </p>
      </div>

      {/* Flow Diagram */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {ROWS.map((row, rowIdx) => (
          <div key={rowIdx} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
            {/* Nodes */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              {row.nodes.map(node => (
                <div key={node.id} className="arch-node" style={{ minWidth: 140 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: node.dotColor, boxShadow: `0 0 6px ${node.dotColor}`,
                    display: "block", marginBottom: 8,
                  }} />
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: "var(--text-primary)",
                    display: "block", marginBottom: 4,
                  }}>
                    {node.label}
                  </span>
                  <span style={{
                    fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)",
                  }}>
                    {node.sublabel}
                  </span>
                </div>
              ))}
            </div>

            {/* Connector */}
            {row.connector && (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                margin: "5px 0", gap: 2,
              }}>
                <div style={{
                  width: 1, height: 16,
                  background: `linear-gradient(to bottom, transparent, ${row.connectorColor ?? "#818cf8"})`,
                }} />
                <span style={{
                  fontSize: 9.5, fontWeight: 600, letterSpacing: "0.06em",
                  color: row.connectorColor ?? "#818cf8",
                  padding: "2px 11px", borderRadius: 100,
                  background: `${row.connectorColor ?? "#818cf8"}10`,
                  border: `1px solid ${row.connectorColor ?? "#818cf8"}25`,
                  fontFamily: "var(--font-mono)",
                  backdropFilter: "blur(4px)",
                }}>
                  {row.connector}
                </span>
                <div style={{
                  width: 1, height: 16,
                  background: `linear-gradient(to bottom, ${row.connectorColor ?? "#818cf8"}, transparent)`,
                }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Critic loop callout */}
      <div style={{
        margin: "36px auto 0", maxWidth: 680,
        padding: "16px 24px",
        background: "rgba(129,140,248,0.05)",
        border: "1px solid rgba(129,140,248,0.16)",
        borderRadius: "var(--radius-md)",
        textAlign: "center",
        backdropFilter: "blur(12px)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
      }}>
        <span style={{ color: "#a5b4fc", fontWeight: 700, fontSize: 13 }}>
          Self-Reflective Critic Loop:
        </span>{" "}
        <span style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7 }}>
          Investigator drafts &rarr; Critic validates &rarr; if rejected, Investigator revises &rarr;
          repeat until approved (max 2 cycles). Eliminates hallucinations through adversarial self-critique.
        </span>
      </div>

      {/* Tech pills */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 7,
        justifyContent: "center", marginTop: 48,
      }}>
        {TECH_PILLS.map(label => (
          <span key={label} style={{
            padding: "5px 13px", borderRadius: 100,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
            fontSize: 11.5, fontFamily: "var(--font-mono)", fontWeight: 500,
            backdropFilter: "blur(4px)",
          }}>
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}
