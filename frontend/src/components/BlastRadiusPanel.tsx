"use client";

import { Network } from "lucide-react";

const NODES = [
  { id: "APIGateway",       x: 160, y: 38,  label: "API GW",    short: "API"   },
  { id: "AuthService",      x: 68,  y: 114, label: "Auth",      short: "Auth"  },
  { id: "OrderService",     x: 252, y: 114, label: "Order",     short: "Order" },
  { id: "UserService",      x: 28,  y: 196, label: "User",      short: "User"  },
  { id: "PaymentService",   x: 160, y: 196, label: "Payment",   short: "Pay"   },
  { id: "InventoryService", x: 292, y: 196, label: "Inventory", short: "Inv"   },
];

const EDGES = [
  { source: "APIGateway",     target: "AuthService" },
  { source: "APIGateway",     target: "OrderService" },
  { source: "OrderService",   target: "PaymentService" },
  { source: "OrderService",   target: "InventoryService" },
  { source: "AuthService",    target: "UserService" },
  { source: "PaymentService", target: "AuthService" },
];

const R = 20; // node radius

export default function BlastRadiusPanel({ failingService }: { failingService: string | null }) {
  const affected = new Set<string>();
  if (failingService) {
    affected.add(failingService);
    let added = true;
    while (added) {
      added = false;
      EDGES.forEach(edge => {
        if (affected.has(edge.target) && !affected.has(edge.source)) {
          affected.add(edge.source);
          added = true;
        }
      });
    }
  }

  const hasIncident = !!failingService;

  return (
    <div className="glass-panel" style={{ flexShrink: 0 }}>
      {/* Header */}
      <div className="panel-header">
        <div className="panel-header-left">
          <Network size={13} style={{ color: "#a5b4fc" }} />
          <span className="panel-title">Blast Radius</span>
          <span style={{
            fontSize: 9, color: "var(--text-muted)",
            fontFamily: "var(--font-mono)", marginLeft: 2,
          }}>Neo4j GraphRAG</span>
        </div>
        {hasIncident && (
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
            color: "#f87171",
            padding: "3px 10px", borderRadius: 100,
            border: "1px solid rgba(248,113,113,0.3)",
            background: "rgba(248,113,113,0.08)",
            fontFamily: "var(--font-mono)",
            animation: "none",
          }}>
            IMPACT DETECTED
          </span>
        )}
      </div>

      {/* Graph area */}
      <div style={{
        height: 260,
        background: hasIncident
          ? "radial-gradient(ellipse at 50% 25%, rgba(248,113,113,0.06) 0%, transparent 55%), rgba(6,8,22,0.5)"
          : "rgba(6,8,22,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        transition: "background 0.8s ease",
      }}>
        {/* Dot-grid background */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.25 }}>
          <defs>
            <pattern id="dot-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="rgba(255,255,255,0.3)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />
        </svg>

        {/* Main graph SVG */}
        <svg width="320" height="240" style={{ overflow: "visible", position: "relative", zIndex: 1 }}>
          <defs>
            {/* Arrow markers */}
            <marker id="arr-cold" viewBox="0 0 10 10" refX="24" refY="5"
              markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="rgba(255,255,255,0.12)" />
            </marker>
            <marker id="arr-hot" viewBox="0 0 10 10" refX="24" refY="5"
              markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill="#f87171" />
            </marker>

            {/* Glow filters */}
            <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-orange" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-soft" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Edges */}
          {EDGES.map((edge, i) => {
            const s = NODES.find(n => n.id === edge.source)!;
            const t = NODES.find(n => n.id === edge.target)!;
            const hot = affected.has(s.id) && affected.has(t.id);

            return (
              <g key={i}>
                {/* Base line */}
                <line
                  x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke={hot ? "rgba(248,113,113,0.25)" : "rgba(255,255,255,0.07)"}
                  strokeWidth={hot ? 2 : 1}
                  strokeLinecap="round"
                />
                {/* Flowing animated layer (hot edges only) */}
                {hot && (
                  <line
                    x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                    stroke="#f87171"
                    strokeWidth={1.8}
                    strokeDasharray="7 5"
                    strokeLinecap="round"
                    markerEnd="url(#arr-hot)"
                    style={{
                      animation: "flow-dash 0.65s linear infinite",
                      filter: "drop-shadow(0 0 3px rgba(248,113,113,0.6))",
                    }}
                  />
                )}
                {/* Cold edge arrow */}
                {!hot && (
                  <line
                    x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                    stroke="rgba(255,255,255,0.09)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    markerEnd="url(#arr-cold)"
                  />
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {NODES.map(node => {
            const failing    = node.id === failingService;
            const downstream = affected.has(node.id) && !failing;
            const healthy    = !failing && !downstream;

            const strokeColor = failing    ? "#f87171"
                              : downstream ? "#fb923c"
                              : "rgba(255,255,255,0.12)";
            const fillColor   = failing    ? "rgba(248,113,113,0.15)"
                              : downstream ? "rgba(251,146,60,0.1)"
                              : "rgba(14,16,40,0.85)";
            const textColor   = failing    ? "#fca5a5"
                              : downstream ? "#fdba74"
                              : "rgba(148,163,184,0.8)";
            const glowFilter  = failing    ? "url(#glow-red)"
                              : downstream ? "url(#glow-orange)"
                              : undefined;

            return (
              <g key={node.id} transform={`translate(${node.x},${node.y})`}>

                {/* Multi-ring radiating pulse (failing node only) */}
                {failing && [0, 1, 2].map(i => (
                  <circle key={i} cx={0} cy={0} r={R}
                    fill="none"
                    stroke="#f87171"
                    strokeWidth="1.5"
                    style={{
                      animation: `radiate 2.1s ease-out ${i * 0.7}s infinite`,
                      transformOrigin: "0px 0px",
                      opacity: 0.7,
                    }}
                  />
                ))}

                {/* Soft outer glow ring (affected) */}
                {downstream && (
                  <circle cx={0} cy={0} r={R + 5}
                    fill="none"
                    stroke="rgba(251,146,60,0.2)"
                    strokeWidth="1"
                    style={{ animation: "node-breathe 2s ease-in-out infinite" }}
                  />
                )}

                {/* Node circle */}
                <circle cx={0} cy={0} r={R}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={failing ? 2 : 1.5}
                  filter={glowFilter}
                  style={{ transition: "fill 0.5s ease, stroke 0.5s ease" }}
                />

                {/* Inner specular highlight */}
                <circle cx={-4} cy={-6} r={5}
                  fill="rgba(255,255,255,0.04)"
                  style={{ transition: "opacity 0.5s ease" }}
                />

                {/* Node short label inside */}
                <text textAnchor="middle" y="4"
                  fill={textColor}
                  fontSize={failing ? "8.5" : "8"}
                  fontFamily="var(--font-mono)"
                  fontWeight={failing ? "700" : "600"}
                  style={{ transition: "fill 0.5s ease" }}
                >
                  {node.short}
                </text>

                {/* Full name below */}
                <text textAnchor="middle" y={R + 14}
                  fill={textColor}
                  fontSize="8.5"
                  fontFamily="var(--font-ui)"
                  fontWeight="500"
                  style={{ transition: "fill 0.5s ease" }}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend (only when incident active) */}
        {hasIncident && (
          <div style={{
            position: "absolute", bottom: 10, right: 12,
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            {[
              { color: "#f87171", label: "Origin" },
              { color: "#fb923c", label: "Affected" },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: color, display: "block",
                  boxShadow: `0 0 4px ${color}`,
                }} />
                <span style={{
                  fontSize: 8.5, color: "var(--text-muted)",
                  fontFamily: "var(--font-ui)", fontWeight: 500,
                }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
