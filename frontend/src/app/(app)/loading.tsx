export default function AppLoading() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col" aria-busy="true">
      <div className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-[var(--border)] bg-[var(--surface)] z-40">
        <div className="flex items-center gap-3 px-6 h-16 border-b border-[var(--border)]">
          <div className="h-7 w-7 rounded-[var(--r-sm)] bg-[var(--border-soft)] animate-pulse" />
          <div className="h-4 w-28 rounded bg-[var(--border-soft)] animate-pulse" />
        </div>
        <nav className="flex-1 px-3 py-6 space-y-2" aria-hidden="true">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <div className="h-[18px] w-[18px] rounded bg-[var(--border-soft)] animate-pulse" />
              <div className="h-3.5 w-20 rounded bg-[var(--border-soft)] animate-pulse" />
            </div>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-[var(--border)]">
          <div className="h-3 w-28 rounded bg-[var(--border-soft)] animate-pulse" />
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg)]/95 backdrop-blur-sm border-t border-[var(--border)] flex items-stretch justify-around px-1" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center justify-center gap-0.5 min-h-[52px] flex-1">
            <div className="h-5 w-5 rounded bg-[var(--border-soft)] animate-pulse" />
            <div className="h-2.5 w-10 rounded bg-[var(--border-soft)] animate-pulse" />
          </div>
        ))}
      </div>

      <main className="flex-1 md:pl-60 pb-20 md:pb-0 max-w-[1100px] w-full mx-auto px-5 md:px-10 py-8 md:py-14 space-y-6">
        <div className="h-6 w-32 rounded bg-[var(--border-soft)] animate-pulse" />
        <div className="h-8 w-64 rounded bg-[var(--border-soft)] animate-pulse" />
        <div className="h-4 w-80 rounded bg-[var(--border-soft)] animate-pulse" />
        <div className="mt-8 space-y-3">
          <div className="h-12 w-full rounded-[var(--r-sm)] bg-[var(--border-soft)] animate-pulse" />
          <div className="h-12 w-full rounded-[var(--r-sm)] bg-[var(--border-soft)] animate-pulse" />
          <div className="h-12 w-2/3 rounded-[var(--r-sm)] bg-[var(--border-soft)] animate-pulse" />
        </div>
      </main>
    </div>
  )
}