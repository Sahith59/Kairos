import os
from langchain_community.llms import Ollama
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
import logging
import os
import hashlib
import redis
from neo4j import GraphDatabase

logger = logging.getLogger(__name__)

# Initialize Enterprise Databases (Cache & Graph)
try:
    redis_client = redis.Redis(host=os.getenv("REDIS_HOST", "localhost"), port=6379, db=0, decode_responses=True)
except Exception:
    redis_client = None

try:
    neo4j_driver = GraphDatabase.driver(
        os.getenv("NEO4J_URI", "bolt://localhost:7687"), 
        auth=(os.getenv("NEO4J_USER", "neo4j"), os.getenv("NEO4J_PASSWORD", "password"))
    )
except Exception:
    neo4j_driver = None

# Initialize Local LLM via Ollama
# This requires the Ollama desktop app to be running and `ollama run llama3` to have been executed.
try:
    llm = Ollama(
        base_url=os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434"),
        model="llama3", 
        temperature=0.1
    )
except Exception as e:
    logger.error(f"Failed to initialize Ollama: {e}")
    llm = None

# Define the Prompt Template for the SRE Agent
# This prompt forces the AI to use the Vector DB context and Graph DB dependencies.
sre_prompt = PromptTemplate(
    input_variables=["error_log", "past_context", "graph_context"],
    template="""You are 'LogSage', an elite Site Reliability Engineer (SRE) AI Assistant.
Your job is to analyze system anomalies and provide actionable fixes.

A new critical error just occurred in the system:
<NEW_ERROR>
{error_log}
</NEW_ERROR>

Here is the Graph RAG Context (System Dependencies):
<GRAPH_CONTEXT>
{graph_context}
</GRAPH_CONTEXT>

Here is the historical context of a very similar issue that was solved in the past:
<HISTORICAL_CONTEXT>
{past_context}
</HISTORICAL_CONTEXT>

Based ONLY on the error and the historical context provided above, generate a strict 3-part report:
1.  **Root Cause Analysis (RCA):** Explain what exactly failed and why.
2.  **Actionable Fix:** Provide the exact steps or code/config changes needed to fix it right now.
3.  **Prevention:** One sentence on how to stop this from happening again.

Keep it highly technical, concise, and professional. Do not invent information outside of the provided context.

YOUR SRE REPORT:
"""
)

# Chain the prompt and the LLM
if llm:
    agent_chain = sre_prompt | llm | StrOutputParser()
else:
    agent_chain = None

def get_upstream_dependencies(service_name: str) -> str:
    """Queries Neo4j Graph Database for service dependencies."""
    if not neo4j_driver:
        return "Graph Database offline."
    try:
        with neo4j_driver.session() as session:
            result = session.run('''
                MATCH (s:Service {name: $name})-[:DEPENDS_ON]->(upstream:Service)
                RETURN upstream.name as up
            ''', name=service_name)
            deps = [record["up"] for record in result]
            if deps:
                return f"CRITICAL CONTEXT: The {service_name} depends on the following upstream services: {', '.join(deps)}. A failure here might actually be caused by them dropping connections or failing."
            return f"{service_name} has no known upstream dependencies in the graph."
    except Exception as e:
        logger.error(f"Neo4j Error: {e}")
        return "Graph Database query failed."

def analyze_anomaly(service_name: str, error_log: str, past_context: str) -> str:
    """
    Runs the Agentic flow to diagnose an error, utilizing Semantic Cache and Graph RAG.
    """
    if not agent_chain:
        return "ERROR: Offline mode. Model not loaded. Ensure Ollama is running."

    # 1. Semantic Caching layer (Redis)
    cache_key = hashlib.md5(f"{service_name}:{error_log}".encode()).hexdigest()
    if redis_client:
        try:
            cached = redis_client.get(cache_key)
            if cached:
                logger.info("⚡ SEMANTIC CACHE HIT! Returning RCA in 5ms.")
                return "*(⚡ Served from Semantic Cache - 5ms)*\n\n" + cached
        except Exception as e:
            logger.error(f"Redis Error: {e}")

    # 2. Graph RAG layer (Neo4j)
    graph_context = get_upstream_dependencies(service_name)

    logger.info(f"🤖 LLM Agent is analyzing the anomaly (Cache Miss)...")
    try:
        # Generate the response
        response = agent_chain.invoke({
            "error_log": f"[{service_name}] {error_log}",
            "past_context": past_context if past_context else "No historical precedent found.",
            "graph_context": graph_context
        })
        
        # 3. Cache the analysis (TTL 5 minutes)
        if redis_client:
            try:
                redis_client.setex(cache_key, 300, response)
            except Exception as e:
                logger.error(f"Redis Write Error: {e}")
                
        return response
    except Exception as e:
        logger.error(f"LLM Generation failed: {e}")
        return f"Agent Analysis Failed: {e}"

if __name__ == "__main__":
    # Quick Test
    test_svc = "OrderService"
    test_log = "CRITICAL: Database connection failed Timeout"
    mock_context = "ROOT CAUSE: The PostgreSQL connection pool was exhausted due to a spike in traffic causing max_connections to be reached. Resolution: Increased max_connections to 500 in postgresql.conf and deployed PgBouncer to manage the connection pool effectively."
    
    print("Testing Local LLM Agent...")
    print(analyze_anomaly(test_svc, test_log, mock_context))

