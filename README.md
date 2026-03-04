# LogSage: AI-Native SRE Agent Cockpit

LogSage is an autonomous Site Reliability Engineering (SRE) assistant designed to ingest real-time application logs, detect anomalies, and generate actionable Root Cause Analysis (RCA) reports using a fully local RAG (Retrieval-Augmented Generation) pipeline powered by Llama 3 via Ollama. 

Built with privacy and performance in mind, LogSage ensures that sensitive production logs **never leave your infrastructure.**

## 🚀 Key Features
- **Real-time Firehose:** Ingests and streams logs via WebSockets to a stunning, hacker-themed Next.js Cockpit interface.
- **Local RAG Analyzer:** Uses ChromaDB and Ollama native embedding functions to retrieve context from historical incidents.
- **Zero-Latency AI:** Fully offline AI analytical pipeline powered by LangChain and the `llama3` LLM.
- **Enterprise-Ready UI:** Implements Framer Motion and animated interaction patterns for seamless usability.
- **Dockerized Architecture:** Easily deployable across environments with a single Docker Compose script.

## 🏗️ Architecture Stack
* **Frontend:** Next.js (App Router), Tailwind CSS, Framer Motion, Lucide Icons.
* **Backend:** FastAPI, Python 3.13, WebSockets.
* **Vector Database:** ChromaDB (Local Persistent).
* **AI / LLM Engineering:** Ollama (Llama 3), LangChain.

## 🛠️ Getting Started

### Prerequisites
1. Install [Docker](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/).
2. Install [Ollama](https://ollama.com/) and pull the `llama3` model:
   ```bash
   ollama run llama3
   ```

### Running with Docker Compose
The entire stack is containerized. Start the backend and frontend simultaneously using Docker:

```bash
docker-compose up --build
```
* **Frontend Cockpit:** available at `http://localhost:3000`
* **FastAPI Backend:** available at `http://localhost:8001`
* **API Documentation:** available at `http://localhost:8001/docs`

### Testing the Pipeline
To simulate real-time traffic and trigger anomalies, run the bundled test script from a new terminal:
```bash
source backend/venv/bin/activate
python3 scripts/test_ingest.py
```
Watch the Cockpit dashboard instantly analyze and highlight critical errors, securely powered by your local Llama 3 model!

---
*Built as a portfolio showcase demonstrating advanced Agentic System Engineering, full-stack development, and offline AI architecture.*
