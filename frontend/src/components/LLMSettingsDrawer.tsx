"use client";

import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

type Provider = "ollama" | "groq" | "openai" | "anthropic";

interface ProviderConfig {
  label: string;
  tag: string;
  tagColor: string;
  defaultModel: string;
  needsKey: boolean;
  needsBaseUrl: boolean;
  color: string;
  icon: React.ReactNode;
}

const PROVIDERS: Record<Provider, ProviderConfig> = {
  ollama: {
    label: "Ollama",
    tag: "LOCAL",
    tagColor: "#34d399",
    defaultModel: "mistral:7b",
    needsKey: false,
    needsBaseUrl: true,
    color: "#34d399",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
        <path d="M12 8v4l3 3"/>
      </svg>
    ),
  },
  groq: {
    label: "Groq",
    tag: "FAST",
    tagColor: "#fbbf24",
    defaultModel: "llama-3.1-8b-instant",
    needsKey: true,
    needsBaseUrl: false,
    color: "#fbbf24",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
  },
  openai: {
    label: "OpenAI",
    tag: "CLOUD",
    tagColor: "#a3e635",
    defaultModel: "gpt-4o",
    needsKey: true,
    needsBaseUrl: false,
    color: "#a3e635",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4M12 16h.01"/>
      </svg>
    ),
  },
  anthropic: {
    label: "Anthropic",
    tag: "CLOUD",
    tagColor: "#fb923c",
    defaultModel: "claude-3-5-haiku-20241022",
    needsKey: true,
    needsBaseUrl: false,
    color: "#fb923c",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2L2 19h20L12 2z"/>
        <path d="M12 9v5M12 16h.01"/>
      </svg>
    ),
  },
};

type ConnStatus = "idle" | "connecting" | "connected" | "error";

interface LLMSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function LLMSettingsDrawer({ open, onClose }: LLMSettingsDrawerProps) {
  const [provider, setProvider] = useState<Provider>("ollama");
  const [model, setModel] = useState("mistral:7b");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("http://localhost:11434");
  const [showKey, setShowKey] = useState(false);
  const [connStatus, setConnStatus] = useState<ConnStatus>("idle");
  const [connMsg, setConnMsg] = useState("");
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`${API_URL}/settings/llm`)
      .then(r => r.json())
      .then(d => {
        if (d.active_provider && d.active_provider !== "fallback") {
          setActiveProvider(d.active_provider);
          setActiveModel(d.active_model);
        }
      })
      .catch(() => {});
  }, [open]);

  const handleProviderClick = useCallback((p: Provider) => {
    setProvider(p);
    setModel(PROVIDERS[p].defaultModel);
    setApiKey("");
    setConnStatus("idle");
    setConnMsg("");
    if (p === "ollama") setBaseUrl("http://localhost:11434");
  }, []);

  const handleApply = async () => {
    setConnStatus("connecting");
    setConnMsg("");
    try {
      const body: Record<string, string> = { provider, model };
      if (PROVIDERS[provider].needsKey && apiKey) body.api_key = apiKey;
      if (PROVIDERS[provider].needsBaseUrl) body.base_url = baseUrl;

      const r = await fetch(`${API_URL}/settings/llm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (r.ok && d.status === "ok") {
        setConnStatus("connected");
        setConnMsg(d.message ?? "LLM configured successfully.");
        setActiveProvider(provider);
        setActiveModel(model);
      } else {
        setConnStatus("error");
        setConnMsg(d.detail ?? d.error ?? "Configuration failed.");
      }
    } catch (e) {
      setConnStatus("error");
      setConnMsg("Could not reach backend.");
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await fetch(`${API_URL}/settings/llm`, { method: "DELETE" });
      setActiveProvider(null);
      setActiveModel(null);
      setConnStatus("idle");
      setConnMsg("");
      setApiKey("");
    } finally {
      setClearing(false);
    }
  };

  const cfg = PROVIDERS[provider];

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
      />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 201,
        width: 420,
        background: "rgba(8,12,28,0.98)",
        backdropFilter: "blur(40px) saturate(180%)",
        borderLeft: "1px solid var(--border-subtle)",
        boxShadow: "-24px 0 80px rgba(0,0,0,0.6)",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 20px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: "rgba(79,142,247,0.1)",
              border: "1px solid rgba(79,142,247,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--accent)",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-ui)", letterSpacing: "-0.02em" }}>
                LLM Settings
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
                {activeProvider ? `ACTIVE · ${activeProvider.toUpperCase()} / ${activeModel}` : "NO LLM CONFIGURED"}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body (scrollable) */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

          {/* Provider selector */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", fontFamily: "var(--font-ui)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 10 }}>
              Provider
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(Object.keys(PROVIDERS) as Provider[]).map(p => {
                const c = PROVIDERS[p];
                const active = provider === p;
                return (
                  <button
                    key={p}
                    onClick={() => handleProviderClick(p)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      background: active ? `rgba(${hexToRgb(c.color)}, 0.08)` : "rgba(255,255,255,0.03)",
                      border: active
                        ? `1px solid rgba(${hexToRgb(c.color)}, 0.45)`
                        : "1px solid var(--border-subtle)",
                      boxShadow: active ? `0 0 18px rgba(${hexToRgb(c.color)}, 0.12)` : "none",
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: active ? c.color : "var(--text-muted)" }}>{c.icon}</span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, fontFamily: "var(--font-mono)",
                        color: c.tagColor, letterSpacing: "0.08em",
                        background: `rgba(${hexToRgb(c.tagColor)}, 0.1)`,
                        padding: "2px 5px", borderRadius: 3,
                      }}>{c.tag}</span>
                    </div>
                    <div style={{
                      fontSize: 12, fontWeight: 700, color: active ? "var(--text-primary)" : "var(--text-secondary)",
                      fontFamily: "var(--font-ui)", letterSpacing: "-0.01em",
                    }}>{c.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model field */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Model</label>
            <input
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder={cfg.defaultModel}
              style={inputStyle}
            />
          </div>

          {/* API Key — hidden for Ollama */}
          {cfg.needsKey && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>API Key</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="sk-••••••••••••••••"
                  style={{ ...inputStyle, paddingRight: 40 }}
                />
                <button
                  onClick={() => setShowKey(v => !v)}
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-muted)", padding: 2,
                    display: "flex", alignItems: "center",
                  }}
                >
                  {showKey ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Base URL — only for Ollama */}
          {cfg.needsBaseUrl && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Base URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder="http://localhost:11434"
                style={inputStyle}
              />
            </div>
          )}

          {/* Apply & Test button */}
          <button
            onClick={handleApply}
            disabled={connStatus === "connecting"}
            style={{
              width: "100%",
              padding: "11px 0",
              borderRadius: 9,
              marginTop: 6,
              background: connStatus === "connecting"
                ? "rgba(79,142,247,0.06)"
                : "rgba(79,142,247,0.12)",
              border: "1px solid rgba(79,142,247,0.3)",
              color: "#4f8ef7",
              fontSize: 13, fontWeight: 600, fontFamily: "var(--font-ui)",
              cursor: connStatus === "connecting" ? "default" : "pointer",
              letterSpacing: "0.02em",
              transition: "all 0.15s ease",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
            onMouseEnter={e => { if (connStatus !== "connecting") (e.currentTarget as HTMLElement).style.background = "rgba(79,142,247,0.2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = connStatus === "connecting" ? "rgba(79,142,247,0.06)" : "rgba(79,142,247,0.12)"; }}
          >
            {connStatus === "connecting" && <Spinner />}
            {connStatus === "connecting" ? "Connecting…" : "Apply & Test Connection"}
          </button>

          {/* Status message */}
          {connStatus !== "idle" && connStatus !== "connecting" && (
            <div style={{
              marginTop: 10,
              padding: "9px 12px",
              borderRadius: 8,
              background: connStatus === "connected" ? "rgba(52,211,153,0.07)" : "rgba(248,113,113,0.07)",
              border: `1px solid ${connStatus === "connected" ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)"}`,
              display: "flex", alignItems: "flex-start", gap: 8,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginTop: 4,
                background: connStatus === "connected" ? "#34d399" : "#f87171",
              }} />
              <span style={{
                fontSize: 11, fontFamily: "var(--font-mono)",
                color: connStatus === "connected" ? "#34d399" : "#f87171",
                lineHeight: 1.5,
              }}>{connMsg}</span>
            </div>
          )}

          {/* Divider */}
          <div style={{ margin: "20px 0", borderTop: "1px solid var(--border-subtle)" }} />

          {/* Security note */}
          <div style={{
            padding: "12px 14px",
            borderRadius: 9,
            background: "rgba(255,255,255,0.025)",
            border: "1px solid var(--border-subtle)",
            display: "flex", gap: 10, alignItems: "flex-start",
          }}>
            <div style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 1 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-ui)", lineHeight: 1.65, margin: 0 }}>
              Your API key is stored in <strong style={{ color: "var(--text-secondary)" }}>server RAM only</strong>. Never written to disk or any database. Cleared automatically on server restart.
            </p>
          </div>

          {/* Clear configuration */}
          <button
            onClick={handleClear}
            disabled={clearing}
            style={{
              width: "100%",
              padding: "9px 0",
              borderRadius: 8,
              marginTop: 10,
              background: "transparent",
              border: "1px solid rgba(248,113,113,0.2)",
              color: "rgba(248,113,113,0.6)",
              fontSize: 11, fontWeight: 600, fontFamily: "var(--font-ui)",
              cursor: clearing ? "default" : "pointer",
              letterSpacing: "0.04em",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(248,113,113,0.4)"; (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(248,113,113,0.2)"; (e.currentTarget as HTMLElement).style.color = "rgba(248,113,113,0.6)"; }}
          >
            {clearing ? "Clearing…" : "Clear Configuration"}
          </button>
        </div>
      </div>
    </>
  );
}

function Spinner() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ animation: "spin 0.8s linear infinite" }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r},${g},${b}`;
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
  fontFamily: "var(--font-ui)", letterSpacing: "0.06em",
  textTransform: "uppercase", display: "block", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--border-default)",
  color: "var(--text-primary)",
  fontSize: 12,
  fontFamily: "var(--font-mono)",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s ease",
};
