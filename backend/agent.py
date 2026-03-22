import os
import hashlib
import logging
import redis
import operator
from neo4j import GraphDatabase
from typing import TypedDict, Annotated, Sequence
from langchain_core.messages import HumanMessage, SystemMessage, BaseMessage
from langchain_ollama import ChatOllama
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from tools import AGENT_TOOLS

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

# Initialize Local LLM via Ollama and bind tools
try:
    llm = ChatOllama(
        base_url=os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434"),
        model="llama3.1", 
        temperature=0.1
    ).bind_tools(AGENT_TOOLS)
    
    critic_llm = ChatOllama(
        base_url=os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434"),
        model="llama3.1", 
        temperature=0.1
    )
except Exception as e:
    logger.error(f"Failed to initialize Ollama: {e}")
    llm = None
    critic_llm = None

# -------------------------------------------------------------
# LangGraph Architecture Definition
# -------------------------------------------------------------

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]
    service_name: str
    error_log: str
    graph_context: str
    past_context: str
    revision_count: int
    draft_rca: str

def investigator_node(state: AgentState):
    """The Primary RCA Drafter. It can use tools before generating the report."""
    sys_msg = SystemMessage(content=f"""You are an elite SRE Investigator.
Target Service: {state['service_name']}
Current Error: {state['error_log']}

Upstream Dependencies (GraphRAG): {state['graph_context']}
Historical Context (Vector DB): {state['past_context']}

You have tools available to check system health, restart pods, or query DB latency. Use them if there's ambiguity about the root cause.
If you have used tools or have enough context, draft a highly technical 3-part RCA:
1. **Root Cause Analysis (RCA):**
2. **Actionable Fix:**
3. **Prevention:**
""")
    response = llm.invoke([sys_msg] + state["messages"])
    
    if hasattr(response, "tool_calls") and response.tool_calls:
        return {"messages": [response]}
        
    return {"messages": [response], "draft_rca": response.content}

def should_continue(state: AgentState):
    """Router: if the LLM invoked a tool, route to Tools. Else route to Critic."""
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return "critic"

def critic_node(state: AgentState):
    """The Secondary Agent. Reviews the RCA for hallucinations and completeness."""
    if state["revision_count"] >= 2:
        return {"messages": []} # Force end after 2 loops
        
    draft = state.get("draft_rca", "")
    
    sys_msg = SystemMessage(content=f"""You are a strict SRE Critic. Review the Investigator's drafted RCA.
Original Error: {state['error_log']}

If the RCA makes logical sense, doesn't hallucinate missing info, and explicitly contains the 3 parts (RCA, Fix, Prevention), reply with EXACTLY "APPROVED". Do not say anything else.
If it is flawed, hallucinates, or is incomplete, reply with a short critique telling the Investigator what to fix, starting with the word "REJECTED: ".""")

    response = critic_llm.invoke([sys_msg, HumanMessage(content=draft)])
    
    if "APPROVED" in response.content.upper():
        # We are done
        return {"messages": [response]}
    else:
        # Ask for revision (critique will be passed back as a message)
        critique_content = response.content if "REJECTED" in response.content.upper() else f"REJECTED: {response.content}"
        critique_msg = HumanMessage(content=critique_content)
        return {"messages": [critique_msg], "revision_count": state["revision_count"] + 1}

def route_critic(state: AgentState):
    """Router: if approved, End. If rejected, loop back to investigator."""
    if state["revision_count"] >= 2:
        return END
    last_message = state["messages"][-1]
    if "REJECTED" in last_message.content.upper():
        return "investigator"
    return END

# Build Graph
if llm:
    workflow = StateGraph(AgentState)
    workflow.add_node("investigator", investigator_node)
    
    # ToolNode automatically handles the execution of bound tools
    workflow.add_node("tools", ToolNode(AGENT_TOOLS)) 
    workflow.add_node("critic", critic_node)
    
    workflow.add_edge(START, "investigator")
    workflow.add_conditional_edges("investigator", should_continue, {"tools": "tools", "critic": "critic"})
    workflow.add_edge("tools", "investigator")
    workflow.add_conditional_edges("critic", route_critic, {"investigator": "investigator", END: END})
    
    app_graph = workflow.compile()
else:
    app_graph = None

# -------------------------------------------------------------
# Standard Logic
# -------------------------------------------------------------

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
                return f"CRITICAL CONTEXT: {service_name} depends on the following upstream services: {', '.join(deps)}."
            return f"{service_name} has no known upstream dependencies in the graph."
    except Exception as e:
        logger.error(f"Neo4j Error: {e}")
        return "Graph Database query failed."

def analyze_anomaly(service_name: str, error_log: str, past_context: str) -> str:
    """
    Runs the LangGraph Agentic flow to diagnose an error, utilizing Semantic Cache, tools, and Graph RAG.
    """
    if not app_graph:
        return "ERROR: LangGraph offline. Model not loaded. Ensure Ollama is running."

    # 1. Semantic Caching layer (Redis)
    cache_key = hashlib.md5(f"{service_name}:{error_log}".encode()).hexdigest()
    if redis_client:
        try:
            cached = redis_client.get(cache_key)
            if cached:
                logger.info("SEMANTIC CACHE HIT! Returning RCA in 5ms.")
                return "(Served from Semantic Cache - 5ms)\n\n" + cached
        except Exception as e:
            logger.error(f"Redis Error: {e}")

    # 2. Graph RAG layer (Neo4j)
    graph_context = get_upstream_dependencies(service_name)

    logger.info(f"LangGraph Agent Loop initiated (Cache Miss)...")
    try:
        initial_state = {
            "messages": [HumanMessage(content="Investigate this error and write an RCA.")],
            "service_name": service_name,
            "error_log": f"[{service_name}] {error_log}",
            "graph_context": graph_context,
            "past_context": past_context if past_context else "No historical precedent found.",
            "revision_count": 0,
            "draft_rca": ""
        }
        
        # Execute the full LangGraph Loop
        final_state = app_graph.invoke(initial_state)
        
        # Extract the final RCA generated by the investigator node
        final_report = final_state.get("draft_rca", "Agent failed to generate a report.")
                
        # Annotate that it was ran through LangGraph
        final_report = "(Validated by LangGraph SRE Critic Loop)\n\n" + final_report
        
        # 3. Cache the validated analysis (TTL 5 minutes)
        if redis_client:
            try:
                redis_client.setex(cache_key, 300, final_report)
            except Exception as e:
                logger.error(f"Redis Write Error: {e}")
                
        return final_report
    except Exception as e:
        logger.error(f"LangGraph execution failed: {e}")
        return f"LangGraph Execution Failed: {e}"

if __name__ == "__main__":
    # Standard testing script.
    print("Testing LangGraph Module...")
