"""
Seed historical incidents into ChromaDB at application startup.
8 realistic production incidents covering common failure patterns.
"""
import logging
from vector_store import add_incident

logger = logging.getLogger(__name__)

HISTORICAL_INCIDENTS = [
    {
        "id": "incident_001",
        "service": "PaymentService",
        "log_message": "Database Connection Timeout after 30s — pool exhausted",
        "root_cause": "The PostgreSQL connection pool (max=10) was exhausted under Black Friday load spike. 350 concurrent checkout requests queued behind 10 active DB connections.",
        "resolution": "Increased connection pool max to 50 via PG_POOL_MAX env var. Added connection timeout of 5s with retry logic. Deployed read replica for checkout queries."
    },
    {
        "id": "incident_002",
        "service": "AuthService",
        "log_message": "JWT validation failed — token signature verification exception",
        "root_cause": "The JWT signing key was rotated in Vault without updating the AuthService environment. New tokens were signed with key v2 but AuthService was still verifying against key v1.",
        "resolution": "Implemented dual-key validation window: AuthService now accepts both current and previous signing key for 24h after rotation. Added Vault change webhook to trigger service reload."
    },
    {
        "id": "incident_003",
        "service": "OrderService",
        "log_message": "NullPointerException at OrderProcessor.java line 45 — item.getPrice() returned null",
        "root_cause": "A new product category ('Bundle') was added to the catalog without a corresponding price calculation handler. OrderProcessor assumed all items had a non-null unit price.",
        "resolution": "Added null guard: if (item.getPrice() == null) throw new PricingException. Added integration test for all product category types. Updated OrderProcessor to handle bundle pricing."
    },
    {
        "id": "incident_004",
        "service": "InventoryService",
        "log_message": "OutOfMemoryError — Java heap space exhausted during batch inventory sync",
        "root_cause": "The nightly inventory sync loaded 2.3M product records into memory at once. JVM heap was set to 512MB (default). The full dataset required 4.1GB.",
        "resolution": "Refactored sync to use cursor-based streaming (1000 records/batch). Increased JVM heap to 2GB. Added memory alert at 80% utilization threshold."
    },
    {
        "id": "incident_005",
        "service": "SearchService",
        "log_message": "Elasticsearch connection timeout — search latency exceeded 5000ms SLA",
        "root_cause": "An unoptimized wildcard query (*shirt*) triggered a full index scan on 50M documents. Elasticsearch heap was 70% utilized causing GC pressure and latency spikes.",
        "resolution": "Added circuit breaker: reject queries with leading wildcards. Implemented query timeout of 2s with fallback to cached results. Added Elasticsearch slow query log threshold of 500ms."
    },
    {
        "id": "incident_006",
        "service": "APIGateway",
        "log_message": "502 Bad Gateway — upstream PaymentService health check failing",
        "root_cause": "PaymentService pods were in CrashLoopBackOff due to missing SECRET_KEY environment variable after a Helm chart upgrade that didn't propagate the new secret name.",
        "resolution": "Fixed Helm values.yaml to reference correct secret key. Added pre-deployment validation hook that checks all required env vars are present before pod start."
    },
    {
        "id": "incident_007",
        "service": "CacheService",
        "log_message": "Redis maxmemory-policy eviction spike — 40% cache miss rate in 5 minutes",
        "root_cause": "Redis maxmemory was set to 256MB. Product catalog caching during a flash sale increased Redis memory usage to 280MB, triggering aggressive LRU eviction of session tokens.",
        "resolution": "Increased Redis maxmemory to 1GB. Separated session store and catalog cache into two Redis instances. Changed eviction policy to allkeys-lru for catalog, noeviction for sessions."
    },
    {
        "id": "incident_008",
        "service": "NotificationService",
        "log_message": "SMTP connection refused — email notifications failing for all users",
        "root_cause": "SendGrid API key expired at 00:00 UTC. NotificationService had no retry mechanism and no fallback SMTP provider. 12,000 order confirmation emails were lost.",
        "resolution": "Added API key expiry monitoring with 7-day advance alert. Implemented fallback to secondary SMTP (AWS SES). Added async notification queue with retry policy (3 attempts, exponential backoff)."
    }
]


def seed_historical_incidents():
    """Seed ChromaDB with historical incidents. Safe to call multiple times (idempotent)."""
    logger.info(f"Seeding {len(HISTORICAL_INCIDENTS)} historical incidents into ChromaDB...")
    for incident in HISTORICAL_INCIDENTS:
        add_incident(
            incident_id=incident["id"],
            log_message=incident["log_message"],
            root_cause=incident["root_cause"],
            resolution=incident["resolution"],
            service=incident["service"]
        )
    logger.info("ChromaDB seeding complete.")
