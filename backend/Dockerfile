FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for building hnswlib (chromadb dependency)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only PyTorch first (much smaller than default GPU build)
RUN pip install --no-cache-dir \
    torch==2.3.1+cpu \
    --extra-index-url https://download.pytorch.org/whl/cpu

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Remove build tools to save image size
RUN apt-get purge -y build-essential gcc g++ && apt-get autoremove -y

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Download model + ingest CBT docs at startup, then start server
CMD ["sh", "-c", "python -c 'from sentence_transformers import SentenceTransformer; SentenceTransformer(\"all-MiniLM-L6-v2\")' && python -m app.rag.ingest && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
