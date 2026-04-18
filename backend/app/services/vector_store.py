"""
Vector store service – manages ChromaDB collection and embedding generation.
Uses sentence-transformers for local embeddings.
Includes Redis-based caching for repeated queries.
"""
import hashlib
import json
import logging
from typing import List, Dict, Optional, Tuple

from app.config import settings

logger = logging.getLogger(__name__)

COLLECTION_NAME = "book_chunks"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # fast, small, good quality
_embedder = None


def get_embedder():
    global _embedder
    if _embedder is None:
        from sentence_transformers import SentenceTransformer
        _embedder = SentenceTransformer(EMBEDDING_MODEL)
        logger.info("Loaded embedding model: %s", EMBEDDING_MODEL)
    return _embedder


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Return normalised embeddings for a list of texts."""
    embedder = get_embedder()
    return embedder.encode(texts, normalize_embeddings=True).tolist()

_chroma_client = None
_chroma_collection = None


def get_collection():
    global _chroma_client, _chroma_collection
    if _chroma_collection is None:
        import chromadb
        _chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
        _chroma_collection = _chroma_client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("ChromaDB collection ready: %s", COLLECTION_NAME)
    return _chroma_collection


_redis_client = None


def _get_redis():
    global _redis_client
    if _redis_client is None:
        try:
            import redis
            _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            _redis_client.ping()
            logger.info("Redis connected for query caching")
        except Exception as exc:
            logger.warning("Redis unavailable (%s) – caching disabled", exc)
            _redis_client = False   # sentinel – don't retry
    return _redis_client if _redis_client else None


def _cache_get(key: str) -> Optional[str]:
    r = _get_redis()
    if r:
        try:
            return r.get(key)
        except Exception:
            pass
    return None


def _cache_set(key: str, value: str, ttl: int = 3600):
    r = _get_redis()
    if r:
        try:
            r.setex(key, ttl, value)
        except Exception:
            pass


def _query_cache_key(question: str, top_k: int) -> str:
    digest = hashlib.md5(f"{question}|{top_k}".encode()).hexdigest()
    return f"rag_query:{digest}"



def smart_chunk(text: str, chunk_size: int = 400, overlap: int = 80) -> List[str]:
    """
    Overlapping sliding-window chunking.
    Tries to split on sentence boundaries ('. ') for better semantic coherence.
    """
    if not text or len(text) < 50:
        return [text] if text else []

    # Split into sentences
    sentences = [s.strip() for s in text.replace("\n", " ").split(". ") if s.strip()]
    if not sentences:
        return [text]

    chunks: List[str] = []
    current: List[str] = []
    current_len = 0

    for sentence in sentences:
        sent_len = len(sentence)
        if current_len + sent_len > chunk_size and current:
            chunk_text = ". ".join(current) + "."
            chunks.append(chunk_text)
            # Overlap: keep last N characters worth of sentences
            overlap_sentences = []
            overlap_len = 0
            for s in reversed(current):
                if overlap_len + len(s) <= overlap:
                    overlap_sentences.insert(0, s)
                    overlap_len += len(s)
                else:
                    break
            current = overlap_sentences
            current_len = overlap_len

        current.append(sentence)
        current_len += sent_len

    if current:
        chunks.append(". ".join(current))

    return chunks


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def index_book(book_id: int, book_title: str, text: str) -> List[str]:
    """
    Chunk a book's text, embed the chunks, and upsert into ChromaDB.
    Returns list of Chroma document IDs.
    """
    collection = get_collection()

    chunks = smart_chunk(text)
    if not chunks:
        logger.warning("No chunks generated for book %d", book_id)
        return []

    ids = [f"book_{book_id}_chunk_{i}" for i in range(len(chunks))]
    embeddings = embed_texts(chunks)
    metadatas = [{"book_id": book_id, "book_title": book_title, "chunk_index": i} for i in range(len(chunks))]

    collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas,
    )
    logger.info("Indexed %d chunks for book '%s' (id=%d)", len(chunks), book_title, book_id)
    return ids


def similarity_search(
    question: str,
    top_k: int = 5,
) -> Tuple[List[Dict], bool]:
    """
    Embed the question and perform cosine similarity search in ChromaDB.

    Returns:
        (results, from_cache)
        results: list of {book_id, book_title, content, score}
    """
    cache_key = _query_cache_key(question, top_k)
    cached = _cache_get(cache_key)
    if cached:
        try:
            return json.loads(cached), True
        except Exception:
            pass

    collection = get_collection()
    question_embedding = embed_texts([question])[0]

    results = collection.query(
        query_embeddings=[question_embedding],
        n_results=min(top_k, collection.count() or 1),
        include=["documents", "metadatas", "distances"],
    )

    output: List[Dict] = []
    if results and results["documents"]:
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            output.append({
                "book_id": meta["book_id"],
                "book_title": meta["book_title"],
                "content": doc,
                "score": round(1 - dist, 4),   # cosine similarity
            })

    # Cache for 1 hour
    _cache_set(cache_key, json.dumps(output), ttl=3600)
    return output, False


def get_book_embedding(book_id: int, title: str) -> Optional[List[float]]:
    """Return the averaged embedding vector for a book (used for recommendations)."""
    collection = get_collection()
    try:
        results = collection.get(
            where={"book_id": book_id},
            include=["embeddings"],
        )
        if results and results["embeddings"]:
            import numpy as np
            avg = np.mean(results["embeddings"], axis=0).tolist()
            return avg
    except Exception as exc:
        logger.warning("Could not get embedding for book %d: %s", book_id, exc)
    return None


def get_similar_books_by_embedding(
    book_id: int,
    title: str,
    top_k: int = 5,
) -> List[Dict]:
    """Find similar books via vector similarity (excluding the source book)."""
    avg_embedding = get_book_embedding(book_id, title)
    if avg_embedding is None:
        return []

    collection = get_collection()
    try:
        results = collection.query(
            query_embeddings=[avg_embedding],
            n_results=top_k + 10,   # fetch extra to filter out same book
            include=["metadatas", "distances"],
        )
    except Exception as exc:
        logger.warning("Similarity search failed: %s", exc)
        return []

    seen_ids = set()
    similar: List[Dict] = []
    if results and results["metadatas"]:
        for meta, dist in zip(results["metadatas"][0], results["distances"][0]):
            bid = meta["book_id"]
            if bid == book_id or bid in seen_ids:
                continue
            seen_ids.add(bid)
            similar.append({"book_id": bid, "score": round(1 - dist, 4)})
            if len(similar) >= top_k:
                break

    return similar
