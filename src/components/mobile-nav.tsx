'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  FileSpreadsheet,
  Settings,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'الرئيسية', icon: LayoutDashboard },
  { href: '/customers', label: 'العملاء', icon: Users },
  { href: '/contracts', label: 'العقود', icon: FileText },
  { href: '/invoices', label: 'الفواتير', icon: Receipt },
  { href: '/statement', label: 'كشف الحساب', icon: FileSpreadsheet },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              ن
            </div>
            نظام إدارة العملاء
          </SheetTitle>
        </SheetHeader>
        <nav className="p-3 space-y-1" onClick={() => setOpen(false)}>
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
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
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
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                pathname.startsWith('/users')
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <ShieldCheck className="h-5 w-5" />
              <span>المستخدمون</span>
            </Link>
          )}
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
              pathname.startsWith('/settings')
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            <Settings className="h-5 w-5" />
            <span>الإعدادات</span>
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
