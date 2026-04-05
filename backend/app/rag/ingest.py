"""CLI script to ingest CBT documents into ChromaDB."""

import os
import sys
import chromadb
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.config import get_settings
from app.rag.embeddings import embed_texts


def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> list[str]:
    """Split text into overlapping chunks."""
    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk.strip())
        start += chunk_size - overlap

    return chunks


def extract_technique_name(filepath: Path) -> str:
    """Convert filename to readable technique name."""
    return filepath.stem.replace("_", " ").title()


def ingest():
    settings = get_settings()
    docs_dir = Path(__file__).resolve().parents[2] / "cbt_documents"

    if not docs_dir.exists():
        print(f"Error: CBT documents directory not found at {docs_dir}")
        sys.exit(1)

    # Initialize ChromaDB
    client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)

    # Delete existing collection to re-ingest
    try:
        client.delete_collection(settings.CHROMA_COLLECTION)
        print("Cleared existing collection.")
    except Exception:
        pass

    collection = client.create_collection(
        name=settings.CHROMA_COLLECTION,
        metadata={"hnsw:space": "cosine"},
    )

    all_chunks = []
    all_ids = []
    all_metadatas = []

    md_files = sorted(docs_dir.glob("*.md"))
    print(f"Found {len(md_files)} CBT documents to ingest.\n")

    for filepath in md_files:
        technique = extract_technique_name(filepath)
        text = filepath.read_text(encoding="utf-8")
        chunks = chunk_text(text)

        print(f"  {technique}: {len(chunks)} chunks")

        for i, chunk in enumerate(chunks):
            chunk_id = f"{filepath.stem}_chunk_{i}"
            all_chunks.append(chunk)
            all_ids.append(chunk_id)
            all_metadatas.append({
                "source": filepath.name,
                "technique": technique,
                "chunk_index": i,
            })

    if not all_chunks:
        print("No chunks generated. Check your documents.")
        sys.exit(1)

    print(f"\nGenerating embeddings for {len(all_chunks)} chunks...")
    embeddings = embed_texts(all_chunks)

    print("Inserting into ChromaDB...")
    # Insert in batches of 100
    batch_size = 100
    for start in range(0, len(all_chunks), batch_size):
        end = start + batch_size
        collection.add(
            ids=all_ids[start:end],
            documents=all_chunks[start:end],
            embeddings=embeddings[start:end],
            metadatas=all_metadatas[start:end],
        )

    print(f"\nDone! Ingested {collection.count()} chunks into '{settings.CHROMA_COLLECTION}' collection.")


if __name__ == "__main__":
    ingest()
