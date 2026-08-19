'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

const navItems = [
  { href: '/', label: 'الرئيسية', icon: LayoutDashboard },
  { href: '/customers', label: 'العملاء', icon: Users },
  { href: '/contracts', label: 'العقود', icon: FileText },
  { href: '/invoices', label: 'الفواتير', icon: Receipt },
  { href: '/statement', label: 'كشف الحساب', icon: FileSpreadsheet },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:right-0 border-l bg-sidebar">
      <div className="flex h-16 items-center gap-2 px-6 border-b">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
          ن
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold leading-tight">
            نظام إدارة
          </span>
          <span className="text-xs text-muted-foreground leading-tight">
            العملاء والعقود
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                buttonVariants({ variant: active ? 'secondary' : 'ghost' }),
                'justify-start gap-3 h-11'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          )
        })}

        {isAdmin && (
          <Link
            href="/users"
            className={cn(
              buttonVariants({
                variant: pathname.startsWith('/users') ? 'secondary' : 'ghost',
              }),
              'justify-start gap-3 h-11'
            )}
          >
            <ShieldCheck className="h-5 w-5" />
            <span>المستخدمون</span>
          </Link>
        )}

        <Link
          href="/settings"
          className={cn(
            buttonVariants({
              variant: pathname.startsWith('/settings') ? 'secondary' : 'ghost',
            }),
            'justify-start gap-3 h-11'
          )}
        >
          <Settings className="h-5 w-5" />
          <span>الإعدادات</span>
        </Link>
      </nav>

      {session?.user && (
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
              {session.user.name?.charAt(0) || 'م'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {session.user.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {session.user.role === 'admin'
                  ? 'مدير'
                  : session.user.role === 'manager'
                  ? 'مشرف'
                  : 'مستخدم'}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
