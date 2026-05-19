# Kairos — Autonomous Incident Intelligence

**Kairos** is an AI-native Site Reliability Engineering tool that watches your production logs, detects anomalies in real-time, and delivers validated Root Cause Analysis reports in seconds — powered by a self-reflective LangGraph multi-agent loop running entirely on your infrastructure.

> *Kairos* (Greek: καιρός) — the decisive, opportune moment. The exact instant when conditions demand action.

**GitHub:** https://github.com/Sahith59/LogSage · [Report an issue](https://github.com/Sahith59/LogSage/issues) · [Open a PR](https://github.com/Sahith59/LogSage/pulls)

---

## What it does

When an anomaly hits, Kairos runs a full autonomous investigation pipeline:

1. **Ingests** the log entry via HTTP API, Python handler, Logstash, or Fluent Bit
2. **Detects** the anomaly using keyword + level analysis with storm deduplication
3. **Searches** ChromaDB for semantically similar past incidents (vector RAG)
4. **Queries** Neo4j for upstream service dependencies (GraphRAG blast radius)
5. **Runs** a LangGraph Investigator → Critic loop with live tool calls
6. **Delivers** a 4-section validated RCA with remediation commands in the cockpit UI — streamed live via WebSocket

Human SRE MTTR: ~23 minutes · **Kairos MTTR: ~8 seconds**

---

## Features

### Core Pipeline
- **Real-time anomaly detection** — keyword + severity scoring, 0-100 severity scale
- **Error storm deduplication** — identical errors within 60s are suppressed after 5 occurrences
- **Semantic cache** — Redis caches RCA results for identical incidents (~5ms response on cache hit)
- **GraphRAG** — Neo4j maps service dependency graph; Investigator gets blast radius context automatically
- **Vector RAG** — ChromaDB stores past incidents; top-3 similar incidents inform every new RCA

### LangGraph Multi-Agent Loop
- **Investigator node** — drafts RCA using LLM + 3 diagnostic tools (health check, DB latency, pod restart)
- **Tool node** — executes Investigator's tool calls against simulated infrastructure metrics
- **Critic node** — validates draft for hallucinations, completeness, and concrete evidence; rejects with feedback for up to 2 revision cycles
- **Live streaming** — every node transition is broadcast via WebSocket to the Agent Mind page

### Persistent State Architecture (`KairosContext`)
- Single WebSocket connection shared across all pages — opened once at app load, never reset on navigation
- All shared state (logs, RCAs, agent events, metrics) lives in `KairosContext` at layout level
- Navigating between Cockpit, Agent Mind, and History never clears in-flight or completed incident data
- Agent event deduplication — consecutive identical `agent_step` events (same node + label) are suppressed at the context layer, eliminating duplicate cache-hit spam

### Incident Intelligence (ChatOps)
- Natural language query over the incident knowledge base
- RAG-powered: vector search over past incidents, fed as context to the LLM
- "Which service fails most often?", "What's the fix for connection pool exhaustion?" — answered in 2-3 sentences

### Auto-Remediation Playbook
- Every RCA includes a Section 4 with 3 kubectl commands: Immediate / Rollback / Verify
- One-click copy buttons in the UI
- Commands are specific to the root cause — DB issues get DB commands, not generic restarts

### Incident History Page (`/history`)
- Full session log of every resolved incident (maxlen=100)
- Sortable table: time, service, severity, MTTR
- Service and severity filters + full-text search
- Click any row to inline-expand the full parsed RCA
- MTTR sparkline SVG — green trending down, red trending up
- Stats bar: total incidents, avg MTTR, cache hit rate, most impacted service
- Export to CSV

### LLM Settings UI
- Change the LLM provider/model from the UI without touching code
- Provider cards: Ollama (local), Groq (fast), OpenAI, Anthropic
- API key masked with show/hide toggle — stored in server RAM only, never written to disk
- Apply & Test button with live connection status
- Hot-swap recompiles the LangGraph graph at runtime

### Agent Mind Page (`/agent`)
- Live WebSocket timeline of every agent step: Investigator thoughts, tool calls, Critic verdicts
- Color-coded by node type
- Pipeline summary sidebar: event counts, revisions, approved/rejected verdict
- State persists across navigation — events accumulate for the full session

### FAQ Page (`/faq`)
- 6 accordion items: API key safety, log integration, LLM choice, multi-user, server restarts, deployment

### Nav & GitHub Link
- GitHub icon in the navbar links to the repo for issue reports and pull requests
- Gear icon opens LLM Settings drawer
- Integrate button opens the log integration hub

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, CSS variables, glass morphism |
| **Backend** | FastAPI, Python 3.11, uvicorn |
| **Agent** | LangGraph 0.2+, LangChain 0.3+ |
| **LLMs** | Ollama (local), Groq, OpenAI, Anthropic (hot-swappable) |
| **Vector DB** | ChromaDB (in-process, persistent volume) |
| **Cache** | Redis (semantic result cache, 5-minute TTL) |
| **Graph DB** | Neo4j 5.20 (service dependency GraphRAG) |
| **Container** | Docker Compose |
| **Deployment** | Railway, Docker Compose, bare VM |

---

## Running locally

### Prerequisites
- Docker + Docker Compose
- Ollama running locally with at least one model (`mistral:7b` recommended)

```bash
# Pull a model
ollama pull mistral:7b

# Clone the repo
git clone https://github.com/Sahith59/LogSage
cd LogSage

# Start everything
docker-compose up --build -d
```

Frontend: http://localhost:3000  
Backend API: http://localhost:8001  
API docs: http://localhost:8001/docs

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama endpoint |
| `OLLAMA_MODEL` | `mistral:7b` | Default model |
| `GROQ_API_KEY` | — | Groq API key (overrides Ollama if set) |
| `REDIS_HOST` | `localhost` | Redis host |
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j connection URI |
| `NEO4J_USER` | `neo4j` | Neo4j username |
| `NEO4J_PASSWORD` | `password` | Neo4j password |

### LLM priority order
1. If `GROQ_API_KEY` is set → Groq (cloud, fast, ~1s)
2. If Ollama is reachable → Ollama (local, private, ~8-30s)
3. Otherwise → Smart fallback (pre-validated RCA templates, no LLM needed)

---

## Demo mode

On first launch, Kairos runs on **demo data** — a seeded ChromaDB with historical incident scenarios. A banner in the cockpit makes this clear. Fire a demo incident with the hero section button or via:

```bash
curl -X POST http://localhost:8001/demo
```

This triggers a realistic 5-service cascade: PaymentService DB pool exhaustion → OrderService NullPointerException → APIGateway 502. The full pipeline runs end-to-end in ~8-30s depending on your LLM.

---

## Connecting real logs

### HTTP API (any stack)
```bash
curl -X POST http://localhost:8001/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "service_name": "PaymentService",
    "level": "ERROR",
    "message": "Database connection timeout after 30s — pool exhausted (10/10)"
  }'
```

### Python (drop-in logging handler)
```python
import requests, logging

class KairosHandler(logging.Handler):
    def emit(self, record):
        if record.levelno >= logging.ERROR:
            requests.post("http://localhost:8001/ingest", json={
                "service_name": "my-service",
                "level": record.levelname,
                "message": self.format(record),
            }, timeout=5)

logging.getLogger("my-service").addHandler(KairosHandler())
```

See the Integration Hub in the UI for Logstash and Fluent Bit configs.

---

## Deployment

### Railway (one-click)
Set environment variables in the Railway dashboard and deploy. `railway.json` is included.

```
GROQ_API_KEY=gsk_...
REDIS_HOST=your-redis-host
NEO4J_URI=bolt://your-neo4j
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
```

### Docker Compose (any VM)
```bash
docker-compose up -d
```

All 4 services (FastAPI backend, Next.js frontend, Redis, Neo4j) start together with health checks and restart policies.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/ingest` | Ingest a single log entry |
| `POST` | `/ingest/batch` | Ingest up to 50 logs |
| `POST` | `/demo` | Fire the 5-service demo scenario |
| `POST` | `/query` | Natural language query over incident KB |
| `GET` | `/history` | Resolved incident history (last 100) |
| `GET` | `/metrics` | Live operational counters |
| `GET` | `/health` | Component health check |
| `GET` | `/models` | Active LLM + available Ollama models |
| `GET` | `/settings/llm` | Current LLM config |
| `POST` | `/settings/llm` | Hot-swap LLM provider/model |
| `DELETE` | `/settings/llm` | Clear LLM config |
| `WS` | `/ws` | WebSocket for real-time event streaming |

---

## Security note

API keys entered through the Settings UI are stored **in server process RAM only**. They are never written to disk, logged, inserted into any database, or transmitted beyond the LLM provider you select. The key is cleared automatically when the server restarts.

For production deployments, pass credentials as environment variables — they are loaded at startup and follow the same in-memory-only guarantee.

---

## Architecture

```
Browser (Next.js)
    │
    ├── KairosContext (layout-level)
    │       ├── Single WebSocket /ws ──────── Real-time event stream (persists across navigation)
    │       ├── Shared state: logs, RCAs, agentEvents, metrics
    │       └── Agent event deduplication (consecutive same-node suppressed)
    │
    ├── Cockpit (/) ──────────────────────── Reads from KairosContext
    ├── Agent Mind (/agent) ──────────────── Reads from KairosContext
    ├── History (/history) ───────────────── Polls GET /history
    └── FAQ (/faq)

FastAPI Backend
    │
    ├── Storm Detector ────────────────────── Deduplication (60s window, threshold=5)
    ├── Severity Scorer ───────────────────── 0-100 score (service weight × level × keywords)
    │
    ├── ChromaDB ──────────────────────────── Vector search (top-3 similar incidents)
    ├── Neo4j ─────────────────────────────── GraphRAG (service dependency blast radius)
    ├── Redis ─────────────────────────────── Semantic cache (MD5 key, 5-min TTL)
    │
    └── LangGraph Agent
            │
            ├── Investigator node ──────────── Drafts RCA, calls tools
            ├── Tool node ──────────────────── check_service_health, query_db_latency, restart_pod
            └── Critic node ────────────────── Validates draft, rejects with feedback (max 2 cycles)
```

---

## Contributing

Issues and PRs welcome: https://github.com/Sahith59/LogSage/issues

---

Built by [Sahith Reddy Thummala](https://github.com/Sahith59) as a portfolio demonstration of Agentic System Engineering.  
LangGraph · FastAPI · Next.js · ChromaDB · Redis · Neo4j
