export default function ExpensesLoading() {
  return (
    <main className="flex-1 max-w-[1100px] w-full mx-auto px-5 md:px-10 py-8 md:py-14 space-y-6 md:space-y-8" aria-busy="true">
      <header>
        <div className="w-32 h-3.5 bg-[var(--border-soft)] animate-pulse rounded mb-2" />
        <div className="w-64 h-9 bg-[var(--border-soft)] animate-pulse rounded mb-1" />
        <div className="w-96 h-4 bg-[var(--border-soft)] animate-pulse rounded" />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
        <section className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] p-5 md:p-6 shadow-[var(--shadow-card)] space-y-4">
          <div className="h-4 w-24 bg-[var(--border-soft)] animate-pulse rounded" />
          <div className="border border-dashed border-[var(--border-strong)] rounded-[var(--r-md)] p-8 flex flex-col items-center gap-3">
            <div className="h-10 w-10 bg-[var(--border-soft)] animate-pulse rounded-full" />
            <div className="h-3 w-32 bg-[var(--border-soft)] animate-pulse rounded" />
            <div className="h-3 w-24 bg-[var(--border-soft)] animate-pulse rounded" />
          </div>
          <div className="h-10 w-full rounded-[var(--r-sm)] bg-[var(--fg)]/20 animate-pulse" />
        </section>

        <section className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] p-5 md:p-6 shadow-[var(--shadow-card)] space-y-4">
          <div className="h-4 w-40 bg-[var(--border-soft)] animate-pulse rounded" />
          <div className="space-y-3 pt-1">
            <div className="h-12 rounded-[var(--r-sm)] bg-[var(--border-soft)] animate-pulse" />
            <div className="h-12 rounded-[var(--r-sm)] bg-[var(--border-soft)] animate-pulse" />
            <div className="h-12 rounded-[var(--r-sm)] bg-[var(--border-soft)] animate-pulse" />
            <div className="h-12 rounded-[var(--r-sm)] bg-[var(--border-soft)] animate-pulse" />
          </div>
        </section>
      </div>
    </main>
  )
}