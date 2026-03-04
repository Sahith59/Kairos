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

## 📈 Enterprise Scaling Strategy (The "Million-Log" Problem)
*How to evolve LogSage from a single-machine showcase to a global enterprise Observability platform.*

#### 1. Ingestion Layer (Message Queue)
Applications MUST decouple from the FastAPI ingestion layer. Instead of `POST`ing directly, microservices will stream logs to **Apache Kafka** or **AWS Kinesis**. This prevents API crashes during massive log spikes (e.g., 5 million logs/sec during a broader infrastructure outage). 

#### 2. Stream Processing (Edge Filtering)
An **Apache Flink** or **Spark Streaming** consumer processes the Kafka firehose. It automatically dumps perfectly normal `INFO` logs into object storage (AWS S3) and only forwards highly suspicious warnings/errors (1% of traffic) to the LogSage analytical pipeline.

#### 3. Enterprise Database Layer
* **Semantic Cache:** Uses **Redis Cluster** to memoize identical RCA reports with a 5-minute TTL. Drops LLM API calls by 99% during identical cascading failure repeats.
* **Vector Engine:** Migrates from local ChromaDB to a dedicated, distributed Vector Search cluster like **Milvus** or **Pinecone** for querying billions of historical incidents.
* **Distributed Graph (GraphRAG):** Uses **Neo4j** to plot dynamic microservice upstream dependencies mapping "blast radius".

#### 4. LLM Inference Layer
Migrates from a local Mac Ollama process to a cluster of dedicated Cloud GPUs (e.g., NVIDIA A100s) using an optimized, high-throughput inference engine like **vLLM** or **NVIDIA Triton Inference Server** behind a load balancer.

---
*Built as a portfolio showcase demonstrating advanced Agentic System Engineering, full-stack development, and offline AI architecture.*
