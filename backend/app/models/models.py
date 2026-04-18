"""
SQLAlchemy ORM models for the book intelligence platform.
"""
from sqlalchemy import (
    Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean, JSON
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class Book(Base):
    """Stores scraped book metadata."""
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(512), nullable=False, index=True)
    author = Column(String(256), nullable=True)
    rating = Column(Float, nullable=True)
    num_reviews = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    book_url = Column(String(512), nullable=False, unique=True)
    cover_image_url = Column(String(1024), nullable=True)
    genre = Column(String(128), nullable=True)          # AI-generated
    price = Column(String(64), nullable=True)
    availability = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    insights = relationship("BookInsight", back_populates="book", cascade="all, delete-orphan")
    chunks = relationship("BookChunk", back_populates="book", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Book id={self.id} title='{self.title}'>"


class BookInsight(Base):
    """AI-generated insights for a book (summary, genre, sentiment, recommendations)."""
    __tablename__ = "book_insights"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    insight_type = Column(String(64), nullable=False)   # summary | genre | sentiment | recommendation
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    book = relationship("Book", back_populates="insights")


class BookChunk(Base):
    """Text chunks used for RAG (stored in MySQL for reference; vectors in ChromaDB)."""
    __tablename__ = "book_chunks"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    chroma_id = Column(String(128), nullable=True)   # ID in ChromaDB collection

    book = relationship("Book", back_populates="chunks")


class QAHistory(Base):
    """Persists user questions and RAG answers for chat history."""
    __tablename__ = "qa_history"

    id = Column(Integer, primary_key=True, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    source_book_ids = Column(JSON, nullable=True)   # list of book IDs cited
    created_at = Column(DateTime(timezone=True), server_default=func.now())
