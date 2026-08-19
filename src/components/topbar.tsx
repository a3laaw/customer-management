'use client'

import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ThemeToggle } from '@/components/theme-toggle'
import { MobileNav } from '@/components/mobile-nav'
import { UserMenu } from '@/components/user-menu'

const pageNames: Record<string, string> = {
  '/': 'الرئيسية',
  '/customers': 'العملاء',
  '/contracts': 'العقود',
  '/invoices': 'الفواتير',
  '/statement': 'كشف الحساب',
  '/settings': 'الإعدادات',
  '/users': 'المستخدمون',
  '/login': 'تسجيل الدخول',
}

export function Topbar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const pageName =
    Object.entries(pageNames).find(
      ([href]) =>
        href === '/' ? pathname === '/' : pathname.startsWith(href)
    )?.[1] ?? 'صفحة'

  return (
    <header className="h-16 border-b bg-background sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6">
      {/* قائمة موبايل (يسار في RTL) */}
      {session && status === 'authenticated' && <MobileNav />}

      <div className="flex-1">
        <h1 className="text-lg md:text-xl font-bold">{pageName}</h1>
      </div>

      <ThemeToggle />
      {session && status === 'authenticated' && <UserMenu />}
    </header>
  )
}
