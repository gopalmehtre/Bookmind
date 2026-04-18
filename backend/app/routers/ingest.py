"""
Ingest router – POST endpoints for scraping/uploading books and RAG Q&A.
"""
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Book, BookInsight, BookChunk, QAHistory
from app.schemas.schemas import (
    ScrapeRequest, ScrapeResponse,
    QuestionRequest, QuestionResponse, SourceCitation,
    BookCreate, BookOut,
)
from app.services import scraper, ai_service, vector_store

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Ingest & RAG"])


# ─────────────────────────────────────────────────────────────────────────────
# POST /scrape – trigger web scraper
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/scrape", response_model=ScrapeResponse, summary="Scrape and ingest books")
def scrape_and_ingest(
    payload: ScrapeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Scrape books from the provided URL (default: books.toscrape.com),
    store them in MySQL, generate AI insights, and index vectors in ChromaDB.
    """
    raw_books = scraper.scrape_books(base_url=payload.url, max_pages=payload.max_pages)

    ingested = 0
    skipped = 0

    for raw in raw_books:
        # De-duplicate on book_url
        existing = db.query(Book).filter(Book.book_url == raw["book_url"]).first()
        if existing:
            skipped += 1
            continue

        book = Book(**raw)
        db.add(book)
        db.flush()   # get book.id before commit

        # ── AI Insights ────────────────────────────────────────────
        try:
            summary_text = ai_service.generate_summary(
                book.title, book.description, book.genre
            )
            db.add(BookInsight(book_id=book.id, insight_type="summary", content=summary_text))
        except Exception as exc:
            logger.warning("Summary generation failed for '%s': %s", book.title, exc)

        try:
            genre_text = ai_service.classify_genre(book.title, book.description)
            # Also update the genre column if it was empty
            if not book.genre:
                book.genre = genre_text
            db.add(BookInsight(book_id=book.id, insight_type="genre", content=genre_text))
        except Exception as exc:
            logger.warning("Genre classification failed for '%s': %s", book.title, exc)

        try:
            sentiment_text = ai_service.analyze_sentiment(book.description, book.title)
            db.add(BookInsight(book_id=book.id, insight_type="sentiment", content=sentiment_text))
        except Exception as exc:
            logger.warning("Sentiment analysis failed for '%s': %s", book.title, exc)

        db.commit()
        db.refresh(book)

        # ── Vector indexing (background) ───────────────────────────
        text_to_index = " ".join(filter(None, [book.title, book.author, book.description]))
        if text_to_index.strip():
            try:
                chunk_ids = vector_store.index_book(book.id, book.title, text_to_index)
                for idx, chroma_id in enumerate(chunk_ids):
                    chunk_text = vector_store.smart_chunk(text_to_index)[idx] \
                        if idx < len(vector_store.smart_chunk(text_to_index)) else ""
                    db.add(BookChunk(
                        book_id=book.id,
                        chunk_index=idx,
                        content=chunk_text,
                        chroma_id=chroma_id,
                    ))
                db.commit()
            except Exception as exc:
                logger.warning("Indexing failed for '%s': %s", book.title, exc)

        ingested += 1

    return ScrapeResponse(
        scraped=ingested,
        skipped=skipped,
        message=f"Successfully ingested {ingested} books ({skipped} duplicates skipped).",
    )


# ─────────────────────────────────────────────────────────────────────────────
# POST /books/upload – manually add a single book
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/books/upload", response_model=BookOut, summary="Manually upload a book")
def upload_book(payload: BookCreate, db: Session = Depends(get_db)):
    """
    Manually submit book data (title, author, URL, etc.) without scraping.
    Generates AI insights and indexes vectors automatically.
    """
    existing = db.query(Book).filter(Book.book_url == payload.book_url).first()
    if existing:
        raise HTTPException(status_code=409, detail="Book with this URL already exists.")

    book = Book(**payload.model_dump())
    db.add(book)
    db.flush()

    # AI insights
    for fn, itype in [
        (lambda: ai_service.generate_summary(book.title, book.description, book.genre), "summary"),
        (lambda: ai_service.classify_genre(book.title, book.description), "genre"),
        (lambda: ai_service.analyze_sentiment(book.description, book.title), "sentiment"),
    ]:
        try:
            content = fn()
            db.add(BookInsight(book_id=book.id, insight_type=itype, content=content))
        except Exception as exc:
            logger.warning("%s insight failed: %s", itype, exc)

    db.commit()
    db.refresh(book)

    # Vector indexing
    text = " ".join(filter(None, [book.title, book.author, book.description]))
    if text.strip():
        try:
            vector_store.index_book(book.id, book.title, text)
        except Exception as exc:
            logger.warning("Vector indexing failed: %s", exc)

    return book


# ─────────────────────────────────────────────────────────────────────────────
# POST /ask – RAG question-answering endpoint
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/ask", response_model=QuestionResponse, summary="Ask a question (RAG)")
def ask_question(payload: QuestionRequest, db: Session = Depends(get_db)):
    """
    Full RAG pipeline:
    1. Embed the question using sentence-transformers
    2. Retrieve top-k similar chunks from ChromaDB
    3. Build context from retrieved chunks
    4. Generate a grounded answer with the LLM
    5. Persist to QA history
    Returns answer + source citations.
    """
    # Step 1+2: embed & retrieve
    chunks, from_cache = vector_store.similarity_search(payload.question, top_k=payload.top_k)

    if not chunks:
        return QuestionResponse(
            question=payload.question,
            answer=(
                "I don't have enough book data to answer that question. "
                "Please scrape some books first using the /scrape endpoint."
            ),
            sources=[],
            cached=False,
        )

    # Step 3+4: generate answer
    answer = ai_service.generate_rag_answer(payload.question, chunks)

    # Step 5: build citations
    seen = {}
    sources: List[SourceCitation] = []
    for chunk in chunks:
        bid = chunk["book_id"]
        if bid not in seen:
            b = db.query(Book).filter(Book.id == bid).first()
            if b:
                seen[bid] = True
                sources.append(SourceCitation(
                    book_id=bid,
                    title=chunk["book_title"],
                    author=b.author,
                    relevance_score=chunk["score"],
                ))

    # Persist to history
    db.add(QAHistory(
        question=payload.question,
        answer=answer,
        source_book_ids=[s.book_id for s in sources],
    ))
    db.commit()

    return QuestionResponse(
        question=payload.question,
        answer=answer,
        sources=sources,
        cached=from_cache,
    )
