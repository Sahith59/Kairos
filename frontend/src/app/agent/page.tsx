"use client";

import { useEffect, useRef } from "react";
import { useKairos } from "@/components/KairosContext";

const NODE_COLORS: Record<string, string> = {
  investigator: "#60a5fa",
  critic:       "#fbbf24",
  tool:         "#a78bfa",
  cache:        "#34d399",
  fallback:     "#7dd3fc",
  start:        "#f87171",
  done:         "#34d399",
};

export default function AgentMindPage() {
  const {
    agentEvents: events,
    agentStats:  stats,
    lastVerdict,
    isAgentRunning: isRunning,
    fireDemo,
  } = useKairos();

  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [events.length]);

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)", paddingTop: 72 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>

        {/* Page header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800,
            letterSpacing: "-0.03em", fontFamily: "var(--font-ui)",
            color: "var(--text-primary)", marginBottom: 8,
          }}>
            Agent Mind
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, fontFamily: "var(--font-ui)", maxWidth: 560 }}>
            Live view of the LangGraph Investigator → Critic loop. Every thought, tool call,
            and revision is streamed in real-time via WebSocket.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20, alignItems: "start" }}>

          {/* Event timeline */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column" }}>
            <div className="panel-header">
              <div className="panel-header-left">
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: isRunning ? "#34d399" : "#3a4462",
                  display: "inline-block",
                  boxShadow: isRunning ? "0 0 8px #34d399" : "none",
                  transition: "all 0.3s ease",
                }} />
                <span className="panel-title">
                  {isRunning ? "Agent Running" : events.length > 0 ? "Agent Idle" : "Waiting for Incident"}
                </span>
              </div>
              <span className="badge-live">WebSocket</span>
            </div>

            <div ref={feedRef} style={{ flex: 1, overflowY: "auto", padding: 16, maxHeight: 600 }}>
              {events.length === 0 && isRunning ? (
                <BootingState />
              ) : events.length === 0 ? (
                <IdleState onFire={fireDemo} />
              ) : (
                <div className="timeline">
                  {events.map((ev, idx) => {
                    const color = NODE_COLORS[ev.node] ?? "#64748b";
                    const isLast = idx === events.length - 1;
                    return (
                      <div key={ev.id} className="timeline-item">
                        <div className="timeline-track">
                          <div className="timeline-dot" style={{ borderColor: color, color }}>
                            <NodeIcon node={ev.node} status={ev.status} />
                          </div>
                          {!isLast && <div className="timeline-line" />}
                        </div>
                        <div className="timeline-content">
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                            <span className="timeline-node-tag" style={{ color }}>
                              {ev.node.toUpperCase()}
                            </span>
                            <span style={{
                              fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)",
                            }}>
                              {new Date(ev.ts).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="timeline-text">{ev.label}</p>
                          {ev.content && (
                            <pre className="timeline-code" style={{ marginTop: 6, maxHeight: 120, overflow: "hidden" }}>
                              {ev.content.slice(0, 400)}{ev.content.length > 400 ? "…" : ""}
                            </pre>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {events.length > 0 && (
              <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-subtle)" }}>
                <button
                  onClick={fireDemo}
                  style={{
                    width: "100%", padding: "10px 0", borderRadius: 8,
                    background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.2)",
                    color: "#4f8ef7", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-ui)",
                    cursor: "pointer", transition: "all 0.15s ease", letterSpacing: "0.02em",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(79,142,247,0.14)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(79,142,247,0.08)"; }}
                >
                  Fire another demo incident
                </button>
              </div>
            )}
          </div>

          {/* Sidebar: stats + legend */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Pipeline summary */}
            <div className="glass-panel">
              <div className="panel-header">
                <span className="panel-title">Pipeline Summary</span>
              </div>
              <div style={{ padding: "12px 16px" }}>
                {[
                  { label: "Events",             value: events.length },
                  { label: "Investigator steps", value: stats.investigator },
                  { label: "Critic reviews",     value: stats.critic },
                  { label: "Tool calls",         value: stats.tool },
                  { label: "Revisions",          value: stats.revisions },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 0", borderBottom: "1px solid var(--border-subtle)",
                  }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>{value}</span>
                  </div>
                ))}

                {lastVerdict && (
                  <div style={{
                    marginTop: 12, padding: "8px 14px", borderRadius: 8,
                    background: lastVerdict === "approved" ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)",
                    border: `1px solid ${lastVerdict === "approved" ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)"}`,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: lastVerdict === "approved" ? "#34d399" : "#f87171",
                    }} />
                    <span style={{
                      fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)",
                      color: lastVerdict === "approved" ? "#34d399" : "#f87171",
                      letterSpacing: "0.06em",
                    }}>
                      {lastVerdict.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="glass-panel">
              <div className="panel-header">
                <span className="panel-title">Legend</span>
              </div>
              <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.entries({ Investigator: "#60a5fa", Critic: "#fbbf24", Tool: "#a78bfa", System: "#34d399", Cache: "#34d399" }).map(([label, color]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-ui)" }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}

function NodeIcon({ node, status }: { node: string; status: string }) {
  const size = 10;
  if (node === "investigator") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  );
  if (node === "critic" && status === "approved") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
  if (node === "critic") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
      <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
  if (node === "tool") return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function BootingState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px", gap: 18 }}>
      <style>{`
        @keyframes ring-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes step-blink {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>

      <div style={{ position: "relative", width: 48, height: 48 }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none"
          style={{ animation: "ring-spin 1s linear infinite", display: "block" }}>
          <circle cx="24" cy="24" r="20" stroke="rgba(79,142,247,0.15)" strokeWidth="3"/>
          <path d="M24 4 A20 20 0 0 1 44 24" stroke="#4f8ef7" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#4f8ef7",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <p style={{
          fontSize: 13, fontWeight: 600, color: "var(--text-secondary)",
          fontFamily: "var(--font-ui)", marginBottom: 6,
        }}>
          Agent pipeline initialising
        </p>
        <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
          Anomaly detection → GraphRAG → LangGraph loop
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 260 }}>
        {[
          { label: "Ingesting demo logs", color: "#34d399" },
          { label: "Investigator drafting RCA…", color: "#60a5fa" },
          { label: "Critic validating…", color: "#fbbf24" },
        ].map((s, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "7px 12px", borderRadius: 8,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--border-subtle)",
            animation: `step-blink 1.8s ease-in-out ${i * 0.4}s infinite`,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IdleState({ onFire }: { onFire: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
        <div style={{
          padding: "10px 18px", borderRadius: 10,
          border: "1px solid rgba(96,165,250,0.3)", background: "rgba(96,165,250,0.06)",
          fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#60a5fa",
          letterSpacing: "0.06em",
        }}>INVESTIGATOR</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <span style={{ fontSize: 16, color: "var(--text-muted)" }}>⇄</span>
          <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>max 2 revisions</span>
        </div>
        <div style={{
          padding: "10px 18px", borderRadius: 10,
          border: "1px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.06)",
          fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#fbbf24",
          letterSpacing: "0.06em",
        }}>CRITIC</div>
      </div>

      <p style={{
        fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-ui)",
        textAlign: "center", maxWidth: 340, lineHeight: 1.7,
      }}>
        Fire an incident to watch the Investigator draft a root cause analysis
        and the Critic validate it for hallucinations in real-time.
      </p>

      <button
        onClick={onFire}
        style={{
          padding: "11px 28px", borderRadius: 9,
          background: "rgba(79,142,247,0.12)", border: "1px solid rgba(79,142,247,0.3)",
          color: "#4f8ef7", fontSize: 13, fontWeight: 600, fontFamily: "var(--font-ui)",
          cursor: "pointer", transition: "all 0.15s ease", letterSpacing: "0.02em",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(79,142,247,0.2)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(79,142,247,0.12)"; }}
      >
        Fire Demo Incident
      </button>
    </div>
  );
}
