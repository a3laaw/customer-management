'use client'

import dynamic from 'next/dynamic'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

// تحميل SessionProvider بشكل ديناميكي (lazy)
// هذا يفادي خطأ ERR_INVALID_URL في Vercel build عند توليد صفحات static
// لأن next-auth يحاول استخدام NEXTAUTH_URL عند الاستيراد المباشر
const SessionProvider = dynamic(
  () => import('next-auth/react').then((m) => m.SessionProvider),
  { ssr: false }
) as React.ComponentType<{ children: React.ReactNode }>

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  )
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  )
}
