"""
Celery async tasks for bulk scraping and background AI processing.
"""
import logging
from app.celery_worker import celery_app
from app.database import SessionLocal
from app.models.models import Book, BookInsight, BookChunk
from app.services import scraper, ai_service, vector_store

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="tasks.bulk_scrape")
def bulk_scrape_task(self, url: str, max_pages: int):
    """
    Background task: scrape books and ingest with AI insights + vector indexing.
    """
    db = SessionLocal()
    ingested = 0
    skipped = 0

    try:
        raw_books = scraper.scrape_books(base_url=url, max_pages=max_pages)

        for raw in raw_books:
            existing = db.query(Book).filter(Book.book_url == raw["book_url"]).first()
            if existing:
                skipped += 1
                continue

            book = Book(**raw)
            db.add(book)
            db.flush()

            # AI Insights
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
                    chunk_ids = vector_store.index_book(book.id, book.title, text)
                    chunks = vector_store.smart_chunk(text)
                    for idx, (chunk_id, chunk_text) in enumerate(zip(chunk_ids, chunks)):
                        db.add(BookChunk(
                            book_id=book.id,
                            chunk_index=idx,
                            content=chunk_text,
                            chroma_id=chunk_id,
                        ))
                    db.commit()
                except Exception as exc:
                    logger.warning("Vector indexing failed for '%s': %s", book.title, exc)

            ingested += 1
            # Update task state for progress tracking
            self.update_state(state="PROGRESS", meta={"ingested": ingested, "skipped": skipped})

    except Exception as exc:
        logger.error("Bulk scrape task failed: %s", exc)
        raise
    finally:
        db.close()

    return {"ingested": ingested, "skipped": skipped}
