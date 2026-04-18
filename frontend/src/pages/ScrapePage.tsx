import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Globe, Upload, CheckCircle, AlertCircle, Loader2,
  BookOpen, ChevronRight, Settings,
} from "lucide-react";
import toast from "react-hot-toast";
import { booksApi, type Book } from "../services/api";
import Header from "../components/Header";

const PRESET_SITES = [
  {
    label: "Books to Scrape",
    url: "https://books.toscrape.com",
    description: "1000+ books across all genres – the ideal demo dataset",
    badge: "Recommended",
  },
];

export default function ScrapePage() {
  const queryClient = useQueryClient();

  // Scrape form
  const [scrapeUrl, setScrapeUrl]     = useState("https://books.toscrape.com");
  const [maxPages, setMaxPages]       = useState(3);

  // Manual upload form
  const [manual, setManual] = useState({
    title: "", author: "", description: "", book_url: "",
    cover_image_url: "", genre: "", price: "", rating: "", num_reviews: "",
  });

  const scrapeMutation = useMutation({
    mutationFn: () => booksApi.scrape({ url: scrapeUrl, max_pages: maxPages }),
    onSuccess: (data) => {
      toast.success(`Scraped ${data.scraped} books! (${data.skipped} skipped)`);
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail ?? "Scraping failed");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: () =>
      booksApi.uploadBook({
        ...manual,
        rating: manual.rating ? Number(manual.rating) : undefined,
        num_reviews: manual.num_reviews ? Number(manual.num_reviews) : undefined,
      } as any),
    onSuccess: () => {
      toast.success("Book uploaded and insights generated!");
      queryClient.invalidateQueries({ queryKey: ["books"] });
      setManual({ title: "", author: "", description: "", book_url: "",
                  cover_image_url: "", genre: "", price: "", rating: "", num_reviews: "" });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail ?? "Upload failed");
    },
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Ingest Books" subtitle="Scrape from the web or manually add a book" />

      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-8">

        {/* ── Web Scraper ───────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-ink-100 shadow-card overflow-hidden">
          <div className="px-6 py-5 border-b border-ink-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent-500/10 flex items-center justify-center">
              <Globe size={18} className="text-accent-500" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink-800">Web Scraper</h2>
              <p className="text-xs text-ink-400 font-body">Collect books from websites automatically</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Preset sites */}
            <div>
              <p className="text-xs text-ink-500 font-body uppercase tracking-wider mb-3">Quick start</p>
              <div className="space-y-2">
                {PRESET_SITES.map((site) => (
                  <button
                    key={site.url}
                    className={`w-full text-left flex items-center justify-between p-4 rounded-xl border
                               transition-all duration-200 ${scrapeUrl === site.url
                                 ? "border-accent-400 bg-accent-500/5"
                                 : "border-ink-100 hover:border-ink-200 hover:bg-parchment-50"}`}
                    onClick={() => setScrapeUrl(site.url)}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-body font-medium text-ink-800">{site.label}</span>
                        {site.badge && (
                          <span className="text-[10px] bg-teal-400/15 text-teal-600 border border-teal-400/20
                                           px-2 py-0.5 rounded-full font-body font-medium">
                            {site.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-400 font-body mt-0.5">{site.description}</p>
                    </div>
                    <ChevronRight size={15} className="text-ink-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            <div className="divider" />

            {/* Form */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs text-ink-500 font-body block mb-1.5">Scrape URL</label>
                <input
                  type="url"
                  className="input-field"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  placeholder="https://books.toscrape.com"
                />
              </div>
              <div>
                <label className="text-xs text-ink-500 font-body block mb-1.5">
                  Pages to scrape (1–20)
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="input-field"
                  value={maxPages}
                  onChange={(e) => setMaxPages(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="bg-parchment-100 border border-parchment-300 rounded-xl p-4 text-xs text-ink-600 font-body">
              <p className="font-semibold mb-1 flex items-center gap-1.5">
                <Settings size={12} /> What happens during scraping?
              </p>
              <ol className="space-y-1 list-decimal list-inside text-ink-500">
                <li>Book metadata is scraped from each listing page</li>
                <li>AI generates summary, genre classification, and sentiment analysis</li>
                <li>Text is chunked and embedded into ChromaDB for RAG search</li>
                <li>Books are saved to MySQL — duplicates are skipped automatically</li>
              </ol>
            </div>

            <button
              className="btn-primary"
              onClick={() => scrapeMutation.mutate()}
              disabled={scrapeMutation.isPending || !scrapeUrl}
            >
              {scrapeMutation.isPending
                ? <><Loader2 size={16} className="animate-spin" /> Scraping…</>
                : <><Globe size={16} /> Start Scraping</>}
            </button>

            {/* Result */}
            {scrapeMutation.isSuccess && (
              <div className="flex items-start gap-2 p-4 bg-teal-400/8 border border-teal-400/20 rounded-xl animate-fade-in">
                <CheckCircle size={16} className="text-teal-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-body text-teal-700">{scrapeMutation.data.message}</p>
              </div>
            )}
            {scrapeMutation.isError && (
              <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl animate-fade-in">
                <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-body text-red-600">Scraping failed. Check your URL and try again.</p>
              </div>
            )}
          </div>
        </section>

        {/* ── Manual Upload ─────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl border border-ink-100 shadow-card overflow-hidden">
          <div className="px-6 py-5 border-b border-ink-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-ink-800/8 flex items-center justify-center">
              <Upload size={18} className="text-ink-700" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink-800">Manual Book Upload</h2>
              <p className="text-xs text-ink-400 font-body">Add a single book with its details</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: "title",         label: "Title *",               placeholder: "The Great Gatsby",              type: "text"   },
                { key: "author",        label: "Author",                placeholder: "F. Scott Fitzgerald",           type: "text"   },
                { key: "book_url",      label: "Book URL *",            placeholder: "https://example.com/book",      type: "url"    },
                { key: "cover_image_url",label: "Cover Image URL",      placeholder: "https://…/cover.jpg",           type: "url"    },
                { key: "genre",         label: "Genre",                 placeholder: "Fiction",                       type: "text"   },
                { key: "price",         label: "Price",                 placeholder: "£9.99",                         type: "text"   },
                { key: "rating",        label: "Rating (0–5)",          placeholder: "4.5",                           type: "number" },
                { key: "num_reviews",   label: "Number of Reviews",     placeholder: "120",                           type: "number" },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="text-xs text-ink-500 font-body block mb-1.5">{label}</label>
                  <input
                    type={type}
                    className="input-field"
                    placeholder={placeholder}
                    value={(manual as any)[key]}
                    onChange={(e) => setManual((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs text-ink-500 font-body block mb-1.5">Description</label>
              <textarea
                rows={3}
                className="input-field resize-none"
                placeholder="A brief description of the book…"
                value={manual.description}
                onChange={(e) => setManual((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <button
              className="btn-primary"
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending || !manual.title || !manual.book_url}
            >
              {uploadMutation.isPending
                ? <><Loader2 size={16} className="animate-spin" /> Processing…</>
                : <><BookOpen size={16} /> Upload & Generate Insights</>}
            </button>

            {uploadMutation.isSuccess && (
              <div className="flex items-start gap-2 p-4 bg-teal-400/8 border border-teal-400/20 rounded-xl animate-fade-in">
                <CheckCircle size={16} className="text-teal-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-body text-teal-700">
                  Book uploaded successfully with AI insights and vector indexing!
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
