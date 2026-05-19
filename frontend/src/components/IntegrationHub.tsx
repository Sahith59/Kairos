"use client";

import { useState, useEffect } from "react";

interface IntegrationHubProps {
  open: boolean;
  onClose: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <button onClick={copy} style={{
      padding: "4px 10px", borderRadius: 6,
      fontSize: 11, fontWeight: 600,
      fontFamily: "var(--font-ui)",
      color: copied ? "var(--s-success)" : "var(--text-secondary)",
      border: `1px solid ${copied ? "rgba(52,211,153,0.3)" : "var(--border-subtle)"}`,
      background: copied ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.04)",
      cursor: "pointer",
      transition: "all 0.15s ease",
      letterSpacing: "0.02em",
    }}>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  return (
    <div style={{ position: "relative", marginTop: 12 }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "8px 14px",
        background: "rgba(0,0,0,0.3)",
        borderRadius: "8px 8px 0 0",
        borderBottom: "1px solid var(--border-subtle)",
      }}>
        <span style={{
          fontSize: 10, color: "var(--text-muted)",
          fontFamily: "var(--font-mono)", letterSpacing: "0.06em",
        }}>{lang ?? "bash"}</span>
        <CopyButton text={code} />
      </div>
      <pre style={{
        margin: 0, padding: "16px 14px",
        background: "rgba(0,0,0,0.35)",
        borderRadius: "0 0 8px 8px",
        border: "1px solid var(--border-subtle)",
        borderTop: "none",
        overflow: "auto",
        fontSize: 12,
        lineHeight: 1.65,
        color: "rgba(220,230,255,0.88)",
        fontFamily: "var(--font-mono)",
        whiteSpace: "pre",
      }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 12, color: "var(--text-muted)",
      fontFamily: "var(--font-ui)", lineHeight: 1.6,
      marginTop: 8,
    }}>{children}</p>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontSize: 13, fontWeight: 700,
      color: "var(--text-primary)", fontFamily: "var(--font-ui)",
      marginTop: 28, marginBottom: 4,
      letterSpacing: "-0.01em",
    }}>{children}</h3>
  );
}

const CURL_SINGLE = `curl -X POST ${API_URL}/ingest \\
  -H "Content-Type: application/json" \\
  -d '{
    "service_name": "PaymentService",
    "level": "ERROR",
    "message": "Database connection timeout after 30s — pool exhausted (10/10)"
  }'`;

const CURL_BATCH = `curl -X POST ${API_URL}/ingest/batch \\
  -H "Content-Type: application/json" \\
  -d '[
    {
      "service_name": "AuthService",
      "level": "ERROR",
      "message": "JWT validation failed — signing key mismatch"
    },
    {
      "service_name": "OrderService",
      "level": "CRITICAL",
      "message": "NullPointerException at OrderProcessor.java:45"
    }
  ]'`;

const PYTHON_CODE = `import requests
from datetime import datetime

KAIROS_URL = "${API_URL}"

def ingest_log(service_name: str, level: str, message: str):
    """Send a single log entry to Kairos for analysis."""
    response = requests.post(
        f"{KAIROS_URL}/ingest",
        json={
            "service_name": service_name,
            "level": level,
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
        },
        timeout=5,
    )
    return response.json()

# Hook into your exception handler
import logging

class KairosLogHandler(logging.Handler):
    def __init__(self, service_name: str):
        super().__init__()
        self.service_name = service_name

    def emit(self, record: logging.LogRecord):
        if record.levelno >= logging.ERROR:
            ingest_log(
                service_name=self.service_name,
                level=record.levelname,
                message=self.format(record),
            )

# Usage
logger = logging.getLogger("my-service")
logger.addHandler(KairosLogHandler("PaymentService"))`;

const LOGSTASH_CONFIG = `# logstash.conf — forward ERROR/CRITICAL logs to Kairos

filter {
  if [log][level] in ["error", "critical", "fatal"] {
    mutate {
      add_field => { "send_to_kairos" => true }
    }
  }
}

output {
  if [send_to_kairos] {
    http {
      url => "${API_URL}/ingest"
      http_method => "post"
      content_type => "application/json"
      format => "message"
      message => '{
        "service_name": "%{[service][name]}",
        "level": "%{[log][level]}",
        "message": "%{message}",
        "timestamp": "%{[@timestamp]}"
      }'
      retry_failed => true
      pool_max => 4
    }
  }
  # Keep your existing output (Elasticsearch, etc.)
  elasticsearch { ... }
}`;

const FLUENTBIT_CONFIG = `# fluent-bit.conf — tail container logs and forward errors to Kairos

[INPUT]
    Name              tail
    Path              /var/log/containers/*.log
    Parser            docker
    Tag               kube.*
    Refresh_Interval  5

[FILTER]
    Name   grep
    Match  kube.*
    Regex  log (ERROR|CRITICAL|FATAL|Exception|Timeout)

[OUTPUT]
    Name              http
    Match             kube.*
    Host              kairos-host   # or your Kairos IP
    Port              8001
    URI               /ingest
    Format            json
    Header            Content-Type application/json
    # Map Fluent Bit fields to Kairos schema via a Lua filter if needed`;

const PRODUCTION_SETUP = `# Production deployment (Railway / Render / Fly.io)
# Set these environment variables in your cloud dashboard:

GROQ_API_KEY=gsk_...         # Free at console.groq.com — replaces Ollama in cloud
REDIS_HOST=your-redis-host   # Railway Redis plugin or Upstash
NEO4J_URI=bolt://your-neo4j  # AuraDB free tier
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password

# Local dev — Ollama auto-detection (no key needed)
# Set OLLAMA_MODEL to override the default model selection:
OLLAMA_MODEL=mistral:7b      # or mixtral:8x7b, llama3.1, etc.
OLLAMA_BASE_URL=http://localhost:11434

# Verify your setup
curl ${API_URL}/health
curl ${API_URL}/models`;

const TABS = [
  { id: "http", label: "HTTP API" },
  { id: "python", label: "Python" },
  { id: "logstash", label: "Logstash" },
  { id: "fluentbit", label: "Fluent Bit" },
  { id: "production", label: "Production" },
];

export default function IntegrationHub({ open, onClose }: IntegrationHubProps) {
  const [tab, setTab] = useState("http");

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(6px)",
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        height: "82vh",
        zIndex: 201,
        display: "flex",
        flexDirection: "column",
        background: "rgba(6,8,22,0.97)",
        backdropFilter: "blur(40px) saturate(140%)",
        WebkitBackdropFilter: "blur(40px) saturate(140%)",
        borderTop: "1px solid var(--border-default)",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 -24px 80px rgba(0,0,0,0.6)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 28px 0",
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{
              fontSize: 18, fontWeight: 800,
              color: "var(--text-primary)", fontFamily: "var(--font-ui)",
              letterSpacing: "-0.025em",
            }}>
              Integration Hub
            </h2>
            <p style={{
              fontSize: 12, color: "var(--text-muted)",
              fontFamily: "var(--font-ui)", marginTop: 2,
            }}>
              Connect your production logs to Kairos — works with any stack
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: "1px solid var(--border-subtle)",
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-secondary)",
              fontSize: 18, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", gap: 2,
          padding: "16px 28px 0",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "7px 16px",
                borderRadius: "8px 8px 0 0",
                fontSize: 12, fontWeight: tab === t.id ? 600 : 500,
                fontFamily: "var(--font-ui)",
                color: tab === t.id ? "var(--text-primary)" : "var(--text-secondary)",
                background: tab === t.id ? "rgba(255,255,255,0.06)" : "transparent",
                border: "1px solid",
                borderColor: tab === t.id ? "var(--border-default)" : "transparent",
                borderBottom: tab === t.id ? "1px solid rgba(6,8,22,0.97)" : "1px solid transparent",
                cursor: "pointer",
                marginBottom: -1,
                transition: "all 0.12s ease",
                letterSpacing: "0.01em",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1, overflow: "auto",
          padding: "24px 28px 40px",
        }}>
          {tab === "http" && (
            <div>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 12px", borderRadius: 100,
                background: "rgba(52,211,153,0.08)",
                border: "1px solid rgba(52,211,153,0.2)",
                marginBottom: 16,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--s-success)", display: "block" }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--s-success)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
                  ENDPOINT: {API_URL}
                </span>
              </div>

              <SectionTitle>Single log ingestion</SectionTitle>
              <Label>Send any log line to Kairos. If it is an anomaly, it triggers the full multi-agent RCA pipeline automatically.</Label>
              <CodeBlock code={CURL_SINGLE} />

              <SectionTitle>Batch ingestion</SectionTitle>
              <Label>Send up to 50 log entries in one request. Each entry is processed independently — anomalies trigger their own RCA.</Label>
              <CodeBlock code={CURL_BATCH} />

              <SectionTitle>Health and model status</SectionTitle>
              <CodeBlock code={`curl ${API_URL}/health\ncurl ${API_URL}/models`} />

              <SectionTitle>Log schema</SectionTitle>
              <Label>All fields except service_name, level, and message are optional.</Label>
              <CodeBlock lang="json" code={`{
  "service_name": string,   // required — identifies the service
  "level":        string,   // required — INFO | WARN | ERROR | CRITICAL
  "message":      string,   // required — the log line content
  "timestamp":    string,   // optional — ISO 8601, defaults to now
  "metadata":     object    // optional — any extra key/value pairs
}`} />
            </div>
          )}

          {tab === "python" && (
            <div>
              <Label>
                Drop-in Python handler — works with Flask, FastAPI, Django, or any Python service.
                Errors automatically flow to Kairos without changing your existing logging setup.
              </Label>
              <CodeBlock lang="python" code={PYTHON_CODE} />
            </div>
          )}

          {tab === "logstash" && (
            <div>
              <Label>
                Add this output block to your existing Logstash pipeline. Only ERROR and CRITICAL level
                logs are forwarded — INFO and WARN stay local, reducing noise.
              </Label>
              <CodeBlock lang="ruby" code={LOGSTASH_CONFIG} />
              <SectionTitle>Note on field mapping</SectionTitle>
              <Label>
                Adjust <code style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: 12 }}>%&#123;[service][name]&#125;</code> and{" "}
                <code style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: 12 }}>%&#123;[log][level]&#125;</code> to match your Logstash field names.
                The only required fields are service_name, level, and message.
              </Label>
            </div>
          )}

          {tab === "fluentbit" && (
            <div>
              <Label>
                Fluent Bit is the standard log forwarder for Kubernetes. This config tails container logs,
                filters for errors, and forwards them to Kairos. Run as a DaemonSet alongside your services.
              </Label>
              <CodeBlock lang="ini" code={FLUENTBIT_CONFIG} />
              <SectionTitle>Kubernetes sidecar alternative</SectionTitle>
              <Label>
                If you prefer a per-pod approach, deploy Fluent Bit as a sidecar container that reads
                from the same log volume as your application container, then forwards to Kairos.
              </Label>
            </div>
          )}

          {tab === "production" && (
            <div>
              <Label>
                For cloud deployments, use Groq instead of Ollama — it is free, extremely fast (~300 token/s),
                and requires only an API key. Get one at console.groq.com. The backend automatically switches
                from Ollama to Groq when GROQ_API_KEY is set.
              </Label>
              <CodeBlock lang="bash" code={PRODUCTION_SETUP} />

              <SectionTitle>Architecture for production</SectionTitle>
              <div style={{
                marginTop: 12, padding: 16,
                background: "rgba(0,0,0,0.25)",
                borderRadius: 10,
                border: "1px solid var(--border-subtle)",
              }}>
                {[
                  { label: "LLM", local: "Ollama (mistral:7b, local)", cloud: "Groq API (llama-3.1-8b, free tier)" },
                  { label: "Cache", local: "Redis (localhost:6379)", cloud: "Railway Redis or Upstash" },
                  { label: "Graph", local: "Neo4j (localhost:7687)", cloud: "Neo4j AuraDB (free tier)" },
                  { label: "Vector", local: "ChromaDB (in-process)", cloud: "ChromaDB (in-process, persisted volume)" },
                ].map(row => (
                  <div key={row.label} style={{
                    display: "grid", gridTemplateColumns: "80px 1fr 1fr",
                    gap: 12, padding: "8px 0",
                    borderBottom: "1px solid var(--border-subtle)",
                    alignItems: "center",
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{row.label}</span>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "var(--font-ui)" }}>{row.local}</span>
                    <span style={{ fontSize: 11, color: "var(--accent)", fontFamily: "var(--font-ui)" }}>{row.cloud}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
