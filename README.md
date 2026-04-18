# 📚 BookMind — AI-Powered Book Intelligence Platform

> A full-stack web application with **RAG (Retrieval-Augmented Generation)** pipeline, AI insights, web scraping automation, and an intelligent Q&A interface.

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                      React Frontend                        │
│           (Vite · TypeScript · Tailwind CSS)               │
│  Dashboard │ Library │ Book Detail │ Ask AI │ Ingest       │
└───────────────────────┬────────────────────────────────────┘
                        │ REST API (axios)
┌───────────────────────▼────────────────────────────────────┐
│                   FastAPI Backend                           │
│                                                            │
│  GET  /api/books              – list books                 │
│  GET  /api/books/:id          – book details + insights    │
│  GET  /api/books/:id/recommendations – similar books       │
│  GET  /api/books/qa/history   – chat history               │
│  POST /api/scrape             – trigger web scraper        │
│  POST /api/books/upload       – manual book upload         │
│  POST /api/ask                – RAG Q&A endpoint           │
└──────┬────────────────────────────────────┬────────────────┘
       │                                    │
┌──────▼──────┐   ┌────────────────┐  ┌────▼───────────────┐
│    MySQL    │   │   ChromaDB     │  │   Anthropic /      │
│  (metadata) │   │ (vector store) │  │   OpenAI /         │
└─────────────┘   └────────────────┘  │   LM Studio        │
                                      └────────────────────┘
                        │
               ┌────────▼────────┐
               │  Redis Cache    │
               │  + Celery       │
               └─────────────────┘
```

---

## ✨ Features

### Core Requirements ✅
- **Web Scraping** — Selenium + BeautifulSoup scrapes books.toscrape.com (multi-page)
- **MySQL Storage** — Full metadata: title, author, rating, reviews, description, URL, genre
- **FastAPI Backend** — All GET + POST REST APIs, auto-generated Swagger docs at `/docs`
- **AI Insights** — Summary, Genre Classification, Sentiment Analysis per book
- **RAG Pipeline** — Embeddings → ChromaDB similarity search → LLM answer with citations
- **React Frontend** — Dashboard, Library, Book Detail, Ask AI, Ingest pages

### Bonus Features ✅
- **Redis Caching** — RAG query results cached for 1 hour (avoid repeated LLM calls)
- **Smart Chunking** — Overlapping sliding-window chunking with sentence-boundary detection
- **Embedding-based Similarity** — Vector search for book recommendations
- **Celery Async Processing** — Background bulk scraping with progress tracking
- **Multi-page Scraping** — Configurable 1–20 pages
- **Loading States + UX Polish** — Shimmer skeletons, animated cards, toasts
- **Saving Chat History** — Q&A history persisted in MySQL, accessible via sidebar
- **Advanced Chunking** — Overlapping windows with semantic sentence splitting

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | **FastAPI** (Python 3.12) + Uvicorn |
| Database | **MySQL 8** (metadata) + **ChromaDB** (vectors) |
| Embeddings | **sentence-transformers** (`all-MiniLM-L6-v2`) |
| AI / LLM | **Anthropic Claude** / OpenAI GPT-4o-mini / LM Studio |
| Caching | **Redis** + `cachetools` |
| Async Tasks | **Celery** |
| Scraping | **Selenium** + **BeautifulSoup4** + `requests` |
| Frontend | **React 18** + **TypeScript** + **Vite** |
| Styling | **Tailwind CSS** (custom design system) |
| State | **Zustand** + **TanStack Query** |
| Routing | **React Router v6** |
| Containerisation | **Docker Compose** |

---

## ⚡ Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- MySQL 8 running locally **or** Docker
- Redis running locally **or** Docker
- An AI API key (Anthropic / OpenAI) **or** LM Studio running locally

---

### Option A — Docker Compose (Recommended)

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/book-intelligence.git
cd book-intelligence

# 2. Set your API key
cp backend/.env.example backend/.env
# Edit backend/.env and set ANTHROPIC_API_KEY (or OPENAI_API_KEY)

# 3. Start everything
docker-compose up --build

# Frontend  → http://localhost:3000
# Backend   → http://localhost:8000
# API Docs  → http://localhost:8000/docs
```

---

### Option B — Local Development

#### Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL, AI_PROVIDER, and your API key

# Start MySQL and create the database
mysql -u root -p -e "CREATE DATABASE book_intelligence;"

# Run the API server (tables auto-created on startup)
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend

npm install
npm run dev
# → http://localhost:5173
```

#### (Optional) Celery Worker

```bash
cd backend
celery -A app.celery_worker worker --loglevel=info
```

---

### Option C — LM Studio (No API Key Required)

1. Download [LM Studio](https://lmstudio.ai/) and load a model (Llama 3, Mistral, etc.)
2. Start the local server in LM Studio (default port 1234)
3. In `backend/.env` set:
   ```
   AI_PROVIDER=lmstudio
   LM_STUDIO_URL=http://localhost:1234/v1
   LM_STUDIO_MODEL=<your-model-name>
   ```

---

## 🌱 Seed Sample Data

To quickly test without scraping:

```bash
cd backend
python seed_sample_data.py
```

This adds 5 classic books (The Great Gatsby, 1984, To Kill a Mockingbird, Dune, The Name of the Wind) with pre-written AI insights and vector embeddings.

---

## 🗃️ Database Schema

```sql
-- Books — core metadata
CREATE TABLE books (
  id               INT PRIMARY KEY AUTO_INCREMENT,
  title            VARCHAR(512)  NOT NULL,
  author           VARCHAR(256),
  rating           FLOAT,
  num_reviews      INT,
  description      TEXT,
  book_url         VARCHAR(1024) NOT NULL UNIQUE,
  cover_image_url  VARCHAR(1024),
  genre            VARCHAR(128),
  price            VARCHAR(64),
  availability     VARCHAR(64),
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME ON UPDATE CURRENT_TIMESTAMP
);

-- AI Insights — one row per insight type per book
CREATE TABLE book_insights (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  book_id      INT NOT NULL REFERENCES books(id),
  insight_type VARCHAR(64) NOT NULL,   -- summary | genre | sentiment
  content      TEXT NOT NULL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Text chunks for RAG (Chroma IDs stored here)
CREATE TABLE book_chunks (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  book_id     INT NOT NULL REFERENCES books(id),
  chunk_index INT NOT NULL,
  content     TEXT NOT NULL,
  chroma_id   VARCHAR(128)
);

-- Q&A History
CREATE TABLE qa_history (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  question        TEXT NOT NULL,
  answer          TEXT NOT NULL,
  source_book_ids JSON,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📡 API Documentation

The full interactive docs are available at **`http://localhost:8000/docs`** (Swagger UI).

### GET Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/books` | List all books (supports `?search=`, `?genre=`, `?skip=`, `?limit=`) |
| `GET /api/books/{id}` | Full book details + all AI insights |
| `GET /api/books/{id}/recommendations` | Up to N similar books (vector + AI) |
| `GET /api/books/qa/history` | Recent Q&A chat history |
| `GET /health` | Health check |

### POST Endpoints

| Endpoint | Body | Description |
|----------|------|-------------|
| `POST /api/scrape` | `{ url, max_pages }` | Scrape + ingest books with AI insights |
| `POST /api/books/upload` | Book JSON | Manually add a book |
| `POST /api/ask` | `{ question, top_k }` | RAG Q&A with citations |

---

## 🤖 RAG Pipeline Detail

```
User question
     │
     ▼
[sentence-transformers]  ← embed question (all-MiniLM-L6-v2)
     │
     ▼
[ChromaDB]  ← cosine similarity search → top-k chunks
     │
     ▼
[Redis]  ← cache hit? return cached answer
     │ (cache miss)
     ▼
[LLM]  ← system prompt + retrieved context + question
     │
     ▼
Answer + source citations → saved to qa_history → returned to frontend
```

**Chunking strategy:** Overlapping sliding-window (chunk_size=400 chars, overlap=80 chars) with sentence-boundary detection for better semantic coherence.

---

## 💬 Sample Q&A

**Q:** What science fiction books do you have?
> Based on the collection, there are several science fiction titles available. *1984* by George Orwell explores a dystopian surveillance state, while *Dune* by Frank Herbert is an epic set on a desert planet... *(Sources: 1984 – 94% match, Dune – 91% match)*

**Q:** Which books have the highest ratings?
> The highest-rated books in the collection are: *To Kill a Mockingbird* (4.8★), *1984* (4.7★), and *Dune* (4.6★)... *(Sources: To Kill a Mockingbird – 89% match)*

**Q:** Recommend a book if I like fast-paced thrillers.
> Based on the available collection, if you enjoy fast-paced thrillers, you might appreciate books with high tension and suspense. Currently the collection is strongest in literary fiction and science fiction...

**Q:** Tell me about books with melancholic or nostalgic themes.
> *The Great Gatsby* has a distinctly elegiac and melancholic tone, dealing with themes of nostalgia, lost love, and the hollow American Dream. The sentiment analysis describes it as "bittersweet nostalgia"...

---

## 📁 Project Structure

```
book-intelligence/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + lifespan
│   │   ├── config.py            # Pydantic settings
│   │   ├── database.py          # SQLAlchemy engine + session
│   │   ├── models/
│   │   │   └── models.py        # ORM models
│   │   ├── schemas/
│   │   │   └── schemas.py       # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── books.py         # GET endpoints
│   │   │   └── ingest.py        # POST endpoints (scrape, upload, ask)
│   │   ├── services/
│   │   │   ├── scraper.py       # BeautifulSoup + Selenium scraper
│   │   │   ├── ai_service.py    # Anthropic / OpenAI / LM Studio wrapper
│   │   │   └── vector_store.py  # ChromaDB + embeddings + Redis cache
│   │   ├── celery_worker.py     # Celery app
│   │   └── tasks.py             # Async scraping tasks
│   ├── seed_sample_data.py      # Quick-start seeder
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx             # Entry point
│   │   ├── App.tsx              # Router
│   │   ├── index.css            # Tailwind + design tokens
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── BookCard.tsx
│   │   │   └── Skeletons.tsx
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── LibraryPage.tsx
│   │   │   ├── BookDetailPage.tsx
│   │   │   ├── AskPage.tsx
│   │   │   └── ScrapePage.tsx
│   │   ├── services/
│   │   │   └── api.ts           # Axios API client
│   │   └── store/
│   │       └── appStore.ts      # Zustand store
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

---

## Author

- Gopal Mehtre.