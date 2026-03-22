# LogSage: AI-Native SRE Agent Cockpit

LogSage is an autonomous Site Reliability Engineering (SRE) assistant designed to ingest real-time application logs, detect anomalies, and generate actionable Root Cause Analysis (RCA) reports using a fully local RAG (Retrieval-Augmented Generation) pipeline powered by Llama 3 via Ollama. 

Built with privacy and performance in mind, LogSage ensures that sensitive production logs **never leave your infrastructure.**

## Key Features
- **Real-time Firehose:** Ingests and streams logs via WebSockets to a stunning, hacker-themed Next.js Cockpit interface.
- **Local RAG Analyzer:** Uses ChromaDB and Ollama native embedding functions to retrieve context from historical incidents.
- **LangGraph Multi-Agent Loop:** Utilizes a cyclic, self-reflective state machine where an Investigator agent drafts the RCA and a Lead Critic strictly validates it, explicitly preventing LLM hallucinations.
- **Autonomous Tool Execution:** The AI dynamically triggers executable Python bindings (e.g., querying database latency, checking pod health) to ground its responses in real-time system metrics.
- **Zero-Latency AI:** Fully offline AI analytical pipeline powered by LangGraph, LangChain, and the `llama3.1` LLM.
- **Enterprise-Ready UI:** Implements Framer Motion and animated interaction patterns for seamless usability.
- **Dockerized Architecture:** Easily deployable across environments with a single Docker Compose script.

### Project Showcase

**1. The SRE Dashboard (Real-Time Next.js Cockpit)**
*The frontend interface where incoming logs are streamed via WebSockets and critical anomalies are instantly highlighted for the engineering team.*
<img width="1216" height="873" alt="Cockpit Dashboard Preview" src="https://github.com/user-attachments/assets/f234063b-019c-456d-8233-c93366184ab9" />

**2. The LangGraph Multi-Agent Terminal Output**
*The raw backend thought process showcasing the LangGraph State Machine. Here, the Investigator Agent autonomously triggers Python tools (like checking database latency) and is repeatedly validated by the internal Lead Critic Agent until a perfect Root Cause Analysis is generated.*
<img width="817" height="909" alt="LangGraph Terminal Output" src="https://github.com/user-attachments/assets/541d26ee-fdc1-47d1-8de4-e9593b187364" />

**3. Infrastructure & Docker Utilization**
*The execution environment running via a unified Docker Compose network. This showcases the independent microservices (FastAPI Backend, Next.js Frontend, Redis Cache, Neo4j Graph DB) executing fully offline with optimized resource isolation.*
<img width="1251" height="648" alt="Container CPU/Memory Usage" src="https://github.com/user-attachments/assets/d5fac7d3-9703-46fe-842a-8e5c21f76400" />

**4. Additional Terminal Output / Architecture Diagram**
*Place your additional backend processing logs, autonomous tool demonstrations, or architecture diagrams here.*
![Additional Terminal Preview](path/to/your/terminal/image.png)

## Architecture Stack
* **Frontend:** Next.js (App Router), Tailwind CSS, Framer Motion, Lucide Icons.
* **Backend:** FastAPI, Python 3.13, WebSockets.
* **Vector Database:** ChromaDB (Local Persistent).
* **AI / LLM Engineering:** Ollama (Llama 3.1), LangGraph, LangChain.

## Getting Started

### Prerequisites
1. Install [Docker](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/).
2. Install [Ollama](https://ollama.com/) and pull the `llama3.1` model (required for native Function Calling support):
   ```bash
   ollama run llama3.1
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
