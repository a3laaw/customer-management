'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Users,
  FileText,
  Receipt,
  Wallet,
  TrendingUp,
  ArrowLeft,
  Plus,
  Loader2,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  formatAmount,
  formatAmountWithCurrency,
  formatDate,
} from '@/lib/utils'

interface Stats {
  customersCount: number
  contractsCount: number
  contractsAmount: number
  invoicesAmount: number
  remaining: number
  recentInvoices: {
    id: string
    invoiceNumber: string
    customerName: string
    contractNumber: string
    amount: number
    date: string
  }[]
}

async function fetchStats(): Promise<Stats> {
  const res = await fetch('/api/stats', { cache: 'no-store' })
  if (!res.ok) throw new Error('فشل تحميل الإحصائيات')
  return res.json()
}

export function DashboardClient() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="text-center text-destructive py-12">
        تعذر تحميل البيانات. حاول مرة أخرى.
      </div>
    )
  }

  const cards = [
    {
      title: 'عدد العملاء',
      value: String(data.customersCount),
      icon: Users,
      colorClass: 'bg-blue-500',
      borderClass: 'border-t-blue-500',
      href: '/customers',
    },
    {
      title: 'عدد العقود',
      value: String(data.contractsCount),
      icon: FileText,
      colorClass: 'bg-indigo-500',
      borderClass: 'border-t-indigo-500',
      href: '/contracts',
    },
    {
      title: 'إجمالي قيمة العقود',
      value: formatAmountWithCurrency(data.contractsAmount),
      icon: Wallet,
      colorClass: 'bg-amber-500',
      borderClass: 'border-t-amber-500',
      href: '/contracts',
    },
    {
      title: 'إجمالي قيمة الفواتير',
      value: formatAmountWithCurrency(data.invoicesAmount),
      icon: Receipt,
      colorClass: 'bg-emerald-500',
      borderClass: 'border-t-emerald-500',
      href: '/invoices',
    },
    {
      title: 'إجمالي المبالغ المتبقية',
      value: formatAmountWithCurrency(data.remaining),
      icon: TrendingUp,
      colorClass: 'bg-green-600',
      borderClass: 'border-t-green-600',
      href: '/invoices',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Link href={c.href} key={c.title}>
              <Card
                className={`hover:shadow-md transition-shadow cursor-pointer h-full border-t-4 ${c.borderClass}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground truncate">
                        {c.title}
                      </p>
                      <p className="text-lg md:text-xl font-bold mt-1 break-words">
                        {c.value}
                      </p>
                    </div>
                    <div className={`${c.colorClass} text-white p-2 rounded-lg shrink-0`}>
                      <Icon className="h-4 w-4 md:h-5 md:w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-lg">آخر الفواتير</CardTitle>
            <Link href="/invoices">
              <button className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <Plus className="h-4 w-4" />
                <span>فاتورة جديدة</span>
              </button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentInvoices.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">
                لا توجد فواتير بعد. أنشئ أول فاتورة.
              </div>
            ) : (
              <div className="space-y-2">
                {data.recentInvoices.map((inv) => (
                  <Link
                    href={`/invoices?id=${inv.id}`}
                    key={inv.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-md hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Receipt className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {inv.invoiceNumber}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {inv.customerName} — {inv.contractNumber}
                        </p>
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="font-bold text-sm">
                        {formatAmount(inv.amount)} د.ك
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(inv.date)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">إجراءات سريعة</CardTitle>
            <CardDescription>أكثر العمليات استخدامًا</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickLink href="/customers" icon={Users} label="إضافة عميل جديد" />
            <QuickLink href="/contracts" icon={FileText} label="إنشاء عقد" />
            <QuickLink href="/invoices" icon={Receipt} label="إنشاء فاتورة" />
            <QuickLink href="/statement" icon={Wallet} label="طباعة كشف حساب" />
            <QuickLink href="/settings" icon={Plus} label="تعديل بيانات الشركة" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ElementType
  label: string
}) {
  return (
    <Link href={href}>
      <div className="flex items-center justify-between p-3 rounded-md hover:bg-muted transition-colors cursor-pointer">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <ArrowLeft className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  )
}
