'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { Topbar } from '@/components/topbar'
import { Loader2 } from 'lucide-react'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  // إعادة التوجيه لصفحة الدخول لو لم توجد جلسة
  // (للأمان فقط — middleware يحمي أيضًا)
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.replace('/login')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
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
