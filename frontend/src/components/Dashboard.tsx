"use client";

import { useEffect, useRef, useState, memo } from "react";
import { format } from "date-fns";
import {
  Activity, ShieldAlert, Cpu, Terminal, Zap, ShieldCheck,
  Database, Search, Wrench, FileText, XCircle, Clock,
  AlertTriangle, CheckCircle, Radio,
} from "lucide-react";
import BlastRadiusPanel from "./BlastRadiusPanel";
import ChatOpsPanel from "./ChatOpsPanel";
import MockDataBanner from "./MockDataBanner";
import { useKairos } from "./KairosContext";

import type { LogEvent, AgentStep, RCAEvent, SimilarIncident } from "./KairosContext";

function getStepColor(node: string, status: string): string {
  if (node === "done")         return "#34d399";
  if (node === "start")        return "#fbbf24";
  if (node === "investigator") return "#60a5fa";
  if (node === "tool")         return "#34d399";
  if (node === "critic" && status === "rejected") return "#fb923c";
  if (node === "critic")       return "#a78bfa";
  if (node === "cache")        return "#fbbf24";
  if (node === "fallback")     return "#7dd3fc";
  return "#64748b";
}

function getStepIcon(node: string, status: string) {
  const s = 11;
  if (node === "investigator")                    return <Search size={s} />;
  if (node === "tool")                            return <Wrench size={s} />;
  if (node === "critic" && status === "rejected") return <XCircle size={s} />;
  if (node === "critic" && status === "approved") return <CheckCircle size={s} />;
  if (node === "critic")                          return <Activity size={s} />;
  if (node === "cache")                           return <Zap size={s} />;
  if (node === "fallback")                        return <ShieldAlert size={s} />;
  if (node === "done")                            return <CheckCircle size={s} />;
  if (node === "start")                           return <Radio size={s} />;
  return <FileText size={s} />;
}

function parseRCA(text: string) {
  const rcaMatch  = text.match(/\*\*1\.[^*]*\*\*[:.]?\s*([\s\S]*?)(?=\*\*2\.|$)/i);
  const fixMatch  = text.match(/\*\*2\.[^*]*\*\*[:.]?\s*([\s\S]*?)(?=\*\*3\.|$)/i);
  const prevMatch = text.match(/\*\*3\.[^*]*\*\*[:.]?\s*([\s\S]*?)(?=\*\*4\.|$)/i);
  const remMatch  = text.match(/\*\*4\.[^*]*\*\*[:.]?\s*([\s\S]*?)$/i);

  const parseCmd = (block: string, label: string): string => {
    // Handle triple-backtick fences: Label: ```bash\ncommand\n```
    const fence    = new RegExp(`${label}\\s*:\\s*\`\`\`(?:bash|sh|shell)?\\s*\\n([^\\n]+)`, "i");
    const backtick = new RegExp(`${label}\\s*:\\s*\`([^\`\\n]+)\``, "i");
    const plain    = new RegExp(`${label}\\s*:\\s*(.+)`, "i");
    const raw = (
      block.match(fence)?.[1] ??
      block.match(backtick)?.[1] ??
      block.match(plain)?.[1] ??
      ""
    ).trim();
    return raw.replace(/^`+(?:bash|sh|shell)?\s*/i, "").trim();
  };

  const remBlock = remMatch?.[1] ?? "";
  return {
    rootCause:  rcaMatch?.[1]?.trim()  || text.split("\n\n")[0] || text,
    fix:        fixMatch?.[1]?.trim()  || "",
    prevention: prevMatch?.[1]?.trim() || "",
    remediation: {
      immediate: parseCmd(remBlock, "immediate"),
      rollback:  parseCmd(remBlock, "rollback"),
      verify:    parseCmd(remBlock, "verify"),
    },
  };
}

/* ── Sub-components ──────────────────────────────────────────────────────── */
const MetricCard = memo(function MetricCard({
  value, label, color, icon: Icon, unit,
}: {
  value: number | string; label: string; color: string;
  icon: React.ComponentType<{ size?: number }>; unit?: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-icon-wrap" style={{ background: `${color}15`, color }}>
        <Icon size={17} />
      </div>
      <div>
        <div className="metric-value" style={{ color }}>
          {typeof value === "number" ? value.toLocaleString() : value}
          {unit && <span className="metric-unit"> {unit}</span>}
        </div>
        <div className="metric-label">{label}</div>
      </div>
    </div>
  );
});

const LogEntry = memo(function LogEntry({ log }: { log: LogEvent }) {
  const level = log.level?.toUpperCase() ?? "INFO";
  const cls =
    level === "CRITICAL" ? "critical" :
    level === "ERROR"    ? "error"    :
    level === "WARN"     ? "warn"     :
    level === "STORM"    ? "storm"    : "info";
  let ts = "";
  try { ts = format(new Date(log.timestamp), "HH:mm:ss.SSS"); } catch {}
  return (
    <div className={`log-entry ${cls}`}>
      <div className="log-header">
        <span className="log-lvl">{level}</span>
        <span className="log-svc">{log.service}</span>
        <span className="log-ts">{ts}</span>
      </div>
      <p className="log-msg">{log.message}</p>
    </div>
  );
});

const EmptyState = memo(function EmptyState({ icon: Icon, title, sub }: {
  icon: React.ComponentType<{ size?: number }>; title: string; sub?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon-wrap"><Icon size={18} /></div>
      <div className="empty-title">{title}</div>
      {sub && <div className="empty-sub">{sub}</div>}
    </div>
  );
});

const RemediationPlaybook = memo(function RemediationPlaybook({
  remediation,
}: {
  remediation: { immediate: string; rollback: string; verify: string };
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (cmd: string, label: string) => {
    navigator.clipboard.writeText(cmd).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1600);
    });
  };

  const commands = [
    { label: "Immediate", cmd: remediation.immediate, color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)" },
    { label: "Rollback",  cmd: remediation.rollback,  color: "#fbbf24", bg: "rgba(251,191,36,0.06)",  border: "rgba(251,191,36,0.2)"  },
    { label: "Verify",    cmd: remediation.verify,    color: "#34d399", bg: "rgba(52,211,153,0.06)",  border: "rgba(52,211,153,0.2)"  },
  ].filter(c => c.cmd);

  if (commands.length === 0) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#4f8ef7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
        </svg>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
          color: "#4f8ef7", fontFamily: "var(--font-mono)", textTransform: "uppercase",
        }}>Remediation Playbook</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {commands.map(({ label, cmd, color, bg, border }) => (
          <div key={label} style={{
            background: bg, border: `1px solid ${border}`, borderRadius: 7,
            padding: "8px 12px", display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{
              fontSize: 9, fontWeight: 700, fontFamily: "var(--font-mono)",
              letterSpacing: "0.1em", textTransform: "uppercase",
              color, flexShrink: 0, minWidth: 60,
            }}>{label}</span>
            <code style={{
              flex: 1, fontSize: 11, fontFamily: "var(--font-mono)",
              color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap",
              overflow: "hidden", textOverflow: "ellipsis", background: "none", border: "none",
            }}>{cmd}</code>
            <button
              onClick={() => copy(cmd, label)}
              style={{
                flexShrink: 0, padding: "3px 9px", borderRadius: 4,
                fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 600,
                letterSpacing: "0.04em", cursor: "pointer",
                background: copied === label ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${copied === label ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.1)"}`,
                color: copied === label ? "#34d399" : "var(--text-muted)",
                transition: "all 0.15s ease",
              }}
            >{copied === label ? "Copied!" : "Copy"}</button>
          </div>
        ))}
      </div>
    </div>
  );
});

const RCACard = memo(function RCACard({ report }: { report: RCAEvent }) {
  const parsed = parseRCA(report.report);
  let ts = "";
  try { ts = format(new Date(report.timestamp), "HH:mm:ss"); } catch {}
  return (
    <div className="rca-card">
      <div className="rca-card-header">
        <div className="rca-header-row">
          <span className="rca-sev-badge">SEV-{report.severity_score}</span>
          <span className="rca-service-name">{report.service}</span>
          <span className="rca-mode-badge">LangGraph</span>
        </div>
        <div className="rca-stats-row" style={{ marginTop: 4 }}>
          <span className="rca-mttr">MTTR: {report.mttr_seconds}s</span>
          <span className="rca-timestamp">{ts}</span>
        </div>
      </div>
      <div className="rca-error-block">{report.error}</div>
      <div className="rca-sections">
        {parsed.rootCause && (
          <div className="rca-section">
            <div className="rca-sec-hdr"><span className="rca-sec-tag red">Root Cause</span></div>
            <p className="rca-sec-body">{parsed.rootCause}</p>
          </div>
        )}
        {parsed.fix && (
          <div className="rca-section">
            <div className="rca-sec-hdr"><span className="rca-sec-tag cyan">Actionable Fix</span></div>
            <p className="rca-sec-body">{parsed.fix}</p>
          </div>
        )}
        {parsed.prevention && (
          <div className="rca-section">
            <div className="rca-sec-hdr"><span className="rca-sec-tag emerald">Prevention</span></div>
            <p className="rca-sec-body">{parsed.prevention}</p>
          </div>
        )}
      </div>
      <RemediationPlaybook remediation={parsed.remediation} />
      {report.similar_incidents?.length > 0 && (
        <div className="rca-history">
          <div className="rca-hist-hdr"><Database size={10} />Historical Context</div>
          {report.similar_incidents.map((inc, i) => (
            <div key={i} className="rca-hist-item">
              <div className="rca-hist-meta">
                <span className="rca-hist-match">{inc.similarity_pct}% Match</span>
                <span className="rca-hist-svc">{inc.service}</span>
              </div>
              <p className="rca-hist-doc">{inc.document}</p>
              <p className="rca-hist-fix">Fix: {inc.resolution}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

/* ── Main Dashboard ────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { logs, agentSteps, rcaReports: reports, metrics, failingService } = useKairos();

  const logsContainerRef  = useRef<HTMLDivElement>(null);
  const stepsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logsContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [logs]);

  useEffect(() => {
    const el = stepsContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [agentSteps]);

  return (
    <div id="cockpit" style={{ maxWidth: 1440, margin: "0 auto", width: "100%", paddingBottom: 80 }}>

      <MockDataBanner onConnect={() => window.dispatchEvent(new CustomEvent("open-integration-hub"))} />

      <div className="metrics-row">
        <MetricCard value={metrics.logs_ingested}            label="Logs Ingested"  color="#60a5fa" icon={Activity}     />
        <MetricCard value={metrics.anomalies_detected}       label="Anomalies"      color="#f87171" icon={AlertTriangle}/>
        <MetricCard value={metrics.rcas_generated}           label="RCAs Generated" color="#34d399" icon={ShieldCheck}  />
        <MetricCard value={metrics.cache_hits}               label="Cache Hits"     color="#fbbf24" icon={Zap}          />
        <MetricCard value={metrics.total_time_saved_minutes} label="Time Saved"     color="#34d399" icon={Clock} unit="min" />
      </div>

      <ChatOpsPanel />

      <div className="cockpit-grid">

        <div className="cockpit-col">
          <BlastRadiusPanel failingService={failingService} />
          <div className="glass-panel" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
            <div className="panel-header">
              <div className="panel-header-left">
                <Terminal size={13} style={{ color: "#60a5fa" }} />
                <span className="panel-title">Live Firehose</span>
              </div>
              <span className="badge-count">{logs.length}</span>
            </div>
            <div ref={logsContainerRef} className="panel-body scrollable" style={{ fontFamily: "var(--font-mono)", padding: "8px" }}>
              {logs.length === 0
                ? <EmptyState icon={Terminal} title="Awaiting Logs" sub="WebSocket connected" />
                : logs.map(log => <LogEntry key={log.id} log={log} />)
              }
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
          <div className="panel-header">
            <div className="panel-header-left">
              <Cpu size={13} style={{ color: "#a78bfa" }} />
              <span className="panel-title">Agent Reasoning</span>
            </div>
            <span className="badge-live">LangGraph</span>
          </div>
          <div ref={stepsContainerRef} className="panel-body scrollable" style={{ padding: "14px" }}>
            {agentSteps.length === 0
              ? <EmptyState icon={Cpu} title="LLM Idle" sub="Monitoring logs for anomalies" />
              : (
                <div className="timeline">
                  {agentSteps.map((step, idx) => {
                    const color  = getStepColor(step.node, step.status);
                    const isLast = idx === agentSteps.length - 1;
                    return (
                      <div key={step.id} className="timeline-item">
                        <div className="timeline-track">
                          <div className="timeline-dot" style={{ borderColor: color, color }}>
                            {getStepIcon(step.node, step.status)}
                          </div>
                          {!isLast && <div className="timeline-line" />}
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-node-tag" style={{ color }}>
                            {step.node === "cache" ? "SEMANTIC CACHE" : step.node.toUpperCase()}
                          </div>
                          <p className="timeline-text">{step.label}</p>
                          {step.content && <pre className="timeline-code">{step.content.slice(0, 300)}</pre>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>
        </div>

        <div className="glass-panel" style={{ display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
          <div className="panel-header">
            <div className="panel-header-left">
              <ShieldAlert size={13} style={{ color: "#f87171" }} />
              <span className="panel-title">Generated RCAs</span>
            </div>
            <span className="badge-count">{reports.length}</span>
          </div>
          <div className="panel-body scrollable" style={{ padding: "10px" }}>
            {reports.length === 0
              ? <EmptyState icon={ShieldCheck} title="No Active Incidents" sub="All services nominal" />
              : reports.map(report => <RCACard key={report.id} report={report} />)
            }
          </div>
        </div>

      </div>
    </div>
  );
}
