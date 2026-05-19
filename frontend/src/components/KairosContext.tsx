"use client";

import {
  createContext, useContext, useEffect, useRef, useState, useCallback,
  type ReactNode,
} from "react";

const WS_URL  = process.env.NEXT_PUBLIC_WS_URL  ?? "ws://localhost:8001/ws";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

/* ── Shared types ──────────────────────────────────────────────────────────── */
export type LogEvent = {
  id: string; service: string; level: string;
  message: string; timestamp: string; severity_score: number;
};
export type AgentStep = {
  id: string; node: string; status: string;
  label: string; content?: string; timestamp: number;
};
export type SimilarIncident = {
  rank: number; document: string; root_cause: string;
  resolution: string; service: string; similarity_pct: number;
};
export type RCAEvent = {
  id: string; service: string; error: string; report: string;
  severity_score: number; mttr_seconds: number;
  similar_incidents: SimilarIncident[]; timestamp: string;
};
export type Metrics = {
  logs_ingested: number; anomalies_detected: number;
  rcas_generated: number; cache_hits: number;
  avg_mttr_seconds: number; total_time_saved_minutes: number;
};
export type AgentEvent = {
  id: string; node: string; status: string;
  label: string; content?: string; ts: number;
};
export type AgentStats = {
  investigator: number; critic: number; tool: number; revisions: number;
};

/* ── Context shape ─────────────────────────────────────────────────────────── */
interface KairosCtx {
  // Cockpit
  logs: LogEvent[];
  agentSteps: AgentStep[];
  rcaReports: RCAEvent[];
  metrics: Metrics;
  failingService: string | null;
  // Agent Mind
  agentEvents: AgentEvent[];
  isAgentRunning: boolean;
  lastVerdict: "approved" | "rejected" | null;
  agentStats: AgentStats;
  // Actions
  fireDemo: () => void;
}

const KairosContext = createContext<KairosCtx | null>(null);

export function useKairos(): KairosCtx {
  const ctx = useContext(KairosContext);
  if (!ctx) throw new Error("useKairos must be used within KairosProvider");
  return ctx;
}

/* ── Provider ──────────────────────────────────────────────────────────────── */
export function KairosProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs]             = useState<LogEvent[]>([]);
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([]);
  const [rcaReports, setRcaReports] = useState<RCAEvent[]>([]);
  const [metrics, setMetrics]       = useState<Metrics>({
    logs_ingested: 0, anomalies_detected: 0, rcas_generated: 0,
    cache_hits: 0, avg_mttr_seconds: 0, total_time_saved_minutes: 0,
  });
  const [failingService, setFailingService] = useState<string | null>(null);

  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [lastVerdict, setLastVerdict] = useState<"approved" | "rejected" | null>(null);
  const [agentStats, setAgentStats]   = useState<AgentStats>({
    investigator: 0, critic: 0, tool: 0, revisions: 0,
  });

  const ws             = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Metrics polling — survives navigation
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/metrics`);
        if (!res.ok) return;
        const data: Metrics = await res.json();
        setMetrics(prev => (
          prev.logs_ingested            === data.logs_ingested &&
          prev.anomalies_detected       === data.anomalies_detected &&
          prev.rcas_generated           === data.rcas_generated &&
          prev.cache_hits               === data.cache_hits &&
          prev.total_time_saved_minutes === data.total_time_saved_minutes
            ? prev : data
        ));
      } catch {}
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);

  // Single WebSocket for the whole app — survives navigation
  useEffect(() => {
    const connect = () => {
      if (
        ws.current?.readyState === WebSocket.OPEN ||
        ws.current?.readyState === WebSocket.CONNECTING
      ) return;

      ws.current = new WebSocket(WS_URL);

      ws.current.onmessage = (e) => {
        try {
          const msg  = JSON.parse(e.data);
          const uuid = Math.random().toString(36).slice(2, 9);
          const t    = msg.type;

          if (t === "log_received" || t === "log_ingested") {
            setLogs(prev => [...prev, { id: uuid, ...msg.data }].slice(-100));

          } else if (t === "storm_detected") {
            setLogs(prev => [...prev, {
              id: uuid, service: msg.data.service, level: "STORM",
              message: msg.data.label ?? "Error storm suppressed",
              timestamp: new Date().toISOString(), severity_score: 0,
            }].slice(-100));

          } else if (t === "anomaly_detected") {
            setFailingService(msg.data.service);
            setIsAgentRunning(true);
            setAgentSteps([{
              id: uuid, node: "start", status: "running",
              label: `Anomaly detected in ${msg.data.service}`, timestamp: Date.now(),
            }]);

          } else if (t === "agent_step") {
            // Cockpit: append-ordered steps for the current investigation
            const step: AgentStep = { id: uuid, timestamp: Date.now(), ...msg.data };
            setAgentSteps(prev => [...prev, step].slice(-50));

            // Agent Mind: prepend-ordered, deduplicate consecutive identical steps
            const ev: AgentEvent = { id: uuid, ts: msg.data.ts ?? Date.now(), ...msg.data };
            setAgentEvents(prev => {
              if (prev.length > 0 && prev[0].node === ev.node && prev[0].label === ev.label) {
                return prev; // same node + label as last — skip
              }
              return [ev, ...prev].slice(0, 100);
            });
            setIsAgentRunning(true);

            setAgentStats(s => ({
              investigator: s.investigator + (ev.node === "investigator"                              ? 1 : 0),
              critic:       s.critic       + (ev.node === "critic"                                   ? 1 : 0),
              tool:         s.tool         + (ev.node === "tool"                                     ? 1 : 0),
              revisions:    s.revisions    + (ev.node === "critic" && ev.status === "rejected"       ? 1 : 0),
            }));

            if (ev.node === "critic" && ev.status === "approved") setLastVerdict("approved");
            if (ev.node === "critic" && ev.status === "rejected") setLastVerdict("rejected");

          } else if (t === "rca_complete" || t === "rca_generated") {
            setRcaReports(prev => [{ id: uuid, ...msg.data }, ...prev].slice(0, 10));
            setAgentSteps(prev => [...prev, {
              id: Math.random().toString(36).slice(2, 9),
              node: "done", status: "done", label: "RCA Generation Complete", timestamp: Date.now(),
            }]);
            setFailingService(null);
            setIsAgentRunning(false);
          }
        } catch {}
      };

      ws.current.onclose = () => {
        reconnectTimer.current = setTimeout(connect, 3000);
      };
    };

    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, []);

  const fireDemo = useCallback(() => {
    fetch(`${API_URL}/demo`, { method: "POST" }).catch(() => {});
    setAgentEvents([]);
    setAgentStats({ investigator: 0, critic: 0, tool: 0, revisions: 0 });
    setLastVerdict(null);
    setIsAgentRunning(true);
  }, []);

  return (
    <KairosContext.Provider value={{
      logs, agentSteps, rcaReports, metrics, failingService,
      agentEvents, isAgentRunning, lastVerdict, agentStats,
      fireDemo,
    }}>
      {children}
    </KairosContext.Provider>
  );
}
