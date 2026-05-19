import os
import time
import logging
from langchain_core.tools import tool

logger = logging.getLogger(__name__)

# Will be set by main.py to enable WebSocket broadcasting from tools
_broadcast_fn = None

def set_broadcast_fn(fn):
    """Inject the WebSocket broadcast function so tools can emit events."""
    global _broadcast_fn
    _broadcast_fn = fn

async def _broadcast_tool_event(event_type: str, payload: dict):
    if _broadcast_fn:
        try:
            await _broadcast_fn({"type": event_type, "data": payload})
        except Exception:
            pass


# ── Tool definitions ──────────────────────────────────────────────────────────

@tool
def check_service_health(service_name: str) -> str:
    """
    Checks the real-time health, CPU, memory, and active connection metrics
    of a given microservice. Use when a service throws an error to see if
    it is currently overloaded, degraded, or completely down.
    """
    start = time.time()
    time.sleep(0.8)  # Realistic tool execution time
    elapsed_ms = int((time.time() - start) * 1000)

    # Deterministic realistic outputs keyed by service pattern
    if "Payment" in service_name:
        result = (
            f"Service: {service_name} | Status: DEGRADED | "
            f"CPU: 94% | Memory: 81% | "
            f"Active DB Connections: 10/10 (MAXED) | "
            f"Avg Response Time: 4200ms | Error Rate: 38%"
        )
    elif "Auth" in service_name:
        result = (
            f"Service: {service_name} | Status: DEGRADED | "
            f"CPU: 45% | Memory: 60% | "
            f"JWT Validation Errors: 1,247/min | "
            f"Avg Response Time: 890ms | Error Rate: 92%"
        )
    elif "Order" in service_name:
        result = (
            f"Service: {service_name} | Status: DOWN | "
            f"CPU: 2% (idle) | Memory: 45% | "
            f"Pod State: CrashLoopBackOff | Restarts: 7 | "
            f"Last Error: NullPointerException at OrderProcessor:45"
        )
    elif "Inventory" in service_name:
        result = (
            f"Service: {service_name} | Status: OK | "
            f"CPU: 18% | Memory: 34% | "
            f"Avg Response Time: 120ms | Error Rate: 0.1%"
        )
    elif "Search" in service_name:
        result = (
            f"Service: {service_name} | Status: DEGRADED | "
            f"CPU: 71% | Memory: 78% | "
            f"Elasticsearch Heap: 88% | "
            f"Avg Query Latency: 3400ms | Timeout Rate: 24%"
        )
    else:
        result = (
            f"Service: {service_name} | Status: OK | "
            f"CPU: 23% | Memory: 41% | "
            f"Avg Response Time: 95ms | Error Rate: 0.3%"
        )

    logger.info(f"[TOOL] check_service_health({service_name}) → {result[:60]}... ({elapsed_ms}ms)")
    return result


@tool
def query_db_latency(db_name: str) -> str:
    """
    Queries current read/write latency, connection pool utilization, and
    slow query count for the specified database. Use when an error mentions
    a database timeout, connection failure, or high query latency.
    """
    start = time.time()
    time.sleep(0.6)
    elapsed_ms = int((time.time() - start) * 1000)

    if any(k in db_name for k in ["Postgres", "SQL", "postgres"]):
        result = (
            f"Database: {db_name} | "
            f"Read Latency: p50=45ms p95=820ms p99=3200ms (HIGH) | "
            f"Write Latency: p50=120ms p95=1800ms p99=4500ms (CRITICAL) | "
            f"Connection Pool: 10/10 active (EXHAUSTED) | "
            f"Slow Queries (>1s): 847 in last 5min | "
            f"Lock Waits: 23 active"
        )
    elif "Redis" in db_name:
        result = (
            f"Database: {db_name} | "
            f"Read Latency: 2ms (NORMAL) | Write Latency: 3ms (NORMAL) | "
            f"Memory Usage: 248MB/256MB (97% — CRITICAL) | "
            f"Eviction Rate: 1,240 keys/sec | "
            f"Cache Hit Rate: 61% (degraded from 94%)"
        )
    elif "Elasticsearch" in db_name or "elastic" in db_name.lower():
        result = (
            f"Database: {db_name} | "
            f"Search Latency: p50=2800ms p95=8200ms (CRITICAL) | "
            f"Indexing Rate: 340 docs/sec | "
            f"JVM Heap: 88% (GC pressure) | "
            f"Slow Queries: 234 in last min"
        )
    else:
        result = (
            f"Database: {db_name} | "
            f"Read Latency: 12ms (NORMAL) | Write Latency: 18ms (NORMAL) | "
            f"Connection Pool: 4/20 active | "
            f"Slow Queries: 0"
        )

    logger.info(f"[TOOL] query_db_latency({db_name}) → {result[:60]}... ({elapsed_ms}ms)")
    return result


@tool
def restart_pod(service_name: str) -> str:
    """
    Executes a rolling Kubernetes pod restart for the specified service.
    Only use this when the service is completely unresponsive (DOWN status)
    and other diagnostic tools confirm it needs a hard reset.
    """
    start = time.time()
    time.sleep(1.2)
    elapsed_ms = int((time.time() - start) * 1000)

    result = (
        f"Kubernetes rolling restart initiated for {service_name}. "
        f"Old pod terminated. New pod scheduled on node worker-03. "
        f"Health check: PASSING after 8s. "
        f"Service {service_name} is now RUNNING normally. "
        f"Restart completed in {elapsed_ms}ms."
    )
    logger.info(f"[TOOL] restart_pod({service_name}) → Success ({elapsed_ms}ms)")
    return result


# ── Tool registry ─────────────────────────────────────────────────────────────
AGENT_TOOLS = [check_service_health, query_db_latency, restart_pod]
