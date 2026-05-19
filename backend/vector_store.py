import os
import logging
import chromadb
from chromadb.utils import embedding_functions

logger = logging.getLogger(__name__)

# ── Data path (Docker-safe absolute path) ────────────────────────────────────
CHROMA_PATH = os.getenv("CHROMA_DATA_PATH", "/app/data/chroma")
os.makedirs(CHROMA_PATH, exist_ok=True)

# ── ChromaDB Client ───────────────────────────────────────────────────────────
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

# ── Embedding Function (smart fallback) ──────────────────────────────────────
# Prefer nomic-embed-text via Ollama (high quality, dedicated embed model).
# Falls back to DefaultEmbeddingFunction (all-MiniLM-L6-v2, in-process)
# which requires NO external service — guarantees the stack always runs.
OLLAMA_EMBED_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/embeddings")

def _get_embedding_function():
    try:
        import requests
        resp = requests.get(
            OLLAMA_EMBED_URL.replace("/api/embeddings", "/api/tags"),
            timeout=2
        )
        if resp.status_code == 200:
            models = [m["name"] for m in resp.json().get("models", [])]
            if any("nomic" in m for m in models):
                logger.info("Using nomic-embed-text via Ollama for embeddings.")
                return embedding_functions.OllamaEmbeddingFunction(
                    url=OLLAMA_EMBED_URL,
                    model_name="nomic-embed-text"
                )
    except Exception:
        pass
    logger.info("Ollama unavailable — using DefaultEmbeddingFunction (in-process). Stack will run without Ollama.")
    return embedding_functions.DefaultEmbeddingFunction()

embedding_fn = _get_embedding_function()

# ── Collection ────────────────────────────────────────────────────────────────
def get_or_create_collection(name: str):
    return chroma_client.get_or_create_collection(
        name=name,
        embedding_function=embedding_fn
    )

incidents_collection = get_or_create_collection("historical_incidents")


def add_incident(incident_id: str, log_message: str, root_cause: str, resolution: str, service: str = "", metadata: dict = None):
    """Index a solved incident into the vector store."""
    if metadata is None:
        metadata = {}

    metadata.update({
        "root_cause": root_cause,
        "resolution": resolution,
        "service": service
    })

    document = f"LOG: {log_message}\nROOT CAUSE: {root_cause}"

    try:
        incidents_collection.add(
            documents=[document],
            metadatas=[metadata],
            ids=[incident_id]
        )
        logger.info(f"Indexed incident '{incident_id}' into ChromaDB.")
    except Exception as e:
        # Duplicate ID — already seeded
        if "already exists" in str(e).lower():
            logger.debug(f"Incident '{incident_id}' already in ChromaDB, skipping.")
        else:
            logger.error(f"ChromaDB add error: {e}")


def search_incidents(query_log: str, n_results: int = 3):
    """Semantic search for similar past incidents."""
    try:
        count = incidents_collection.count()
        if count == 0:
            return {"documents": [[]], "metadatas": [[]], "distances": [[]]}
        actual_n = min(n_results, count)
        return incidents_collection.query(
            query_texts=[query_log],
            n_results=actual_n
        )
    except Exception as e:
        logger.error(f"ChromaDB search error: {e}")
        return {"documents": [[]], "metadatas": [[]], "distances": [[]]}
