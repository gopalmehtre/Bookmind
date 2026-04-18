"""
Books router – GET endpoints for listing, detail, and recommendations.
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Book, BookInsight, QAHistory
from app.schemas.schemas import BookOut, BookListItem, RecommendationOut, QAHistoryOut
from app.services import ai_service, vector_store

router = APIRouter(prefix="/books", tags=["Books"])


# ─────────────────────────────────────────────────────────────────────────────
# GET /books – list all books
# ─────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[BookListItem], summary="List all books")
def list_books(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    genre: Optional[str] = Query(None, description="Filter by genre"),
    search: Optional[str] = Query(None, description="Search by title/author"),
    db: Session = Depends(get_db),
):
    """Return a paginated list of all books stored in the database."""
    query = db.query(Book)

    if genre:
        query = query.filter(Book.genre.ilike(f"%{genre}%"))

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            Book.title.ilike(pattern) | Book.author.ilike(pattern)
        )

    books = query.order_by(Book.created_at.desc()).offset(skip).limit(limit).all()
    return books


# ─────────────────────────────────────────────────────────────────────────────
# GET /books/{id} – full book detail with insights
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{book_id}", response_model=BookOut, summary="Get book details")
def get_book(book_id: int, db: Session = Depends(get_db)):
    """Return full details for a single book, including AI insights."""
    book = db.query(Book).filter(Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


# ─────────────────────────────────────────────────────────────────────────────
# GET /books/{id}/recommendations – related books
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/{book_id}/recommendations", response_model=List[RecommendationOut], summary="Recommend similar books")
def recommend_books(book_id: int, top_k: int = Query(3, ge=1, le=10), db: Session = Depends(get_db)):
    """
    Return up to `top_k` books similar to the given book.
    Uses embedding-based vector similarity first; falls back to AI recommendation.
    """
    source = db.query(Book).filter(Book.id == book_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Book not found")

    # Strategy 1: embedding-based similarity
    similar = vector_store.get_similar_books_by_embedding(book_id, source.title, top_k=top_k)

    if similar:
        results: List[RecommendationOut] = []
        for item in similar:
            b = db.query(Book).filter(Book.id == item["book_id"]).first()
            if b:
                results.append(RecommendationOut(
                    book=b,
                    reason=f"Similar content and style to '{source.title}'",
                    similarity_score=item["score"],
                ))
        if results:
            return results

    # Strategy 2: AI recommendation (LLM selects from all books)
    candidates = [
        {"id": b.id, "title": b.title, "author": b.author, "genre": b.genre}
        for b in db.query(Book).filter(Book.id != book_id).limit(50).all()
    ]
    ai_recs = ai_service.generate_book_recommendations(
        source_title=source.title,
        source_genre=source.genre,
        source_description=source.description,
        candidate_books=candidates,
    )

    results = []
    for rec in ai_recs[:top_k]:
        b = db.query(Book).filter(Book.id == rec.get("book_id")).first()
        if b:
            results.append(RecommendationOut(
                book=b,
                reason=rec.get("reason", "AI recommended"),
                similarity_score=0.8,
            ))

    return results


# ─────────────────────────────────────────────────────────────────────────────
# GET /books/history – Q&A history
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/qa/history", response_model=List[QAHistoryOut], summary="Q&A chat history")
def qa_history(limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)):
    """Return the most recent Q&A interactions."""
    return db.query(QAHistory).order_by(QAHistory.created_at.desc()).limit(limit).all()
