import os
import chromadb
from chromadb.utils import embedding_functions
from chromadb.config import Settings
import logging

logger = logging.getLogger(__name__)

# Ensure data directory exists
os.makedirs("../data/chroma", exist_ok=True)

# Initialize ChromaDB Client (Persistent)
# We use a completely local setup for privacy (No OpenAI API keys needed for embeddings)
chroma_client = chromadb.PersistentClient(path="../data/chroma")

# Initialize Local Embedding Function using Ollama 
# This bypasses PyTorch bugs on macOS and keeps the entire project 100% on the SSD!
ollama_ef = embedding_functions.OllamaEmbeddingFunction(
    url=os.getenv("OLLAMA_API_URL", "http://127.0.0.1:11434/api/embeddings"),
    model_name="llama3"
)

def get_or_create_collection(name: str):
    """Retrieves or creates a ChromaDB collection with our local embedding function."""
    return chroma_client.get_or_create_collection(
        name=name,
        embedding_function=ollama_ef
    )

# The core collection for "The Brain"
incidents_collection = get_or_create_collection("historical_incidents")

def add_incident(incident_id: str, log_message: str, root_cause: str, resolution: str, metadata: dict = None):
    """
    Indexes a solved incident into the vector store.
    The embedded text is a combination of the log and the root cause to maximize semantic matching.
    """
    if metadata is None:
        metadata = {}
    
    metadata.update({
        "root_cause": root_cause,
        "resolution": resolution
    })
    
    document = f"LOG: {log_message} \n ROOT CAUSE: {root_cause}"
    
    incidents_collection.add(
        documents=[document],
        metadatas=[metadata],
        ids=[incident_id]
    )
    logger.info(f"Added incident {incident_id} to Vector DB.")

def search_incidents(query_log: str, n_results: int = 3):
    """
    Given a new anomalous log, find the most similar past incidents.
    """
    results = incidents_collection.query(
        query_texts=[query_log],
        n_results=n_results
    )
    return results

