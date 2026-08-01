export default function HistoryLoading() {
  return (
    <main className="flex-1 max-w-[1100px] w-full mx-auto px-5 md:px-10 py-8 md:py-14 space-y-6 md:space-y-8" aria-busy="true">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="w-20 h-11 bg-[var(--border-soft)] animate-pulse rounded mb-2" />
          <div className="w-32 h-8 bg-[var(--border-soft)] animate-pulse rounded mb-1" />
          <div className="w-64 h-4 bg-[var(--border-soft)] animate-pulse rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-64 rounded-[var(--r-sm)] bg-[var(--border-soft)] animate-pulse" />
          <div className="h-9 w-9 rounded-[var(--r-sm)] bg-[var(--border-soft)] animate-pulse" />
        </div>
      </header>

      <div className="flex gap-2 flex-wrap">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-24 rounded-[var(--r-sm)] bg-[var(--border-soft)] animate-pulse" />
        ))}
      </div>

      <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] overflow-hidden shadow-[var(--shadow-card)]">
        <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex gap-6">
            <div className="h-4 w-16 bg-[var(--border-soft)] animate-pulse rounded" />
            <div className="h-4 w-24 bg-[var(--border-soft)] animate-pulse rounded" />
            <div className="h-4 w-20 bg-[var(--border-soft)] animate-pulse rounded" />
            <div className="h-4 w-16 bg-[var(--border-soft)] animate-pulse rounded" />
          </div>
        </div>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex gap-6 px-5 py-3.5 border-b border-[var(--border-soft)] last:border-0">
            <div className="h-4 w-12 bg-[var(--border-soft)] animate-pulse rounded" />
            <div className="h-4 w-28 bg-[var(--border-soft)] animate-pulse rounded" />
            <div className="h-4 w-36 bg-[var(--border-soft)] animate-pulse rounded" />
            <div className="h-4 w-20 bg-[var(--border-soft)] animate-pulse rounded ml-auto" />
          </div>
        ))}
      </div>
    </main>
  )
}