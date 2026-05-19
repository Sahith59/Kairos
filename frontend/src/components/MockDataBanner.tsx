"use client";

import { useState } from "react";

interface MockDataBannerProps {
  onConnect: () => void;
}

export default function MockDataBanner({ onConnect }: MockDataBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <>
      <style>{`
        @keyframes amber-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(251,191,36,0.4); }
          50%       { opacity: 0.6; box-shadow: 0 0 0 5px rgba(251,191,36,0); }
        }
      `}</style>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "9px 16px",
        marginBottom: 20,
        borderRadius: 10,
        background: "rgba(251,191,36,0.05)",
        border: "1px solid rgba(251,191,36,0.2)",
        backdropFilter: "blur(12px)",
      }}>
        {/* Pulsing dot */}
        <span style={{
          width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
          background: "#fbbf24",
          animation: "amber-pulse 2s ease-in-out infinite",
        }} />

        {/* Message */}
        <p style={{
          flex: 1, margin: 0,
          fontSize: 12, fontFamily: "var(--font-ui)",
          color: "rgba(251,191,36,0.85)",
          lineHeight: 1.5,
        }}>
          <strong style={{ fontWeight: 700 }}>Running on demo data.</strong>
          {" "}Connect your production logs via the Integration Hub to analyse real incidents.
        </p>

        {/* Connect CTA */}
        <button
          onClick={onConnect}
          style={{
            flexShrink: 0,
            padding: "5px 14px",
            borderRadius: 7,
            fontSize: 11, fontWeight: 700,
            fontFamily: "var(--font-ui)",
            letterSpacing: "0.04em",
            color: "#fbbf24",
            background: "rgba(251,191,36,0.1)",
            border: "1px solid rgba(251,191,36,0.3)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(251,191,36,0.18)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(251,191,36,0.5)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(251,191,36,0.1)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(251,191,36,0.3)";
          }}
        >
          Connect
        </button>

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          style={{
            flexShrink: 0,
            width: 22, height: 22,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 5,
            background: "none",
            border: "1px solid rgba(251,191,36,0.15)",
            color: "rgba(251,191,36,0.45)",
            cursor: "pointer",
            fontSize: 13, lineHeight: 1,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = "#fbbf24";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(251,191,36,0.35)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = "rgba(251,191,36,0.45)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(251,191,36,0.15)";
          }}
          title="Dismiss"
        >
          ×
        </button>
      </div>
    </>
  );
}
