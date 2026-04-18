"""
Pydantic request/response schemas.
"""
from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, List, Any
from datetime import datetime


# ──────────────────────────────────────────────
# Book schemas
# ──────────────────────────────────────────────

class BookBase(BaseModel):
    title: str
    author: Optional[str] = None
    rating: Optional[float] = None
    num_reviews: Optional[int] = None
    description: Optional[str] = None
    book_url: str
    cover_image_url: Optional[str] = None
    genre: Optional[str] = None
    price: Optional[str] = None
    availability: Optional[str] = None


class BookCreate(BookBase):
    pass


class InsightOut(BaseModel):
    id: int
    insight_type: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class BookOut(BookBase):
    id: int
    created_at: datetime
    insights: List[InsightOut] = []

    class Config:
        from_attributes = True


class BookListItem(BaseModel):
    """Lightweight book object for listing page."""
    id: int
    title: str
    author: Optional[str]
    rating: Optional[float]
    num_reviews: Optional[int]
    description: Optional[str]
    book_url: str
    cover_image_url: Optional[str]
    genre: Optional[str]
    price: Optional[str]
    availability: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# Scraper / upload schemas
# ──────────────────────────────────────────────

class ScrapeRequest(BaseModel):
    url: str = Field(
        default="https://books.toscrape.com",
        description="Base URL to scrape books from",
    )
    max_pages: int = Field(default=3, ge=1, le=20, description="Number of pages to scrape")


class ScrapeResponse(BaseModel):
    scraped: int
    skipped: int
    message: str


# ──────────────────────────────────────────────
# RAG / Q&A schemas
# ──────────────────────────────────────────────

class QuestionRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=1000)
    top_k: int = Field(default=5, ge=1, le=20)


class SourceCitation(BaseModel):
    book_id: int
    title: str
    author: Optional[str]
    relevance_score: float


class QuestionResponse(BaseModel):
    question: str
    answer: str
    sources: List[SourceCitation]
    cached: bool = False


# ──────────────────────────────────────────────
# QA History
# ──────────────────────────────────────────────

class QAHistoryOut(BaseModel):
    id: int
    question: str
    answer: str
    source_book_ids: Optional[List[int]]
    created_at: datetime

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# Recommendation
# ──────────────────────────────────────────────

class RecommendationOut(BaseModel):
    book: BookListItem
    reason: str
    similarity_score: float
