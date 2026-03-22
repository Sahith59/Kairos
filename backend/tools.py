from langchain_core.tools import tool
import random
import time

@tool
def check_service_health(service_name: str) -> str:
    """
    Checks the real-time health and CPU/Memory metrics of a given microservice.
    Use this tool when a service throws an error to see if it is currently overloaded or down.
    """
    # Simulated execution
    time.sleep(1)
    
    # Simulate some deterministic output based on the service name for realism
    if "Payment" in service_name:
        return f"Service {service_name} Health: DEGRADED. CPU: 95%, Memory: 80%. Postgres DB connections maxed out."
    elif "Inventory" in service_name:
        return f"Service {service_name} Health: OK. CPU: 15%, Memory: 30%. No active alerts."
    else:
        status = random.choice(["OK", "DEGRADED", "DOWN"])
        cpu = random.randint(10, 99)
        return f"Service {service_name} Health: {status}. CPU: {cpu}%, Memory: {random.randint(10, 80)}%."

@tool
def restart_pod(service_name: str) -> str:
    """
    Executes a Kubernetes pod restart for the specified service.
    Only use this tool if the service is completely unresponsive or down and needs a hard reset.
    """
    time.sleep(2)
    return f"SUCCESS: Kubernetes pod for {service_name} has been restarted and is now running normally."

@tool
def query_db_latency(db_name: str) -> str:
    """
    Queries the current read/write latency of the specified database (e.g., 'PostgreSQL', 'Redis', 'MongoDB').
    Use this when an error mentions a database timeout or connection failure.
    """
    if "Postgres" in db_name or "SQL" in db_name:
        return f"Database {db_name} - Read Latency: 550ms (HIGH), Write Latency: 1200ms (CRITICAL)."
    return f"Database {db_name} - Read Latency: 15ms (NORMAL), Write Latency: 25ms (NORMAL)."

# List of tools to bind to the agent
AGENT_TOOLS = [check_service_health, restart_pod, query_db_latency]
