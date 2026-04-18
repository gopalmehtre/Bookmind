import { useNavigate } from "react-router-dom";
import { Star, ExternalLink, BookOpen } from "lucide-react";
import type { Book } from "../services/api";

interface BookCardProps {
  book: Book;
  delay?: number;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={11}
          className={i <= Math.round(rating) ? "star-filled fill-current" : "star-empty"}
        />
      ))}
      <span className="ml-1 text-xs text-ink-400 font-mono">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function BookCard({ book, delay = 0 }: BookCardProps) {
  const navigate = useNavigate();

  return (
    <div
      className="book-card animate-fade-up p-0 overflow-hidden flex flex-col"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both", opacity: 0 }}
      onClick={() => navigate(`/books/${book.id}`)}
    >
      {/* Cover image */}
      <div className="relative h-44 bg-parchment-200 flex-shrink-0">
        {book.cover_image_url ? (
          <img
            src={book.cover_image_url}
            alt={book.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen size={40} className="text-ink-300" />
          </div>
        )}

        {/* Genre pill */}
        {book.genre && (
          <div className="absolute top-2 left-2">
            <span className="genre-pill text-[10px] bg-parchment-50/90 backdrop-blur-sm">
              {book.genre}
            </span>
          </div>
        )}

        {/* Price */}
        {book.price && (
          <div className="absolute top-2 right-2">
            <span className="text-[11px] font-mono font-medium bg-accent-500 text-parchment-50
                             px-2 py-0.5 rounded-md">
              {book.price}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-display text-base font-semibold text-ink-800 leading-tight line-clamp-2 mb-1">
          {book.title}
        </h3>
        {book.author && (
          <p className="text-xs text-ink-400 font-body mb-2">by {book.author}</p>
        )}

        {book.rating !== null && <StarRating rating={book.rating} />}

        {book.description && (
          <p className="text-xs text-ink-500 font-body leading-relaxed line-clamp-3 mt-2 flex-1">
            {book.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-100">
          <span
            className={`text-[10px] font-body px-2 py-0.5 rounded-full
              ${book.availability?.toLowerCase().includes("stock")
                ? "bg-teal-400/10 text-teal-600 border border-teal-400/20"
                : "bg-parchment-200 text-ink-400"}`}
          >
            {book.availability ?? "Unknown"}
          </span>
          <a
            href={book.book_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-300 hover:text-accent-500 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  );
}
