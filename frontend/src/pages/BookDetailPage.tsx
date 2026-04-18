import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Star, ExternalLink, BookOpen,
  Brain, Tag, MessageSquare, Smile, Lightbulb,
} from "lucide-react";
import { booksApi, type Insight } from "../services/api";
import Header from "../components/Header";
import BookCard from "../components/BookCard";
import { TextSkeleton } from "../components/Skeletons";

const INSIGHT_META: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  summary:        { icon: Brain,       label: "AI Summary",         color: "text-accent-500",  bg: "bg-accent-500/8 border-accent-400/20"  },
  genre:          { icon: Tag,         label: "Genre Classification",color: "text-teal-600",   bg: "bg-teal-400/8 border-teal-400/20"      },
  sentiment:      { icon: Smile,       label: "Sentiment Analysis", color: "text-amber-600",   bg: "bg-amber-400/8 border-amber-400/20"    },
  recommendation: { icon: Lightbulb,   label: "Recommendation",     color: "text-ink-600",     bg: "bg-ink-100 border-ink-200"             },
};

function InsightCard({ insight }: { insight: Insight }) {
  const meta = INSIGHT_META[insight.insight_type] ?? INSIGHT_META.summary;
  const Icon = meta.icon;
  return (
    <div className={`insight-card ${meta.bg} animate-fade-up`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} className={meta.color} />
        <span className={`text-xs font-body font-semibold uppercase tracking-wider ${meta.color}`}>
          {meta.label}
        </span>
      </div>
      <p className="text-sm font-body text-ink-700 leading-relaxed">{insight.content}</p>
    </div>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={i <= Math.round(rating) ? "star-filled fill-current" : "star-empty"}
        />
      ))}
      <span className="ml-1.5 font-mono text-sm text-ink-600 font-medium">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const bookId = Number(id);

  const { data: book, isLoading: bookLoading } = useQuery({
    queryKey: ["book", bookId],
    queryFn: () => booksApi.get(bookId),
    enabled: !!bookId,
  });

  const { data: recs = [], isLoading: recsLoading } = useQuery({
    queryKey: ["recommendations", bookId],
    queryFn: () => booksApi.recommendations(bookId, 3),
    enabled: !!bookId,
  });

  if (bookLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Book Detail" />
        <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
          <div className="skeleton h-64 w-full rounded-xl" />
          <TextSkeleton lines={5} />
        </main>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header title="Not Found" />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <BookOpen size={48} className="text-ink-200 mx-auto mb-4" />
            <p className="font-display text-xl text-ink-500">Book not found</p>
            <button className="btn-secondary mt-4" onClick={() => navigate("/books")}>
              ← Back to Library
            </button>
          </div>
        </main>
      </div>
    );
  }

  const summaryInsight   = book.insights?.find((i) => i.insight_type === "summary");
  const genreInsight     = book.insights?.find((i) => i.insight_type === "genre");
  const sentimentInsight = book.insights?.find((i) => i.insight_type === "sentiment");
  const otherInsights    = book.insights?.filter(
    (i) => !["summary", "genre", "sentiment"].includes(i.insight_type)
  ) ?? [];

  return (
    <div className="flex flex-col min-h-screen">
      <Header title={book.title} subtitle={book.author ? `by ${book.author}` : undefined} />

      <main className="flex-1 p-6">
        <button
          className="btn-secondary mb-6 text-sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={15} /> Back
        </button>

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT – Cover + meta */}
          <div className="space-y-5">
            {/* Cover */}
            <div className="rounded-2xl overflow-hidden bg-parchment-200 aspect-[2/3] shadow-book">
              {book.cover_image_url ? (
                <img
                  src={book.cover_image_url}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen size={56} className="text-ink-300" />
                </div>
              )}
            </div>

            {/* Meta card */}
            <div className="bg-white rounded-xl border border-ink-100 p-5 space-y-3">
              {book.rating !== null && <StarRow rating={book.rating} />}
              {book.num_reviews !== null && (
                <p className="text-xs text-ink-400 font-body">{book.num_reviews} reviews</p>
              )}
              {book.genre && (
                <span className="genre-pill">{book.genre}</span>
              )}
              {book.price && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-400 font-body">Price</span>
                  <span className="font-mono text-sm font-semibold text-ink-700">{book.price}</span>
                </div>
              )}
              {book.availability && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-ink-400 font-body">Availability</span>
                  <span className={`text-xs font-body ${
                    book.availability.toLowerCase().includes("stock")
                      ? "text-teal-600" : "text-ink-400"}`}>
                    {book.availability}
                  </span>
                </div>
              )}
              <a
                href={book.book_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full justify-center mt-2"
              >
                <ExternalLink size={14} /> View on Site
              </a>
            </div>
          </div>

          {/* RIGHT – Details + Insights */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & author */}
            <div>
              <h1 className="font-display text-3xl font-bold text-ink-800 leading-tight">
                {book.title}
              </h1>
              {book.author && (
                <p className="text-ink-400 font-body mt-1">by {book.author}</p>
              )}
            </div>

            {/* Description */}
            {book.description && (
              <div>
                <h2 className="text-sm font-body font-semibold text-ink-500 uppercase tracking-wider mb-2">
                  Description
                </h2>
                <p className="text-sm font-body text-ink-700 leading-relaxed">{book.description}</p>
              </div>
            )}

            <div className="divider" />

            {/* AI Insights */}
            <div>
              <h2 className="text-sm font-body font-semibold text-ink-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Brain size={14} /> AI Insights
              </h2>

              {(!book.insights || book.insights.length === 0) ? (
                <p className="text-sm text-ink-300 italic font-body">No AI insights generated yet.</p>
              ) : (
                <div className="space-y-3">
                  {summaryInsight   && <InsightCard insight={summaryInsight}   />}
                  {genreInsight     && <InsightCard insight={genreInsight}     />}
                  {sentimentInsight && <InsightCard insight={sentimentInsight} />}
                  {otherInsights.map((ins) => <InsightCard key={ins.id} insight={ins} />)}
                </div>
              )}
            </div>

            {/* Recommendations */}
            <div>
              <h2 className="text-sm font-body font-semibold text-ink-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <MessageSquare size={14} /> You Might Also Like
              </h2>
              {recsLoading ? (
                <TextSkeleton lines={2} />
              ) : recs.length === 0 ? (
                <p className="text-sm text-ink-300 italic font-body">No recommendations yet. Add more books!</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {recs.map(({ book: rec, reason, similarity_score }) => (
                    <div
                      key={rec.id}
                      className="bg-white rounded-xl border border-ink-100 p-3 cursor-pointer
                                 hover:border-accent-400 hover:shadow-card transition-all duration-200"
                      onClick={() => navigate(`/books/${rec.id}`)}
                    >
                      <p className="font-display text-sm font-semibold text-ink-800 line-clamp-2">{rec.title}</p>
                      <p className="text-xs text-ink-400 mt-1 line-clamp-2 font-body">{reason}</p>
                      <p className="text-[10px] font-mono text-teal-600 mt-1.5">
                        {Math.round(similarity_score * 100)}% match
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
