"""RAG retrieval pipeline using ChromaDB."""

import chromadb
from app.config import get_settings
from app.rag.embeddings import embed_query

_client = None
_collection = None


def _get_collection():
    global _client, _collection
    if _collection is None:
        settings = get_settings()
        _client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
        _collection = _client.get_or_create_collection(
            name=settings.CHROMA_COLLECTION,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def retrieve(query: str, n_results: int = 5) -> list[dict]:
    """
    Retrieve the most relevant CBT document chunks for a query.
    Returns list of dicts with 'content', 'source', 'technique', 'score'.
    """
    collection = _get_collection()

    if collection.count() == 0:
        return []

    query_embedding = embed_query(query)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(n_results, collection.count()),
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    if results and results["documents"]:
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            chunks.append({
                "content": doc,
                "source": meta.get("source", "unknown"),
                "technique": meta.get("technique", "unknown"),
                "score": round(1 - dist, 4),  # cosine similarity
            })

    return chunks


def format_context(chunks: list[dict]) -> str:
    """Format retrieved chunks into a context string for the LLM."""
    if not chunks:
        return ""

    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        context_parts.append(
            f"[Reference {i} — {chunk['technique']}]\n{chunk['content']}"
        )

    return (
        "The following CBT technique references are relevant to this conversation. "
        "Use them to inform your response, but weave them naturally into your reply. "
        "Do not list or quote them directly.\n\n"
        + "\n\n---\n\n".join(context_parts)
    )
