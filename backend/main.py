import logging
from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from datetime import datetime
import json
import os
from vector_store import search_incidents
from agent import analyze_anomaly

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="LogSage API", version="0.1.0")

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from typing import List
import asyncio

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"WebSocket send error: {e}")

manager = ConnectionManager()

class LogEntry(BaseModel):
    service_name: str
    level: str  # INFO, ERROR, WARN, DEBUG
    message: str
    timestamp: str = None
    metadata: dict = {}

async def process_log(log: LogEntry):
    logger.info(f"Processing log from {log.service_name}: {log.message}")
    
    # Broadcast normal log to UI
    await manager.broadcast({
        "type": "log_ingested",
        "data": {
            "service": log.service_name,
            "level": log.level,
            "message": log.message,
            "timestamp": log.timestamp
        }
    })
    
    # Anomaly Detection Logic - Phase 1
    # Trigger if Level is ERROR or message contains high-priority keywords
    critical_keywords = ["EXCEPTION", "TIMEOUT", "500", "CRITICAL", "FAILURE", "PANIC"]
    is_anomaly = False
    
    if log.level.upper() in ["ERROR", "CRITICAL"]:
        is_anomaly = True
    elif any(word in log.message.upper() for word in critical_keywords):
        is_anomaly = True
        
    if is_anomaly:
        logger.warning(f"⚠️ ANOMALY DETECTED: {log.message}")
        
        # Broadcast anomaly to UI immediately
        await manager.broadcast({
            "type": "anomaly_detected",
            "data": {
                "service": log.service_name,
                "message": log.message,
                "status": "investigating"
            }
        })
        
        # Phase 2: Retrieve Historical Context
        logger.info("🔍 Searching Vector DB for similar past incidents...")
        search_results = search_incidents(log.message, n_results=1)
        
        past_context_str = ""
        if search_results['documents'] and len(search_results['documents'][0]) > 0:
            best_match_doc = search_results['documents'][0][0]
            metadata = search_results['metadatas'][0][0]
            logger.info("✅ Found relevant past incident context.")
            past_context_str = f"Past Log: {best_match_doc}\nResolution: {metadata.get('resolution', 'N/A')}"
        else:
            logger.info("❌ No similar past incidents found.")
            
        # Phase 3: Trigger AgentFlow(log, context)
        logger.info("🧠 Forwarding to Local Llama 3 Agent for Analysis...")
        analysis_report = analyze_anomaly(log.service_name, log.message, past_context_str)
        
        logger.info("====================================")
        logger.info("📝 AUTO-GENERATED SRE REPORT:")
        logger.info(analysis_report)
        logger.info("====================================")
        
        # Broadcast RCA report to UI
        await manager.broadcast({
            "type": "rca_generated",
            "data": {
                "service": log.service_name,
                "error": log.message,
                "report": analysis_report
            }
        })

@app.get("/")
async def root():
    return {"message": "LogSage API is running"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.post("/ingest")
async def ingest_log(log: LogEntry, background_tasks: BackgroundTasks):
    if not log.timestamp:
        log.timestamp = datetime.utcnow().isoformat()
    
    # Add processing to background tasks to keep API responsive (High-Throughput)
    background_tasks.add_task(process_log, log)
    
    return {"status": "success", "message": "Log queued for processing"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
