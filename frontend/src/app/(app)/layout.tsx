'use client'

import Navbar from '@/components/navbar'
import { useAuthGuard } from '@/lib/use-auth-guard'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useAuthGuard()

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col">
      <Navbar />
      <main className="flex-1 md:pl-60 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  )
}
