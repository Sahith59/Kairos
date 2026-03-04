import requests
import json
import time

API_URL = "http://localhost:8001/ingest"

logs = [
    {"service_name": "AuthService", "level": "INFO", "message": "User login success"},
    {"service_name": "PaymentService", "level": "ERROR", "message": "Database Connection Timeout"},
    {"service_name": "InventoryService", "level": "INFO", "message": "Inventory updated for item #123"},
    {"service_name": "OrderService", "level": "CRITICAL", "message": "NullPointerException at OrderProcessor.java:45"},
    {"service_name": "SearchService", "level": "WARN", "message": "Search latency exceeded 500ms"}
]

def run_test():
    for log in logs:
        try:
            response = requests.post(API_URL, json=log)
            print(f"Sent: {log['service_name']} - {log['level']} | Status: {response.status_code} | {response.json()}")
        except Exception as e:
            print(f"Error connecting to server: {e}")
            print("Make sure the backend is running (python main.py)")
            break
        time.sleep(1)

if __name__ == "__main__":
    run_test()
