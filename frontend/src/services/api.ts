import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
});

// ── Types ──────────────────────────────────────────────────────────────────

export interface Insight {
  id: number;
  insight_type: "summary" | "genre" | "sentiment" | "recommendation";
  content: string;
  created_at: string;
}

export interface Book {
  id: number;
  title: string;
  author: string | null;
  rating: number | null;
  num_reviews: number | null;
  description: string | null;
  book_url: string;
  cover_image_url: string | null;
  genre: string | null;
  price: string | null;
  availability: string | null;
  created_at: string;
  insights?: Insight[];
}

export interface ScrapeRequest  { url?: string; max_pages?: number; }
export interface ScrapeResponse { scraped: number; skipped: number; message: string; }

export interface QuestionRequest  { question: string; top_k?: number; }
export interface SourceCitation   { book_id: number; title: string; author: string | null; relevance_score: number; }
export interface QuestionResponse { question: string; answer: string; sources: SourceCitation[]; cached: boolean; }

export interface QAHistory {
  id: number;
  question: string;
  answer: string;
  source_book_ids: number[] | null;
  created_at: string;
}

export interface Recommendation {
  book: Book;
  reason: string;
  similarity_score: number;
}

// ── API calls ──────────────────────────────────────────────────────────────

export const booksApi = {
  list: (params?: { skip?: number; limit?: number; genre?: string; search?: string }) =>
    api.get<Book[]>("/books", { params }).then((r) => r.data),

  get: (id: number) =>
    api.get<Book>(`/books/${id}`).then((r) => r.data),

  recommendations: (id: number, top_k = 3) =>
    api.get<Recommendation[]>(`/books/${id}/recommendations`, { params: { top_k } }).then((r) => r.data),

  qaHistory: (limit = 20) =>
    api.get<QAHistory[]>("/books/qa/history", { params: { limit } }).then((r) => r.data),

  scrape: (payload: ScrapeRequest) =>
    api.post<ScrapeResponse>("/scrape", payload).then((r) => r.data),

  uploadBook: (payload: Partial<Book>) =>
    api.post<Book>("/books/upload", payload).then((r) => r.data),

  ask: (payload: QuestionRequest) =>
    api.post<QuestionResponse>("/ask", payload).then((r) => r.data),
};
