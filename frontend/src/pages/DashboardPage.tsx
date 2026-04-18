import { useQuery } from "@tanstack/react-query";
import { BookOpen, Star, Tag, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { booksApi } from "../services/api";
import Header from "../components/Header";
import BookCard from "../components/BookCard";
import { BookCardSkeleton, StatCardSkeleton } from "../components/Skeletons";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 border border-ink-100 shadow-card animate-fade-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-ink-400 font-body uppercase tracking-wider">{label}</p>
          <p className="font-display text-3xl font-bold text-ink-800 mt-1">{value}</p>
          {sub && <p className="text-xs text-ink-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books"],
    queryFn: () => booksApi.list({ limit: 200 }),
  });

  // Compute stats
  const totalBooks    = books.length;
  const avgRating     = books.length
    ? (books.filter((b) => b.rating).reduce((s, b) => s + (b.rating ?? 0), 0) /
       books.filter((b) => b.rating).length).toFixed(1)
    : "–";
  const genres = [...new Set(books.map((b) => b.genre).filter(Boolean))].length;
  const withAI = books.filter((b) => b.insights && b.insights.length > 0).length;

  // Recent + top rated
  const recent    = [...books].slice(0, 6);
  const topRated  = [...books]
    .filter((b) => b.rating !== null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Dashboard" subtitle="Your AI-powered book intelligence overview" />

      <main className="flex-1 p-6 space-y-8">
        {/* Stats */}
        <section>
          <h2 className="section-title mb-4">Overview</h2>
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={BookOpen}   label="Total Books"  value={totalBooks}  sub="in library"               color="bg-accent-500" />
              <StatCard icon={Star}       label="Avg Rating"   value={avgRating}   sub="across all books"         color="bg-amber-400"  />
              <StatCard icon={Tag}        label="Genres"       value={genres}      sub="unique categories"        color="bg-teal-500"   />
              <StatCard icon={TrendingUp} label="AI Insights"  value={withAI}      sub="books with AI analysis"   color="bg-ink-600"    />
            </div>
          )}
        </section>

        {/* Top Rated */}
        {topRated.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">⭐ Top Rated</h2>
              <Link to="/books" className="text-sm text-accent-500 hover:underline font-body">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topRated.map((book, i) => (
                <BookCard key={book.id} book={book} delay={i * 80} />
              ))}
            </div>
          </section>
        )}

        {/* Recently Added */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">🕐 Recently Added</h2>
            <Link to="/books" className="text-sm text-accent-500 hover:underline font-body">
              View all →
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <BookCardSkeleton key={i} />)}
            </div>
          ) : recent.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-ink-100">
              <BookOpen size={40} className="text-ink-200 mx-auto mb-3" />
              <p className="font-display text-lg text-ink-400">No books yet</p>
              <p className="text-sm text-ink-300 mt-1 font-body">
                Go to{" "}
                <Link to="/scrape" className="text-accent-500 underline">
                  Ingest
                </Link>{" "}
                to scrape your first books.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {recent.map((book, i) => (
                <BookCard key={book.id} book={book} delay={i * 60} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
