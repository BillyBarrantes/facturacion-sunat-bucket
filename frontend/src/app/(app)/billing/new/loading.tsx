export default function NewInvoiceLoading() {
  return (
    <main className="flex-1 max-w-[1100px] w-full mx-auto px-5 md:px-10 py-8 md:py-14 space-y-8 md:space-y-10" aria-busy="true">
      <header>
        <div className="w-20 h-3 rounded bg-[var(--border-soft)] animate-pulse mb-3" />
        <div className="w-72 h-8 rounded bg-[var(--border-soft)] animate-pulse mb-2" />
        <div className="w-96 h-4 rounded bg-[var(--border-soft)] animate-pulse" />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] p-6 shadow-[var(--shadow-card)] space-y-5">
          <div className="flex gap-1 p-1 bg-[var(--surface)] rounded-[var(--r-sm)] border border-[var(--border-soft)]">
            <div className="flex-1 h-9 rounded-[6px] bg-[var(--border-soft)] animate-pulse" />
            <div className="flex-1 h-9 rounded-[6px] bg-[var(--border-soft)] animate-pulse" />
          </div>
          <div className="space-y-4">
            <div className="h-10 rounded-[var(--r-sm)] bg-[var(--border-soft)] animate-pulse" />
            <div className="h-10 rounded-[var(--r-sm)] bg-[var(--border-soft)] animate-pulse" />
            <div className="h-10 rounded-[var(--r-sm)] bg-[var(--border-soft)] animate-pulse" />
            <div className="h-24 rounded-[var(--r-sm)] bg-[var(--border-soft)] animate-pulse" />
          </div>
        </section>

        <section className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-lg)] p-6 shadow-[var(--shadow-card)] space-y-5">
          <div className="flex gap-3 p-1 bg-[var(--surface)] rounded-[var(--r-sm)] border border-[var(--border-soft)]">
            <div className="flex-1 h-9 rounded-[6px] bg-[var(--border-soft)] animate-pulse" />
            <div className="flex-1 h-9 rounded-[6px] bg-[var(--border-soft)] animate-pulse" />
          </div>
          <div className="space-y-4 pt-2">
            <div className="h-12 rounded-[var(--r-sm)] bg-[var(--border-soft)] animate-pulse" />
            <div className="h-12 rounded-[var(--r-sm)] bg-[var(--border-soft)] animate-pulse" />
            <div className="h-12 rounded-[var(--r-sm)] bg-[var(--border-soft)] animate-pulse" />
          </div>
          <div className="h-10 w-full rounded-[var(--r-sm)] bg-[var(--fg)]/20 animate-pulse mt-4" />
        </section>
      </div>
    </main>
  )
}