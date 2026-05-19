import requests
import time

API_URL = "http://localhost:8001/demo"

def run_test():
    print("🚀 Triggering LogSage Production Incident Demo...")
    try:
        response = requests.post(API_URL)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Demo Started: {data.get('scenario')}")
            print(f"Events injected: {data.get('events')}")
            print("Open http://localhost:3000 to watch the SRE Cockpit in action.")
        else:
            print(f"❌ Error: HTTP {response.status_code}")
    except Exception as e:
        print(f"❌ Error connecting to server: {e}")
        print("Make sure the backend is running via Docker Compose.")

if __name__ == "__main__":
    run_test()
