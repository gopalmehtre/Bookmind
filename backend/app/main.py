"""
Main FastAPI application – Book Intelligence Platform.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import create_tables
from app.routers import books, ingest

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Book Intelligence API …")
    create_tables()
    logger.info("Database tables ready.")
    yield
    logger.info("Shutting down.")

app = FastAPI(
    title="Book Intelligence Platform",
    description=(
        "Full-stack AI-powered book platform with RAG querying, "
        "AI insights (summary, genre, sentiment, recommendations), "
        "and web-scraping automation."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(books.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")

@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "book-intelligence-api"}


@app.get("/", tags=["Health"])
def root():
    return JSONResponse({"message": "Book Intelligence Platform API", "docs": "/docs"})
