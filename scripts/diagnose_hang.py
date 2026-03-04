import os
os.environ["no_proxy"] = "*"
os.environ["CHROMA_TELEMETRY"] = "False"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

import logging
logging.basicConfig(level=logging.INFO)

print("Step 1: Importing Torch...")
import torch
print("Torch imported successfully.")

print("Step 2: Importing SentenceTransformer...")
from sentence_transformers import SentenceTransformer
print("SentenceTransformer imported successfully.")

print("Step 3: Loading all-MiniLM-L6-v2 model (This may download ~80MB)...")
model = SentenceTransformer("all-MiniLM-L6-v2")
print("Model loaded successfully!")
