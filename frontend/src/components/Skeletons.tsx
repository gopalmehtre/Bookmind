export function BookCardSkeleton() {
  return (
    <div className="bg-parchment-50 rounded-xl border border-ink-100 overflow-hidden">
      <div className="skeleton h-44 w-full" />
      <div className="p-4 space-y-2">
        <div className="skeleton h-4 w-4/5" />
        <div className="skeleton h-3 w-1/3" />
        <div className="skeleton h-3 w-full mt-3" />
        <div className="skeleton h-3 w-5/6" />
        <div className="skeleton h-3 w-4/6" />
      </div>
    </div>
  );
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton h-3 ${i === lines - 1 ? "w-3/5" : "w-full"}`} />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-5 border border-ink-100 space-y-3">
      <div className="skeleton h-3 w-1/3" />
      <div className="skeleton h-8 w-1/2" />
      <div className="skeleton h-2 w-2/3" />
    </div>
  );
}
