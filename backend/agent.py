import os
from langchain_community.llms import Ollama
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
import logging

logger = logging.getLogger(__name__)

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
# This prompt forces the AI to use the Vector DB context instead of hallucinating.
sre_prompt = PromptTemplate(
    input_variables=["error_log", "past_context"],
    template="""You are 'LogSage', an elite Site Reliability Engineer (SRE) AI Assistant.
Your job is to analyze system anomalies and provide actionable fixes.

A new critical error just occurred in the system:
<NEW_ERROR>
{error_log}
</NEW_ERROR>

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

def analyze_anomaly(error_log: str, past_context: str) -> str:
    """
    Runs the Agentic flow to diagnose an error.
    """
    if not agent_chain:
        return "ERROR: Offline mode. Model not loaded. Ensure Ollama is running."

    logger.info(f"🤖 LLM Agent is analyzing the anomaly...")
    try:
        # Generate the response
        response = agent_chain.invoke({
            "error_log": error_log,
            "past_context": past_context if past_context else "No historical precedent found."
        })
        return response
    except Exception as e:
        logger.error(f"LLM Generation failed: {e}")
        return f"Agent Analysis Failed: {e}"

if __name__ == "__main__":
    # Quick Test
    test_log = "CRITICAL: Database connection failed Timeout"
    mock_context = "ROOT CAUSE: The PostgreSQL connection pool was exhausted due to a spike in traffic causing max_connections to be reached. Resolution: Increased max_connections to 500 in postgresql.conf and deployed PgBouncer to manage the connection pool effectively."
    
    print("Testing Local LLM Agent...")
    print(analyze_anomaly(test_log, mock_context))
