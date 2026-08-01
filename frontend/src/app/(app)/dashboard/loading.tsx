export default function DashboardLoading() {
  return (
    <main className="flex-1 max-w-[1100px] w-full mx-auto px-5 md:px-10 py-8 md:py-14 space-y-8 md:space-y-10" aria-busy="true">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="w-28 h-3.5 bg-[var(--border-soft)] animate-pulse rounded mb-2" />
          <div className="w-56 h-9 bg-[var(--border-soft)] animate-pulse rounded mb-1" />
          <div className="w-80 h-4 bg-[var(--border-soft)] animate-pulse rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-9 rounded-[var(--r-sm)] bg-[var(--border-soft)] animate-pulse" />
          <div className="h-9 w-36 rounded-[var(--r-sm)] bg-[var(--border-soft)] animate-pulse" />
          <div className="h-9 w-32 rounded-[var(--r-sm)] bg-[var(--border-soft)] animate-pulse" />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] p-5 md:p-6 space-y-3 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-[var(--border-soft)] animate-pulse rounded" />
              <div className="h-4 w-4 bg-[var(--border-soft)] animate-pulse rounded" />
            </div>
            <div className="h-8 w-28 bg-[var(--border-soft)] animate-pulse rounded" />
            <div className="h-3 w-24 bg-[var(--border-soft)] animate-pulse rounded" />
          </div>
        ))}
      </div>

      <div className="h-3 w-28 bg-[var(--border-soft)] animate-pulse rounded mb-2" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] p-5 shadow-[var(--shadow-card)] space-y-2">
            <div className="h-4 w-4 bg-[var(--border-soft)] animate-pulse rounded" />
            <div className="h-4 w-16 bg-[var(--border-soft)] animate-pulse rounded" />
            <div className="h-8 w-24 bg-[var(--border-soft)] animate-pulse rounded" />
          </div>
        ))}
      </div>
    </main>
  )
}