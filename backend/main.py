"""
Kairos FastAPI Backend
━━━━━━━━━━━━━━━━━━━━━
Endpoints:
  POST /ingest      — ingest a log entry
  POST /demo        — fire a scripted 5-service incident for demos
  GET  /health      — system component status
  GET  /metrics     — live counters and MTTR stats
  WS   /ws          — WebSocket for real-time event streaming
"""

import logging
import asyncio
import time
import os
from contextlib import asynccontextmanager
from datetime import datetime
from collections import defaultdict, deque
from typing import List, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from vector_store import search_incidents
from agent import analyze_anomaly, set_broadcast_fn, redis_client, neo4j_driver, LLM_PROVIDER, app_graph, OLLAMA_MODEL, critic_llm, reinitialize_llm, get_llm_status
import agent as _agent

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)


# ── In-Memory Metrics Store ───────────────────────────────────────────────────
class MetricsStore:
    def __init__(self):
        self.logs_ingested = 0
        self.anomalies_detected = 0
        self.rcas_generated = 0
        self.cache_hits = 0
        self.mttr_samples: deque = deque(maxlen=50)  # last 50 MTTR values in seconds
        self.anomaly_start_times: dict = {}           # service → start timestamp

    def record_anomaly_start(self, service: str):
        self.anomaly_start_times[service] = time.time()
        self.anomalies_detected += 1

    def record_rca_complete(self, service: str, was_cache_hit: bool = False):
        self.rcas_generated += 1
        if was_cache_hit:
            self.cache_hits += 1
            self.mttr_samples.append(0.005)  # ~5ms for cache hit
        elif service in self.anomaly_start_times:
            elapsed = time.time() - self.anomaly_start_times.pop(service, time.time())
            self.mttr_samples.append(round(elapsed, 2))

    @property
    def avg_mttr(self) -> float:
        if not self.mttr_samples:
            return 0.0
        return round(sum(self.mttr_samples) / len(self.mttr_samples), 1)

    @property
    def total_time_saved_minutes(self) -> float:
        """Industry average human SRE MTTR is ~23 minutes per incident."""
        HUMAN_MTTR_SECONDS = 23 * 60
        total_saved = sum(max(0, HUMAN_MTTR_SECONDS - s) for s in self.mttr_samples)
        return round(total_saved / 60, 1)


metrics = MetricsStore()

# ── Incident History ──────────────────────────────────────────────────────────
incident_history: deque = deque(maxlen=100)  # last 100 resolved incidents


# ── Error Storm Deduplication ─────────────────────────────────────────────────
class StormDetector:
    def __init__(self, window_seconds: int = 60, threshold: int = 5):
        self.window = window_seconds
        self.threshold = threshold
        self.fingerprint_times: dict = defaultdict(list)  # fingerprint → [timestamps]
        self.suppressed_counts: dict = defaultdict(int)

    def check_and_record(self, service: str, message: str) -> dict:
        """Returns {'is_storm': bool, 'suppressed_count': int, 'first_seen': bool}"""
        import hashlib
        fingerprint = hashlib.md5(f"{service}:{message[:80]}".encode()).hexdigest()[:12]
        now = time.time()

        # Prune old timestamps
        self.fingerprint_times[fingerprint] = [
            t for t in self.fingerprint_times[fingerprint]
            if now - t < self.window
        ]

        self.fingerprint_times[fingerprint].append(now)
        count = len(self.fingerprint_times[fingerprint])

        if count > self.threshold:
            self.suppressed_counts[fingerprint] += 1
            return {
                "is_storm": True,
                "suppressed_count": self.suppressed_counts[fingerprint],
                "fingerprint": fingerprint
            }

        self.suppressed_counts[fingerprint] = 0
        return {"is_storm": False, "suppressed_count": 0}


storm_detector = StormDetector()


# ── Service Severity Weights ──────────────────────────────────────────────────
SERVICE_WEIGHTS = {
    "PaymentService": 10,
    "AuthService": 9,
    "OrderService": 8,
    "APIGateway": 8,
    "UserService": 7,
    "InventoryService": 5,
    "NotificationService": 4,
    "SearchService": 4,
    "CacheService": 6,
    "AnalyticsService": 2,
}

ERROR_LEVEL_MULTIPLIERS = {"CRITICAL": 1.5, "ERROR": 1.0, "WARN": 0.5, "INFO": 0.0}


def compute_severity_score(service: str, level: str, message: str, upstream_count: int = 0) -> int:
    """Compute 0-100 severity score for an anomaly."""
    base = SERVICE_WEIGHTS.get(service, 5) * 8  # 0-80 from service criticality
    level_mult = ERROR_LEVEL_MULTIPLIERS.get(level.upper(), 0.5)
    keyword_boost = 5 if any(k in message.upper() for k in ["TIMEOUT", "CONNECTION", "OOM", "PANIC", "CRASH"]) else 0
    upstream_boost = min(upstream_count * 3, 15)  # up to 15 points for blast radius
    score = int(min(100, base * level_mult + keyword_boost + upstream_boost))
    return score


# ── WebSocket Manager ─────────────────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead = []
        for ws in self.active_connections:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


# ── Application Lifespan ──────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Kairos starting up...")

    # Wire broadcast function into agent
    set_broadcast_fn(manager.broadcast)

    # Seed Neo4j graph (service dependencies)
    await asyncio.to_thread(_seed_neo4j_graph)

    # Seed ChromaDB historical incidents
    try:
        from seed_incidents import seed_historical_incidents
        await asyncio.to_thread(seed_historical_incidents)
    except Exception as e:
        logger.error(f"Seed error: {e}")

    logger.info("Kairos ready.")
    yield

    # Shutdown
    logger.info("Kairos shutting down.")


def _seed_neo4j_graph():
    """Seed Neo4j with service dependency relationships."""
    if not neo4j_driver:
        logger.info("Neo4j offline — skipping graph seed.")
        return
    try:
        with neo4j_driver.session() as session:
            session.run("MATCH (n:Service) DETACH DELETE n")  # Clear first
            edges = [
                ("PaymentService", "PostgreSQL"),
                ("PaymentService", "AuthService"),
                ("OrderService", "PaymentService"),
                ("OrderService", "InventoryService"),
                ("AuthService", "UserService"),
                ("SearchService", "Elasticsearch"),
                ("CacheService", "Redis"),
                ("APIGateway", "AuthService"),
                ("APIGateway", "OrderService"),
                ("NotificationService", "SMTP"),
            ]
            for src, dst in edges:
                session.run(
                    "MERGE (a:Service {name: $src}) MERGE (b:Service {name: $dst}) MERGE (a)-[:DEPENDS_ON]->(b)",
                    src=src, dst=dst
                )
        logger.info("Neo4j graph seeded with service dependency relationships.")
    except Exception as e:
        logger.error(f"Neo4j seed error: {e}")


# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Kairos API",
    description="Autonomous AI-Native SRE Agent — Real-time log analysis with LangGraph multi-agent RCA",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ────────────────────────────────────────────────────────────────────
class LogEntry(BaseModel):
    service_name: str
    level: str
    message: str
    timestamp: Optional[str] = None
    metadata: dict = {}


class QueryRequest(BaseModel):
    question: str


# ── Core Log Processing ───────────────────────────────────────────────────────
async def process_log(log: LogEntry, severity_score: int = 0):
    """Processes a single log entry through the full pipeline."""
    metrics.logs_ingested += 1
    ts = log.timestamp or datetime.utcnow().isoformat()

    # Broadcast to UI
    await manager.broadcast({
        "type": "log_ingested",
        "data": {
            "service": log.service_name,
            "level": log.level,
            "message": log.message,
            "timestamp": ts,
            "severity_score": severity_score
        }
    })

    # Anomaly detection
    critical_keywords = ["EXCEPTION", "TIMEOUT", "500", "CRITICAL", "FAILURE", "PANIC", "OOM", "CRASH", "DOWN", "FATAL"]
    is_anomaly = (
        log.level.upper() in ["ERROR", "CRITICAL"] or
        any(kw in log.message.upper() for kw in critical_keywords)
    )

    if not is_anomaly:
        return

    # Storm deduplication
    storm_info = storm_detector.check_and_record(log.service_name, log.message)
    if storm_info["is_storm"]:
        await manager.broadcast({
            "type": "storm_detected",
            "data": {
                "service": log.service_name,
                "message": log.message,
                "suppressed_count": storm_info["suppressed_count"],
                "label": f"Error storm: {storm_info['suppressed_count']} duplicates suppressed"
            }
        })
        return  # Don't re-run RCA for storm duplicates

    metrics.record_anomaly_start(log.service_name)

    await manager.broadcast({
        "type": "anomaly_detected",
        "data": {
            "service": log.service_name,
            "message": log.message,
            "severity_score": severity_score,
            "status": "investigating",
            "timestamp": ts
        }
    })

    # Vector DB similarity search
    search_results = search_incidents(log.message, n_results=3)
    past_context_str = ""
    similar_incidents = []

    if search_results.get("documents") and search_results["documents"][0]:
        for i, (doc, meta, dist) in enumerate(zip(
            search_results["documents"][0],
            search_results["metadatas"][0],
            search_results.get("distances", [[]])[0] or []
        )):
            similarity = round((1 - dist) * 100, 1) if dist else 85.0
            similar_incidents.append({
                "rank": i + 1,
                "document": doc[:200],
                "root_cause": meta.get("root_cause", "")[:150],
                "resolution": meta.get("resolution", "")[:150],
                "service": meta.get("service", ""),
                "similarity_pct": similarity
            })
        past_context_str = f"Past Log: {search_results['documents'][0][0]}\nResolution: {search_results['metadatas'][0][0].get('resolution', 'N/A')}"

    # Broadcast ChromaDB matches to UI
    if similar_incidents:
        await manager.broadcast({
            "type": "similar_incidents",
            "data": {
                "service": log.service_name,
                "matches": similar_incidents
            }
        })

    # Run LangGraph agent
    final_report = await asyncio.to_thread(analyze_anomaly, log.service_name, log.message, past_context_str)

    was_cache = "(Served from Semantic Cache" in final_report
    metrics.record_rca_complete(log.service_name, was_cache_hit=was_cache)
    if was_cache:
        metrics.cache_hits += 1

    mttr_s = metrics.mttr_samples[-1] if metrics.mttr_samples else 0

    await manager.broadcast({
        "type": "rca_generated",
        "data": {
            "service": log.service_name,
            "error": log.message,
            "report": final_report,
            "severity_score": severity_score,
            "similar_incidents": similar_incidents,
            "mttr_seconds": mttr_s,
            "timestamp": datetime.utcnow().isoformat()
        }
    })

    # Record in incident history
    import uuid
    incident_history.append({
        "id":             str(uuid.uuid4())[:8],
        "timestamp":      ts,
        "service":        log.service_name,
        "level":          log.level.upper(),
        "message":        log.message,
        "severity_score": severity_score,
        "report":         final_report,
        "mttr_seconds":   mttr_s,
        "was_cache_hit":  was_cache,
        "provider":       _agent.LLM_PROVIDER,
        "similar_count":  len(similar_incidents),
    })


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "service": "Kairos API",
        "version": "2.0.0",
        "status": "running",
        "llm_provider": LLM_PROVIDER,
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    """System component health check — used by the frontend status badges."""
    # Redis
    redis_ok = False
    try:
        if redis_client:
            redis_client.ping()
            redis_ok = True
    except Exception:
        pass

    # Neo4j
    neo4j_ok = False
    try:
        if neo4j_driver:
            neo4j_driver.verify_connectivity()
            neo4j_ok = True
    except Exception:
        pass

    # Ollama (if applicable)
    ollama_ok = False
    if LLM_PROVIDER == "ollama":
        try:
            import requests as req
            r = req.get(f"{os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')}/api/tags", timeout=2)
            ollama_ok = r.status_code == 200
        except Exception:
            pass

    return {
        "status": "healthy",
        "components": {
            "redis": redis_ok,
            "neo4j": neo4j_ok,
            "llm": LLM_PROVIDER,
            "llm_ready": llm_provider_ready(),
            "chroma": True,  # Always true (in-process fallback)
            "langgraph": app_graph is not None
        },
        "timestamp": datetime.utcnow().isoformat()
    }


def llm_provider_ready() -> bool:
    if LLM_PROVIDER in ("groq", "ollama"):
        return app_graph is not None
    return False  # fallback mode


@app.get("/metrics")
async def get_metrics():
    """Live operational metrics — displayed in the cockpit stats bar."""
    return {
        "logs_ingested": metrics.logs_ingested,
        "anomalies_detected": metrics.anomalies_detected,
        "rcas_generated": metrics.rcas_generated,
        "cache_hits": metrics.cache_hits,
        "cache_hit_rate_pct": round(
            (metrics.cache_hits / max(metrics.rcas_generated, 1)) * 100, 1
        ),
        "avg_mttr_seconds": metrics.avg_mttr,
        "total_time_saved_minutes": metrics.total_time_saved_minutes,
        "human_baseline_minutes": 23,
        "active_ws_connections": len(manager.active_connections),
        "llm_provider": LLM_PROVIDER
    }


@app.get("/history")
async def get_history(
    service: Optional[str] = None,
    level: Optional[str] = None,
    limit: int = 50,
):
    """Incident history — last N resolved incidents with RCA reports."""
    items = list(incident_history)
    items.reverse()  # newest first

    if service:
        items = [i for i in items if i["service"].lower() == service.lower()]
    if level:
        items = [i for i in items if i["level"] == level.upper()]

    items = items[:min(limit, 100)]

    # Compute summary stats over full unfiltered history
    all_items = list(incident_history)
    mttr_vals = [i["mttr_seconds"] for i in all_items if i["mttr_seconds"] > 0]
    service_counts: dict = {}
    for i in all_items:
        service_counts[i["service"]] = service_counts.get(i["service"], 0) + 1
    worst_service = max(service_counts, key=service_counts.get) if service_counts else None
    cache_hits = sum(1 for i in all_items if i["was_cache_hit"])

    return {
        "incidents": items,
        "total":     len(all_items),
        "filtered":  len(items),
        "summary": {
            "avg_mttr_seconds": round(sum(mttr_vals) / len(mttr_vals), 1) if mttr_vals else 0,
            "min_mttr_seconds": round(min(mttr_vals), 1) if mttr_vals else 0,
            "max_mttr_seconds": round(max(mttr_vals), 1) if mttr_vals else 0,
            "mttr_series":      mttr_vals[-20:],  # last 20 for sparkline
            "worst_service":    worst_service,
            "cache_hit_rate_pct": round((cache_hits / max(len(all_items), 1)) * 100, 1),
            "services":         list(service_counts.keys()),
        },
    }


@app.get("/models")
async def get_models():
    """Returns active LLM configuration and available Ollama models."""
    available_models = []
    ollama_running = False
    try:
        import requests as req
        r = req.get(f"{os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')}/api/tags", timeout=2)
        if r.status_code == 200:
            ollama_running = True
            available_models = [m["name"] for m in r.json().get("models", [])]
    except Exception:
        pass

    active_model = {
        "groq": "llama-3.1-8b-instant",
        "ollama": OLLAMA_MODEL,
        "fallback": "smart-fallback (no LLM)",
    }.get(LLM_PROVIDER, "unknown")

    return {
        "active_provider": LLM_PROVIDER,
        "active_model": active_model,
        "ollama_running": ollama_running,
        "ollama_available_models": available_models,
        "langgraph_ready": app_graph is not None,
        "groq_configured": bool(os.getenv("GROQ_API_KEY", "")),
    }


@app.post("/query")
async def query_incidents(req: QueryRequest):
    """
    Natural language query over the incident knowledge base.
    Searches ChromaDB for relevant past incidents, feeds them as context to the LLM,
    and returns a concise, actionable answer — like asking a senior SRE colleague.
    """
    question = req.question.strip()
    if not question:
        return {"answer": "Ask me anything about your incidents.", "sources_found": 0}

    # Vector search over past incidents
    from vector_store import search_incidents
    results = search_incidents(question, n_results=5)

    context_parts = []
    if results.get("documents") and results["documents"][0]:
        for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
            context_parts.append(
                f"Incident: {doc[:300]}\n"
                f"Root cause: {meta.get('root_cause', 'N/A')}\n"
                f"Resolution: {meta.get('resolution', 'N/A')}"
            )
    sources_found = len(context_parts)

    if critic_llm and context_parts:
        from langchain_core.messages import HumanMessage, SystemMessage
        context_text = "\n\n---\n\n".join(context_parts)
        prompt = [
            SystemMessage(content=f"""You are an SRE knowledge assistant embedded in Kairos. Answer the engineer's question using these past incidents as context:

{context_text}

Rules:
- Answer in 2-3 sentences max — the engineer is in the middle of an incident
- Be specific and technical, reference actual service names, commands, or metrics if relevant
- If a resolution exists, mention it directly
- If no match: say "No matching incidents found — this appears to be a new failure pattern"
- Never say "based on the provided incidents" — just answer directly and confidently"""),
            HumanMessage(content=question),
        ]
        try:
            response = await asyncio.to_thread(critic_llm.invoke, prompt)
            return {"answer": response.content, "sources_found": sources_found, "has_llm": True}
        except Exception as e:
            logger.error(f"Query LLM error: {e}")

    # Fallback: surface the top result's resolution directly
    if context_parts:
        meta = results["metadatas"][0][0]
        resolution = meta.get("resolution", "Check service logs for details.")
        return {
            "answer": f"Found {sources_found} similar past incidents. Most relevant resolution: {resolution}",
            "sources_found": sources_found,
            "has_llm": False,
        }

    return {
        "answer": "No matching incidents found in the knowledge base. Run a demo incident first to seed history.",
        "sources_found": 0,
        "has_llm": False,
    }


# ── LLM Settings ─────────────────────────────────────────────────────────────
class LLMConfigRequest(BaseModel):
    provider: str          # ollama | groq | openai | anthropic
    model: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None


@app.get("/settings/llm")
async def get_llm_settings():
    """Return current LLM config — never exposes the API key."""
    status = get_llm_status()
    return {
        "active_provider": status["active_provider"],
        "active_model":    status["active_model"],
        "llm_ready":       status["llm_ready"],
        "graph_ready":     status["graph_ready"],
    }


@app.post("/settings/llm")
async def configure_llm(config: LLMConfigRequest):
    """Hot-swap the LLM provider/model without a server restart."""
    success, error = await asyncio.to_thread(
        reinitialize_llm, config.provider, config.model, config.api_key, config.base_url
    )
    if success:
        return {"success": True, "provider": config.provider, "model": config.model}
    return {"success": False, "error": error}


@app.delete("/settings/llm")
async def clear_llm_config():
    """Reset to fallback mode — wipes in-memory key."""
    _agent.llm        = None
    _agent.critic_llm = None
    _agent.app_graph  = None
    _agent.LLM_PROVIDER = "fallback"
    return {"success": True}


@app.post("/settings/test")
async def test_llm_connection():
    """Send a minimal probe to verify the configured LLM responds."""
    from langchain_core.messages import HumanMessage
    cl = _agent.critic_llm
    if not cl:
        return {"success": False, "error": "No LLM configured. Apply a provider first."}
    try:
        resp = await asyncio.to_thread(cl.invoke, [HumanMessage(content="Reply with only the word: PONG")])
        return {
            "success":  True,
            "provider": _agent.LLM_PROVIDER,
            "model":    _agent.OLLAMA_MODEL,
            "response": resp.content[:40],
        }
    except Exception as e:
        return {"success": False, "error": str(e)[:300]}


@app.post("/ingest/batch")
async def ingest_batch(logs: List[LogEntry], background_tasks: BackgroundTasks):
    """Batch log ingestion — send up to 50 log entries in one request."""
    if len(logs) > 50:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Max 50 logs per batch request.")
    queued = []
    for log in logs:
        if not log.timestamp:
            log.timestamp = datetime.utcnow().isoformat()
        severity = compute_severity_score(log.service_name, log.level, log.message)
        background_tasks.add_task(process_log, log, severity)
        queued.append({"service": log.service_name, "severity_score": severity, "status": "queued"})
    return {"status": "queued", "count": len(queued), "items": queued}


@app.post("/ingest")
async def ingest_log(log: LogEntry, background_tasks: BackgroundTasks):
    """Primary log ingestion endpoint."""
    if not log.timestamp:
        log.timestamp = datetime.utcnow().isoformat()

    severity = compute_severity_score(log.service_name, log.level, log.message)
    background_tasks.add_task(process_log, log, severity)
    return {"status": "queued", "severity_score": severity}


@app.post("/demo")
async def run_demo(background_tasks: BackgroundTasks):
    """
    Fires a realistic 5-service incident scenario.
    PaymentService DB pool exhaustion cascades to OrderService → AuthService.
    Demonstrates the full pipeline: log stream → anomaly → agent loop → RCA.
    """
    import asyncio

    async def fire_demo_scenario():
        scenario = [
            # Normal background noise
            {"service_name": "InventoryService", "level": "INFO",     "message": "Inventory sync completed. 48,392 SKUs updated.",                              "delay": 0.3},
            {"service_name": "SearchService",    "level": "INFO",     "message": "Search index refresh completed. 2.1M documents indexed.",                     "delay": 0.3},
            {"service_name": "AuthService",      "level": "INFO",     "message": "JWT tokens issued: 1,247 in last 60s. Token validation rate: 99.8%.",          "delay": 0.4},
            {"service_name": "APIGateway",       "level": "INFO",     "message": "Routing 3,421 requests/min across 8 upstream services.",                      "delay": 0.3},
            # First warning sign
            {"service_name": "PaymentService",   "level": "WARN",     "message": "DB connection pool at 85% capacity (8.5/10). Monitor closely.",               "delay": 0.5},
            {"service_name": "OrderService",     "level": "INFO",     "message": "Processing 124 orders in queue. Avg checkout time: 1.2s.",                    "delay": 0.3},
            # The incident begins
            {"service_name": "PaymentService",   "level": "ERROR",    "message": "Database Connection Timeout after 30s — connection pool exhausted (10/10)",   "delay": 0.8},
            {"service_name": "PaymentService",   "level": "ERROR",    "message": "Database Connection Timeout after 30s — connection pool exhausted (10/10)",   "delay": 0.5},
            # Cascade starts
            {"service_name": "OrderService",     "level": "ERROR",    "message": "Payment gateway unreachable — checkout requests failing. 87 orders impacted.", "delay": 0.4},
            {"service_name": "AuthService",      "level": "WARN",     "message": "Auth latency spike: p99=2800ms (SLA: 500ms). Upstream dependency degraded.",  "delay": 0.4},
            # Full cascade
            {"service_name": "OrderService",     "level": "CRITICAL", "message": "NullPointerException at OrderProcessor.java:45 — payment response null",      "delay": 0.6},
            {"service_name": "APIGateway",       "level": "ERROR",    "message": "502 Bad Gateway — PaymentService health checks failing (3/3 probes failed)",   "delay": 0.5},
            # Recovery
            {"service_name": "InventoryService", "level": "INFO",     "message": "Inventory service nominal. No impact detected from payment cascade.",          "delay": 0.4},
            {"service_name": "SearchService",    "level": "INFO",     "message": "Search service healthy. Serving cached results during incident.",              "delay": 0.3},
        ]

        for entry in scenario:
            delay = entry.pop("delay", 1.0)
            await asyncio.sleep(delay)
            log = LogEntry(**entry)
            log.timestamp = datetime.utcnow().isoformat()
            severity = compute_severity_score(log.service_name, log.level, log.message)
            await process_log(log, severity)

    background_tasks.add_task(fire_demo_scenario)
    return {
        "status": "demo_started",
        "scenario": "PaymentService DB pool exhaustion → OrderService cascade",
        "events": 14,
        "anomalies_expected": 4
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    # Send current metrics immediately on connect
    try:
        await websocket.send_json({
            "type": "connected",
            "data": {
                "llm_provider": LLM_PROVIDER,
                "message": f"Connected to Kairos. LLM: {LLM_PROVIDER}"
            }
        })
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
