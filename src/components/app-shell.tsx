'use client'

import { useSession } from 'next-auth/react'
import { Sidebar } from '@/components/sidebar'
import { Topbar } from '@/components/topbar'
import { Loader2 } from 'lucide-react'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // إذا لم تكن الجلسة متاحة (هذا لا يحدث لأن middleware يحجب، لكن للأمان)
  if (!session) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    return null
  }

  return (
    <div className="min-h-screen flex flex-col-reverse md:flex-row">
      <Sidebar />
      <div className="flex-1 md:mr-64 flex flex-col min-h-screen">
        <Topbar />
        <main className="flex-1 p-4 md:p-6 bg-muted/30">{children}</main>
      </div>
    </div>
  )
}
