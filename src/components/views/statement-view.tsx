'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileSpreadsheet, Loader2, Printer, Download, FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { formatAmount, formatDate } from '@/lib/utils'

interface Customer { id: string; customerCode: string; name: string }
interface Contract {
  id: string; contractNumber: string; contractDate: string; amount: number
  totalInvoiced: number; remaining: number; description: string;
}
interface Movement {
  date: string; description: string; reference: string;
  amount: number; balance: number; type: string;
}

export function StatementView() {
  const [customerId, setCustomerId] = useState('')
  const [contractId, setContractId] = useState('')
  const { toast } = useToast()

  // قراءة query params (من روابط العقود/العملاء)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cId = params.get('customerId')
    const conId = params.get('contractId')
    if (cId) setCustomerId(cId)
    if (conId) setContractId(conId)
  }, [])

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers-all'],
    queryFn: async () => {
      const res = await fetch('/api/customers')
      return res.ok ? res.json() : []
    },
  })

  const { data: customerContracts = [] } = useQuery<Contract[]>({
    queryKey: ['customer-contracts-statement', customerId],
    queryFn: async () => {
      if (!customerId) return []
      const res = await fetch(`/api/customers/${customerId}/contracts`)
      return res.ok ? res.json() : []
    },
    enabled: !!customerId,
  })

  // اختيار أول عقد تلقائيًا عند التحميل من رابط
  useEffect(() => {
    if (!contractId && customerContracts.length > 0 && customerId) {
      const params = new URLSearchParams(window.location.search)
      if (params.get('contractId')) setContractId(params.get('contractId')!)
    }
  }, [customerContracts, customerId, contractId])

  const { data: movements = [], refetch } = useQuery<Movement[]>({
    queryKey: ['statement-movements', contractId],
    queryFn: async () => {
      if (!contractId || !customerId) return []
      // نبني كشف الحساب محليًا من بيانات العقد والفواتير
      const [contractRes, invoicesRes] = await Promise.all([
        fetch(`/api/contracts/${contractId}`),
        fetch(`/api/customers/${customerId}/invoices`),
      ])
      if (!contractRes.ok || !invoicesRes.ok) return []
      const contract = await contractRes.json()
      const invoices = await invoicesRes.json().then((arr: any[]) =>
        arr.filter((i) => i.contractNumber === contract.contractNumber)
      )
      const totalInvoiced = invoices.reduce(
        (s: number, i: any) => s + Number(i.amount), 0
      )
      const moves: Movement[] = [
        {
          date: contract.contractDate,
          description: 'قيمة العقد',
          reference: contract.contractNumber,
          amount: contract.amount,
          balance: contract.amount,
          type: 'contract',
        },
        ...invoices.map((inv: any) => ({
          date: inv.invoiceDate,
          description: inv.description || 'فاتورة',
          reference: inv.invoiceNumber,
          amount: inv.amount,
          balance: 0, // سيُحسب أدناه
          type: 'invoice',
        })),
      ]
      // ترتيب زمني
      moves.sort((a, b) => a.date.localeCompare(b.date))
      let running = contract.amount
      moves.forEach((m) => {
        if (m.type === 'invoice') {
          running -= m.amount
          m.balance = running
        }
      })
      return moves
    },
    enabled: !!contractId && !!customerId,
  })

  const selectedContract = customerContracts.find((c) => c.id === contractId)
  const selectedCustomer = customers.find((c) => c.id === customerId)
  const contractAmount = selectedContract?.amount ?? 0
  const totalInvoiced = selectedContract?.totalInvoiced ?? 0
  const remaining = selectedContract?.remaining ?? 0

  async function handlePrint() {
    if (!customerId || !contractId) {
      toast({ title: 'تنبيه', description: 'يجب اختيار العميل والعقد أولًا.' })
      return
    }
    try {
      const res = await fetch(`/api/statement/${contractId}/pdf?customerId=${customerId}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'فشل توليد PDF')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err instanceof Error ? err.message : 'خطأ غير متوقع',
        variant: 'destructive',
      })
    }
  }

  async function handleExport() {
    if (!customerId || !contractId) {
      toast({ title: 'تنبيه', description: 'يجب اختيار العميل والعقد أولًا.' })
      return
    }
    try {
      const res = await fetch(`/api/statement/${contractId}/pdf?customerId=${customerId}&download=1`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'فشل التصدير')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `statement_${selectedContract?.contractNumber || 'unknown'}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err instanceof Error ? err.message : 'خطأ غير متوقع',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">كشف الحساب</h2>
        <p className="text-sm text-muted-foreground">
          عرض حركة العقد (قيمة العقد + الفواتير) مع الرصيد الجاري
        </p>
      </div>

      {/* اختيار العميل والعقد */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-bold">العميل</label>
              <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setContractId('') }}>
                <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.customerCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-bold">العقد</label>
              <Select value={contractId} onValueChange={setContractId} disabled={!customerId}>
                <SelectTrigger><SelectValue placeholder="اختر العقد" /></SelectTrigger>
                <SelectContent>
                  {customerContracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.contractNumber} — {formatAmount(c.amount)} د.ك
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedCustomer && selectedContract && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="p-2 rounded bg-muted/50">
                <p className="text-xs text-muted-foreground">العميل</p>
                <p className="font-bold">{selectedCustomer.name}</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <p className="text-xs text-muted-foreground">رقم العقد</p>
                <p className="font-bold">{selectedContract.contractNumber}</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <p className="text-xs text-muted-foreground">قيمة العقد</p>
                <p className="font-bold">{formatAmount(contractAmount)} د.ك</p>
              </div>
              <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-muted-foreground">المبلغ المتبقي</p>
                <p className="font-bold text-amber-700 dark:text-amber-400">
                  {formatAmount(remaining)} د.ك
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={handlePrint} disabled={!contractId} className="gap-2">
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
            <Button onClick={handleExport} disabled={!contractId} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              تصدير PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* جدول الحركة */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {!contractId ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-30" />
              اختر عميلًا وعقدًا لعرض كشف الحساب.
            </div>
          ) : movements.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              جاري التحميل...
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-right">
                <tr>
                  <th className="p-3 font-bold">التاريخ</th>
                  <th className="p-3 font-bold">البيان</th>
                  <th className="p-3 font-bold">رقم المرجع</th>
                  <th className="p-3 font-bold text-left">المبلغ</th>
                  <th className="p-3 font-bold text-left">الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m, idx) => (
                  <tr
                    key={idx}
                    className={`border-t hover:bg-muted/30 ${m.type === 'contract' ? 'bg-primary/5 font-bold' : ''}`}
                  >
                    <td className="p-3">{formatDate(m.date)}</td>
                    <td className="p-3">{m.description}</td>
                    <td className="p-3 font-mono">{m.reference}</td>
                    <td className="p-3 text-left">{formatAmount(m.amount)}</td>
                    <td className="p-3 text-left font-bold">{formatAmount(m.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30">
                <tr className="font-bold">
                  <td colSpan={3} className="p-3 text-left">الإجمالي:</td>
                  <td className="p-3 text-left">{formatAmount(totalInvoiced)}</td>
                  <td className="p-3 text-left">{formatAmount(remaining)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
