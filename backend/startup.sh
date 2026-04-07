#!/usr/bin/env bash
# startup.sh — used by Render's native (non-Docker) deployment
set -e

echo "Installing CPU-only torch..."
pip install torch==2.3.1+cpu torchvision==0.18.1+cpu --extra-index-url https://download.pytorch.org/whl/cpu --quiet

echo "Installing requirements..."
pip install -r requirements.txt --quiet

echo "Pre-downloading embedding model..."
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')" 

echo "Running CBT document ingestion..."
python -m app.rag.ingest

echo "Starting server..."
uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
