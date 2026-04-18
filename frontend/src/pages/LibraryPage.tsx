import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, BookOpen } from "lucide-react";
import { booksApi } from "../services/api";
import Header from "../components/Header";
import BookCard from "../components/BookCard";
import { BookCardSkeleton } from "../components/Skeletons";

export default function LibraryPage() {
  const [search, setSearch]   = useState("");
  const [genre, setGenre]     = useState("");
  const [sortBy, setSortBy]   = useState<"recent" | "rating" | "title">("recent");

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books"],
    queryFn: () => booksApi.list({ limit: 200 }),
  });

  // Extract unique genres
  const genres = useMemo(
    () => [...new Set(books.map((b) => b.genre).filter(Boolean) as string[])].sort(),
    [books]
  );

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...books];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.author ?? "").toLowerCase().includes(q) ||
          (b.description ?? "").toLowerCase().includes(q)
      );
    }
    if (genre) list = list.filter((b) => b.genre === genre);

    if (sortBy === "rating")
      list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else if (sortBy === "title")
      list.sort((a, b) => a.title.localeCompare(b.title));
    else
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return list;
  }, [books, search, genre, sortBy]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Library"
        subtitle={`${books.length} books in your collection`}
      />

      <main className="flex-1 p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
            <input
              type="text"
              placeholder="Search books, authors…"
              className="input-field pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Genre */}
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
            <select
              className="input-field pl-9 pr-8 appearance-none cursor-pointer w-44"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            >
              <option value="">All genres</option>
              {genres.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <select
            className="input-field appearance-none cursor-pointer w-40"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="recent">Recently added</option>
            <option value="rating">Highest rated</option>
            <option value="title">A–Z</option>
          </select>
        </div>

        {/* Results count */}
        {!isLoading && (
          <p className="text-sm text-ink-400 font-body mb-4">
            Showing <span className="font-medium text-ink-700">{filtered.length}</span> books
          </p>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => <BookCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-ink-100">
            <BookOpen size={44} className="text-ink-200 mx-auto mb-3" />
            <p className="font-display text-xl text-ink-400">No books found</p>
            <p className="text-sm text-ink-300 mt-1 font-body">
              Try a different search or clear the filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filtered.map((book, i) => (
              <BookCard key={book.id} book={book} delay={Math.min(i * 40, 400)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
