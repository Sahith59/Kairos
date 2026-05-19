"use client";

import HeroSection from "@/components/HeroSection";
import ArchitectureSection from "@/components/ArchitectureSection";
import Dashboard from "@/components/Dashboard";
import TechStackSection from "@/components/TechStackSection";

export default function Home() {
  const scrollToCockpit = () => {
    document.getElementById("cockpit")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main>
      <HeroSection onDemo={scrollToCockpit} />

      {/* Architecture */}
      <div style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border-subtle)" }}>
        <ArchitectureSection />
      </div>

      {/* Cockpit section */}
      <div id="cockpit" style={{ background: "var(--bg-base)", borderTop: "1px solid var(--border-subtle)" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "56px 24px 0" }}>
          {/* Section header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
              <h2 style={{
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                fontWeight: 800,
                letterSpacing: "-0.025em",
                fontFamily: "var(--font-display)",
              }}>
                Live{" "}
                <span className="gradient-text-purple">Cockpit</span>
              </h2>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "3px 10px", borderRadius: 100,
                border: "1px solid rgba(16,185,129,0.25)",
                background: "rgba(16,185,129,0.06)",
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "var(--emerald)",
                  boxShadow: "0 0 6px var(--emerald)",
                  display: "block",
                }} />
                <span style={{
                  fontSize: 10, fontWeight: 700, color: "var(--emerald)",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  fontFamily: "var(--font-ui)",
                }}>
                  Live
                </span>
              </div>
            </div>
            <p style={{
              color: "var(--text-muted)", fontSize: 13,
              fontFamily: "var(--font-ui)",
            }}>
              Real-time WebSocket stream. Click &ldquo;Simulate Production Incident&rdquo; above to fire a demo incident and watch the AI agent investigate in real-time.
            </p>
          </div>

          <Dashboard />
        </div>
      </div>

      {/* Tech stack */}
      <div style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border-subtle)" }}>
        <TechStackSection />
      </div>

      {/* Footer */}
      <footer style={{
        textAlign: "center", padding: "32px 24px",
        color: "var(--text-muted)", fontSize: 12,
        borderTop: "1px solid var(--border-subtle)",
        background: "var(--bg-base)",
        fontFamily: "var(--font-ui)",
      }}>
        <p>
          Built as a portfolio showcase demonstrating Agentic System Engineering.
          &nbsp;·&nbsp; LangGraph &nbsp;·&nbsp; FastAPI &nbsp;·&nbsp; Next.js
        </p>
      </footer>
    </main>
  );
}
