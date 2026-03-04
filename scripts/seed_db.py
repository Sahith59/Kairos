import sys
import os

# Add backend directory to path to import vector_store
backend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.append(backend_dir)

from vector_store import add_incident

# Mock Historical Incidents
incidents = [
    {
        "id": "INC-001",
        "log_message": "Database Connection Timeout after 30000ms",
        "root_cause": "The PostgreSQL connection pool was exhausted due to a spike in traffic causing max_connections to be reached.",
        "resolution": "Increased max_connections to 500 in postgresql.conf and deployed PgBouncer to manage the connection pool effectively."
    },
    {
        "id": "INC-002",
        "log_message": "NullPointerException at OrderProcessor.java:45",
        "root_cause": "The upstream API sent a payload without the 'user_id' field, which the OrderProcessor attempted to access directly.",
        "resolution": "Added defensive programming checks to validate 'user_id' presence. Now returns a 400 Bad Request instead of causing a 500 server crash."
    },
    {
        "id": "INC-003",
        "log_message": "Redis OOM command not allowed when used memory > 'maxmemory'",
        "root_cause": "Session tokens were being cached without a TTL (Time To Live), eventually consuming all available RAM.",
        "resolution": "Configured Redis eviction policy to 'allkeys-lru' and updated the caching service to enforce a 24-hour TTL on all session keys."
    },
    {
        "id": "INC-004",
        "log_message": "Search latency exceeded 500ms, returning 504 Gateway Timeout",
        "root_cause": "Elasticsearch cluster was reorganizing shards during peak traffic, causing severe IO bottlenecks.",
        "resolution": "Disabled shard rebalancing during active peak hours via cluster routing settings and added higher IOPS EBS volumes to the data nodes."
    }
]

if __name__ == "__main__":
    print("Seeding LogSage Vector DB with historical incidents...")
    for inc in incidents:
        add_incident(
            incident_id=inc["id"],
            log_message=inc["log_message"],
            root_cause=inc["root_cause"],
            resolution=inc["resolution"]
        )
    print("Seeding complete. Verification:")
    
    # Test Retrieval
    from vector_store import search_incidents
    test_log = "CRITICAL: Database connection failed Timeout"
    print(f"\nSearching for similar incidents to: '{test_log}'")
    results = search_incidents(test_log, n_results=1)
    if results['documents'][0]:
        print(f"Found Match: {results['documents'][0][0]}")
    else:
        print("No match found.")
