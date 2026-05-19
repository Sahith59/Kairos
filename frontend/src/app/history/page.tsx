"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

// ── Types ────────────────────────────────────────────────────────────────────

interface Incident {
  id: string;
  timestamp: string;
  service: string;
  level: string;
  message: string;
  severity_score: number;
  report: string;
  mttr_seconds: number;
  was_cache_hit: boolean;
  provider: string;
  similar_count: number;
}

interface Summary {
  avg_mttr_seconds: number;
  min_mttr_seconds: number;
  max_mttr_seconds: number;
  mttr_series: number[];
  worst_service: string | null;
  cache_hit_rate_pct: number;
  services: string[];
}

interface HistoryResponse {
  incidents: Incident[];
  total: number;
  filtered: number;
  summary: Summary;
}

type SortKey = "timestamp" | "service" | "severity_score" | "mttr_seconds";
type SortDir = "asc" | "desc";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtMTTR(s: number): string {
  if (s < 0.01) return "<1ms";
  if (s < 1)    return `${Math.round(s * 1000)}ms`;
  if (s < 60)   return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch { return iso; }
}

function severityColor(level: string, score: number): string {
  if (level === "CRITICAL" || score >= 80) return "#f87171";
  if (level === "ERROR"    || score >= 50) return "#fb923c";
  if (level === "WARN"     || score >= 25) return "#fbbf24";
  return "#94a3b8";
}

function parseRCA(text: string) {
  const rcaMatch  = text.match(/\*\*1\.[^*]*\*\*[:.]?\s*([\s\S]*?)(?=\*\*2\.|$)/i);
  const fixMatch  = text.match(/\*\*2\.[^*]*\*\*[:.]?\s*([\s\S]*?)(?=\*\*3\.|$)/i);
  const prevMatch = text.match(/\*\*3\.[^*]*\*\*[:.]?\s*([\s\S]*?)(?=\*\*4\.|$)/i);
  const remMatch  = text.match(/\*\*4\.[^*]*\*\*[:.]?\s*([\s\S]*?)$/i);

  const parseCmd = (block: string, label: string): string => {
    const fence    = new RegExp(`${label}\\s*:\\s*\`\`\`(?:bash|sh|shell)?\\s*\\n([^\\n]+)`, "i");
    const backtick = new RegExp(`${label}\\s*:\\s*\`([^\`\\n]+)\``, "i");
    const plain    = new RegExp(`${label}\\s*:\\s*(.+)`, "i");
    const raw = (block.match(fence)?.[1] ?? block.match(backtick)?.[1] ?? block.match(plain)?.[1] ?? "").trim();
    return raw.replace(/^`+(?:bash|sh|shell)?\s*/i, "").trim();
  };

  const remBlock = remMatch?.[1] ?? "";
  return {
    rootCause: rcaMatch?.[1]?.trim() || text.split("\n\n")[0] || text,
    fix:       fixMatch?.[1]?.trim() || "",
    prevention: prevMatch?.[1]?.trim() || "",
    remediation: {
      immediate: parseCmd(remBlock, "immediate"),
      rollback:  parseCmd(remBlock, "rollback"),
      verify:    parseCmd(remBlock, "verify"),
    },
  };
}

// Strip the "(LLM: ollama | ...)" prefix line from reports
function stripPrefix(text: string): string {
  return text.replace(/^\([^)]+\)\s*\n\n/, "");
}

// ── Sparkline ────────────────────────────────────────────────────────────────

function MTTRSparkline({ series, width = 180, height = 40 }: { series: number[]; width?: number; height?: number }) {
  if (series.length < 2) {
    return <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>—</span>;
  }
  const max = Math.max(...series, 0.001);
  const pts = series.map((v, i) => {
    const x = (i / (series.length - 1)) * width;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  const lastTrend = series.length >= 2 && series[series.length - 1] < series[series.length - 2];
  const color = lastTrend ? "#34d399" : "#f87171";

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polygon
        points={`0,${height} ${pts} ${width},${height}`}
        fill="url(#spark-grad)"
      />
      {/* Line */}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Last dot */}
      {series.length > 0 && (() => {
        const last = series[series.length - 1];
        const lx = width;
        const ly = height - (last / max) * (height - 4) - 2;
        return <circle cx={lx} cy={ly} r="2.5" fill={color} />;
      })()}
    </svg>
  );
}

// ── Expanded RCA Panel ────────────────────────────────────────────────────────

function RCAPanel({ report }: { report: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    });
  };

  const clean = stripPrefix(report);
  const rca = parseRCA(clean);

  const Section = ({ title, content, color }: { title: string; content: string; color: string }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color, letterSpacing: "0.08em", marginBottom: 6 }}>
        {title}
      </div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-ui)", lineHeight: 1.7, margin: 0 }}>
        {content || "—"}
      </p>
    </div>
  );

  const CmdBlock = ({ label, cmd, copyKey, color }: { label: string; cmd: string; copyKey: string; color: string }) => (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 9, fontWeight: 700, fontFamily: "var(--font-mono)", color, letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(0,0,0,0.35)", border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 6, padding: "7px 10px",
      }}>
        <code style={{ flex: 1, fontSize: 11, fontFamily: "var(--font-mono)", color: "#e2e8f0", wordBreak: "break-all" }}>
          {cmd || "—"}
        </code>
        {cmd && (
          <button
            onClick={() => copy(cmd, copyKey)}
            style={{
              flexShrink: 0, background: "none", border: "none",
              cursor: "pointer", padding: 2,
              color: copied === copyKey ? "#34d399" : "var(--text-muted)",
              transition: "color 0.2s",
            }}
          >
            {copied === copyKey ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ padding: "16px 20px 20px", borderTop: "1px solid var(--border-subtle)", background: "rgba(0,0,0,0.2)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <Section title="ROOT CAUSE" content={rca.rootCause} color="#f87171" />
          <Section title="ACTIONABLE FIX" content={rca.fix} color="#60a5fa" />
        </div>
        <div>
          <Section title="PREVENTION" content={rca.prevention} color="#34d399" />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#a78bfa", letterSpacing: "0.08em", marginBottom: 8 }}>
              REMEDIATION COMMANDS
            </div>
            <CmdBlock label="IMMEDIATE" cmd={rca.remediation.immediate} copyKey="imm" color="#fbbf24" />
            <CmdBlock label="ROLLBACK"  cmd={rca.remediation.rollback}  copyKey="rb"  color="#f87171" />
            <CmdBlock label="VERIFY"    cmd={rca.remediation.verify}    copyKey="vfy" color="#34d399" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/history?limit=100`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d: HistoryResponse = await r.json();
      setData(d);
      setError(null);
    } catch (e) {
      setError("Cannot reach backend. Make sure Kairos is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    const id = setInterval(fetchHistory, 5000);
    return () => clearInterval(id);
  }, [fetchHistory]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    let items = data.incidents;
    if (serviceFilter !== "ALL") items = items.filter(i => i.service === serviceFilter);
    if (levelFilter !== "ALL")   items = items.filter(i => i.level === levelFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.service.toLowerCase().includes(q) ||
        i.message.toLowerCase().includes(q) ||
        i.report.toLowerCase().includes(q)
      );
    }
    return [...items].sort((a, b) => {
      let av: number | string = a[sortKey] as number | string;
      let bv: number | string = b[sortKey] as number | string;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [data, serviceFilter, levelFilter, search, sortKey, sortDir]);

  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = ["ID", "Timestamp", "Service", "Level", "Severity", "MTTR (s)", "Provider", "Cache Hit", "Message"];
    const rows = filtered.map(i => [
      i.id, i.timestamp, i.service, i.level, i.severity_score,
      i.mttr_seconds, i.provider, i.was_cache_hit ? "yes" : "no",
      `"${i.message.replace(/"/g, "'")}"`,
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "kairos_history.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ col }: { col: SortKey }) => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ opacity: sortKey === col ? 1 : 0.3, transform: sortKey === col && sortDir === "asc" ? "rotate(180deg)" : "none" }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );

  const summary = data?.summary;

  if (loading) return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)", paddingTop: 72, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"
          style={{ animation: "spin 0.8s linear infinite" }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>Loading incident history…</span>
      </div>
    </main>
  );

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-base)", paddingTop: 72 }}>
      <style>{`
        .th-btn { background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 5px;
          font-size: 10px; font-weight: 700; font-family: var(--font-mono); color: var(--text-muted);
          letter-spacing: 0.06em; text-transform: uppercase; padding: 0; transition: color 0.15s; }
        .th-btn:hover { color: var(--text-primary); }
        .row-expand { transition: background 0.15s; cursor: pointer; }
        .row-expand:hover { background: rgba(255,255,255,0.025) !important; }
      `}</style>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "36px 24px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "3px 10px", borderRadius: 20,
              background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.2)", marginBottom: 10,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)" }} />
              <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent)", letterSpacing: "0.08em" }}>
                INCIDENT HISTORY
              </span>
            </div>
            <h1 style={{
              fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, letterSpacing: "-0.04em",
              fontFamily: "var(--font-ui)", color: "var(--text-primary)", margin: 0,
            }}>
              Resolved Incidents
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "var(--font-ui)", marginTop: 6 }}>
              {data?.total ?? 0} incidents this session · auto-refreshes every 5s
            </p>
          </div>
          <button
            onClick={exportCSV}
            disabled={!filtered.length}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 16px", borderRadius: 8,
              background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, fontFamily: "var(--font-ui)",
              cursor: filtered.length ? "pointer" : "default", opacity: filtered.length ? 1 : 0.4,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { if (filtered.length) { (e.currentTarget as HTMLElement).style.borderColor = "rgba(79,142,247,0.35)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; } }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-subtle)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export CSV
          </button>
        </div>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)", marginBottom: 20 }}>
            <span style={{ fontSize: 12, color: "#f87171", fontFamily: "var(--font-ui)" }}>{error}</span>
          </div>
        )}

        {/* Stats bar */}
        {summary && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr) 200px", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Total Incidents",    value: String(data?.total ?? 0),                         sub: "this session",         color: "var(--accent)" },
              { label: "Avg MTTR",           value: fmtMTTR(summary.avg_mttr_seconds),                sub: `min ${fmtMTTR(summary.min_mttr_seconds)}`,  color: "#34d399" },
              { label: "Cache Hit Rate",     value: `${summary.cache_hit_rate_pct}%`,                 sub: "served from Redis",    color: "#a78bfa" },
              { label: "Most Impacted",      value: summary.worst_service ?? "—",                     sub: "by incident count",    color: "#f87171" },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="glass-panel" style={{ padding: "14px 16px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--font-mono)", color, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-ui)", marginTop: 4 }}>{sub}</div>
              </div>
            ))}
            {/* Sparkline card */}
            <div className="glass-panel" style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: 8 }}>MTTR TREND</div>
              <MTTRSparkline series={summary.mttr_series} width={164} height={36} />
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search service, error message, or RCA…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "7px 12px 7px 30px",
                background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-default)",
                borderRadius: 8, color: "var(--text-primary)", fontSize: 12,
                fontFamily: "var(--font-ui)", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Service filter */}
          <select
            value={serviceFilter}
            onChange={e => setServiceFilter(e.target.value)}
            style={{
              padding: "7px 12px", borderRadius: 8,
              background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-default)",
              color: "var(--text-primary)", fontSize: 12, fontFamily: "var(--font-ui)",
              outline: "none", cursor: "pointer",
            }}
          >
            <option value="ALL">All Services</option>
            {(data?.summary.services ?? []).map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Level filter pills */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {["ALL", "CRITICAL", "ERROR", "WARN"].map(lvl => {
              const colors: Record<string, string> = { CRITICAL: "#f87171", ERROR: "#fb923c", WARN: "#fbbf24", ALL: "var(--accent)" };
              const active = levelFilter === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => setLevelFilter(lvl)}
                  style={{
                    padding: "5px 12px", borderRadius: 20,
                    fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "0.06em",
                    cursor: "pointer",
                    color: active ? colors[lvl] : "var(--text-muted)",
                    background: active ? `rgba(${lvl === "ALL" ? "79,142,247" : lvl === "CRITICAL" ? "248,113,113" : lvl === "ERROR" ? "251,146,60" : "251,191,36"},0.12)` : "transparent",
                    border: active ? `1px solid rgba(${lvl === "ALL" ? "79,142,247" : lvl === "CRITICAL" ? "248,113,113" : lvl === "ERROR" ? "251,146,60" : "251,191,36"},0.35)` : "1px solid var(--border-subtle)",
                    transition: "all 0.15s",
                  }}
                >
                  {lvl}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <EmptyState hasData={(data?.total ?? 0) > 0} />
        ) : (
          <div className="glass-panel" style={{ overflow: "hidden" }}>
            {/* Table header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "90px 130px 140px 60px 1fr 70px 90px 32px",
              gap: 0,
              padding: "10px 16px",
              borderBottom: "1px solid var(--border-subtle)",
              background: "rgba(255,255,255,0.02)",
            }}>
              {[
                { label: "Time",     key: "timestamp"      as SortKey },
                { label: "Service",  key: "service"        as SortKey },
                { label: "Level",    key: null                        },
                { label: "Severity", key: "severity_score" as SortKey },
                { label: "Error",    key: null                        },
                { label: "MTTR",     key: "mttr_seconds"   as SortKey },
                { label: "Provider", key: null                        },
                { label: "",         key: null                        },
              ].map(({ label, key }, i) => (
                <div key={i}>
                  {key ? (
                    <button className="th-btn" onClick={() => handleSort(key)}>
                      {label} <SortIcon col={key} />
                    </button>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Rows */}
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              {filtered.map(inc => {
                const expanded = expandedId === inc.id;
                const sColor = severityColor(inc.level, inc.severity_score);
                return (
                  <div key={inc.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    {/* Main row */}
                    <div
                      className="row-expand"
                      onClick={() => setExpandedId(expanded ? null : inc.id)}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "90px 130px 140px 60px 1fr 70px 90px 32px",
                        gap: 0,
                        padding: "11px 16px",
                        background: expanded ? "rgba(79,142,247,0.04)" : "transparent",
                        alignItems: "center",
                      }}
                    >
                      {/* Time */}
                      <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        {fmtTime(inc.timestamp).split(", ")[1] ?? fmtTime(inc.timestamp)}
                      </span>

                      {/* Service */}
                      <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-ui)", color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                        {inc.service}
                      </span>

                      {/* Level badge */}
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "2px 8px", borderRadius: 20,
                        background: `rgba(${inc.level === "CRITICAL" ? "248,113,113" : inc.level === "ERROR" ? "251,146,60" : "251,191,36"},0.1)`,
                        border: `1px solid rgba(${inc.level === "CRITICAL" ? "248,113,113" : inc.level === "ERROR" ? "251,146,60" : "251,191,36"},0.3)`,
                        fontSize: 9, fontWeight: 700, fontFamily: "var(--font-mono)", color: sColor,
                        letterSpacing: "0.06em", width: "fit-content",
                      }}>
                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: sColor }} />
                        {inc.level}
                      </span>

                      {/* Severity bar */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${inc.severity_score}%`, background: sColor, borderRadius: 2, transition: "width 0.5s ease" }} />
                        </div>
                        <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>{inc.severity_score}</span>
                      </div>

                      {/* Error message */}
                      <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-ui)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {inc.message}
                      </span>

                      {/* MTTR */}
                      <span style={{
                        fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 600,
                        color: inc.was_cache_hit ? "#34d399" : inc.mttr_seconds < 30 ? "#34d399" : inc.mttr_seconds < 120 ? "#fbbf24" : "#f87171",
                      }}>
                        {inc.was_cache_hit ? "~5ms" : fmtMTTR(inc.mttr_seconds)}
                      </span>

                      {/* Provider */}
                      <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        {inc.provider}
                        {inc.was_cache_hit && (
                          <span style={{ marginLeft: 4, color: "#34d399" }}>⚡</span>
                        )}
                      </span>

                      {/* Expand chevron */}
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: expanded ? "var(--accent)" : "var(--text-muted)",
                        transform: expanded ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s ease, color 0.15s",
                      }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </div>
                    </div>

                    {/* Expanded RCA */}
                    {expanded && <RCAPanel report={inc.report} />}
                  </div>
                );
              })}
            </div>

            {/* Footer count */}
            <div style={{
              padding: "10px 16px",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
                Showing {filtered.length} of {data?.total ?? 0} incidents
              </span>
              <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-muted)", letterSpacing: "0.04em" }}>
                KAIROS · SESSION MEMORY · maxlen=100
              </span>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function EmptyState({ hasData }: { hasData: boolean }) {
  return (
    <div className="glass-panel" style={{ padding: "60px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: "rgba(79,142,247,0.07)", border: "1px solid rgba(79,142,247,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)",
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
        </svg>
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "var(--font-ui)", marginBottom: 6 }}>
          {hasData ? "No incidents match your filters" : "No incidents recorded yet"}
        </p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-ui)" }}>
          {hasData ? "Try clearing the service or level filter." : "Go to the Cockpit and fire a demo incident — it will appear here after the RCA completes."}
        </p>
      </div>
    </div>
  );
}
