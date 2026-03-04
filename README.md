# LogSage: AI-Native SRE Agent Cockpit

LogSage is an autonomous Site Reliability Engineering (SRE) assistant designed to ingest real-time application logs, detect anomalies, and generate actionable Root Cause Analysis (RCA) reports using a fully local RAG (Retrieval-Augmented Generation) pipeline powered by Llama 3 via Ollama. 

Built with privacy and performance in mind, LogSage ensures that sensitive production logs **never leave your infrastructure.**

## Key Features
- **Real-time Firehose:** Ingests and streams logs via WebSockets to a stunning, hacker-themed Next.js Cockpit interface.
- **Local RAG Analyzer:** Uses ChromaDB and Ollama native embedding functions to retrieve context from historical incidents.
- **Zero-Latency AI:** Fully offline AI analytical pipeline powered by LangChain and the `llama3` LLM.
- **Enterprise-Ready UI:** Implements Framer Motion and animated interaction patterns for seamless usability.
- **Dockerized Architecture:** Easily deployable across environments with a single Docker Compose script.

<img width="1216" height="873" alt="Pasted Graphic 4" src="https://github.com/user-attachments/assets/f234063b-019c-456d-8233-c93366184ab9" />

<br>
<img width="817" height="909" alt="Pasted Graphic 6" src="https://github.com/user-attachments/assets/541d26ee-fdc1-47d1-8de4-e9593b187364" />
<br>
<img width="1251" height="648" alt="Container CPV usage C" src="https://github.com/user-attachments/assets/d5fac7d3-9703-46fe-842a-8e5c21f76400" />


## Architecture Stack
* **Frontend:** Next.js (App Router), Tailwind CSS, Framer Motion, Lucide Icons.
* **Backend:** FastAPI, Python 3.13, WebSockets.
* **Vector Database:** ChromaDB (Local Persistent).
* **AI / LLM Engineering:** Ollama (Llama 3), LangChain.

## Getting Started

### Prerequisites
1. Install [Docker](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/).
2. Install [Ollama](https://ollama.com/) and pull the `llama3` model:
   ```bash
   ollama run llama3
   ```

### Quickstart (Docker Compose)
The entire LogSage stack (Next.js Frontend, FastAPI Backend, Redis Cache, Neo4j Graph DB) is fully containerized.

Start the infrastructure in the background:
```bash
docker compose up --build -d
```

### Accessing the System
* **SRE Cockpit UI:** [http://localhost:3000](http://localhost:3000)
* **Backend API Docs:** [http://localhost:8001/docs](http://localhost:8001/docs)
* **Neo4j Graph Database:** [http://localhost:7474](http://localhost:7474) *(User: neo4j / Password: password)*

### Simulating a Production Outage
To witness the AI Agent in action, send a blast of mock error logs to the pipeline:
```bash
python3 scripts/test_ingest.py
```
*Watch the Cockpit dashboard instantly highlight the critical errors and generate Root Cause Analysis (RCA) reports powered securely by your local LLM!*

To view the raw AI "Thought Process" in the terminal:
```bash
docker compose logs backend -f
```

---

## Enterprise Scaling Strategy (The "Million-Log" Problem)
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
