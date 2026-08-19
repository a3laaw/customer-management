'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Plus, Search, Pencil, Trash2, Receipt, Loader2, Printer, AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { formatAmount, formatDate, todayISO } from '@/lib/utils'

interface Invoice {
  id: string
  invoiceNumber: string
  customerId: string
  contractId: string
  invoiceDate: string
  description: string
  amount: number
  notes: string
  createdAt: string
  customerName: string
  contractNumber: string
  contractAmount: number
}

interface Customer {
  id: string
  customerCode: string
  name: string
}

interface ContractOption {
  id: string
  contractNumber: string
  amount: number
  totalInvoiced: number
  remaining: number
}

interface ContractSummary {
  contractId: string
  contractAmount: number
  totalInvoiced: number
  remaining: number
}

interface InvoiceForm {
  customerId: string
  contractId: string
  invoiceDate: string
  description: string
  amount: string
  notes: string
}

const emptyForm: InvoiceForm = {
  customerId: '',
  contractId: '',
  invoiceDate: todayISO(),
  description: '',
  amount: '',
  notes: '',
}

export function InvoicesView() {
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<InvoiceForm>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null)
  const qc = useQueryClient()
  const { toast } = useToast()

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices', search],
    queryFn: async () => {
      const q = search ? `?q=${encodeURIComponent(search)}` : ''
      const res = await fetch(`/api/invoices${q}`)
      if (!res.ok) throw new Error('فشل التحميل')
      return res.json()
    },
  })

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers-all'],
    queryFn: async () => {
      const res = await fetch('/api/customers')
      return res.ok ? res.json() : []
    },
  })

  // جلب عقود العميل المختار
  const { data: customerContracts = [] } = useQuery<ContractOption[]>({
    queryKey: ['customer-contracts-form', form.customerId],
    queryFn: async () => {
      if (!form.customerId) return []
      const res = await fetch(`/api/customers/${form.customerId}/contracts`)
      return res.ok ? res.json() : []
    },
    enabled: !!form.customerId,
  })

  // جلب ملخص العقد المختار (للتحقق الحيّ)
  const { data: summary } = useQuery<ContractSummary>({
    queryKey: ['contract-summary', form.contractId],
    queryFn: async () => {
      if (!form.contractId) return null
      const res = await fetch(`/api/contracts/${form.contractId}/summary`)
      return res.ok ? res.json() : null
    },
    enabled: !!form.contractId,
  })

  const saveMutation = useMutation({
    mutationFn: async (data: InvoiceForm) => {
      const url = editId ? `/api/invoices/${editId}` : '/api/invoices'
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'فشل الحفظ')
      return json
    },
    onSuccess: () => {
      toast({ title: 'تم', description: editId ? 'تم تحديث الفاتورة.' : 'تم إنشاء الفاتورة.' })
      setDialogOpen(false)
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      qc.invalidateQueries({ queryKey: ['contract-summary'] })
      setForm(emptyForm)
      setEditId(null)
    },
    onError: (err: Error) => {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'فشل الحذف')
      return json
    },
    onSuccess: () => {
      toast({ title: 'تم', description: 'تم حذف الفاتورة.' })
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (err: Error) => {
      toast({ title: 'لا يمكن الحذف', description: err.message, variant: 'destructive' })
      setDeleteTarget(null)
    },
  })

  function openAdd() {
    if (customers.length === 0) {
      toast({ title: 'تنبيه', description: 'لا يوجد عملاء. أنشئ عميلًا أولًا.', variant: 'destructive' })
      return
    }
    setForm({ ...emptyForm, customerId: customers[0]?.id || '' })
    setEditId(null)
    setDialogOpen(true)
  }
  function openEdit(inv: Invoice) {
    setForm({
      customerId: inv.customerId,
      contractId: inv.contractId,
      invoiceDate: inv.invoiceDate,
      description: inv.description,
      amount: String(inv.amount),
      notes: inv.notes,
    })
    setEditId(inv.id)
    setDialogOpen(true)
  }

  async function handlePrint(inv: Invoice) {
    try {
      const res = await fetch(`/api/invoices/${inv.id}/pdf`)
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

  // حساب المبلغ المتاح للفاتورة الحالية (في حالة التعديل)
  const typedAmount = Number(form.amount) || 0
  const currentAmount = editId
    ? invoices.find((i) => i.id === editId)?.amount || 0
    : 0
  const availableForThis = summary
    ? summary.remaining + currentAmount
    : 0
  const exceedsRemaining =
    summary && typedAmount > 0 && typedAmount > availableForThis + 0.001

  const filtered = useMemo(() => {
    if (!search.trim()) return invoices
    const q = search.trim().toLowerCase()
    return invoices.filter(
      (i) =>
        i.invoiceNumber.toLowerCase().includes(q) ||
        i.customerName.toLowerCase().includes(q) ||
        i.contractNumber.toLowerCase().includes(q)
    )
  }, [invoices, search])

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-2xl font-bold">الفواتير</h2>
          <p className="text-sm text-muted-foreground">
            إنشاء فواتير تخصم تلقائيًا من المبلغ المتبقي للعقد
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 h-11">
          <Plus className="h-5 w-5" />
          إضافة فاتورة
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ابحث برقم الفاتورة أو اسم العميل أو رقم العقد..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
            {search ? 'لا توجد نتائج.' : 'لا توجد فواتير بعد. اضغط «إضافة فاتورة» للبدء.'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-right">
                <tr>
                  <th className="p-3 font-bold">رقم الفاتورة</th>
                  <th className="p-3 font-bold">التاريخ</th>
                  <th className="p-3 font-bold">العميل</th>
                  <th className="p-3 font-bold">العقد</th>
                  <th className="p-3 font-bold">البيان</th>
                  <th className="p-3 font-bold text-left">المبلغ</th>
                  <th className="p-3 font-bold text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono font-bold">{inv.invoiceNumber}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(inv.invoiceDate)}</td>
                    <td className="p-3">{inv.customerName}</td>
                    <td className="p-3 font-mono">{inv.contractNumber}</td>
                    <td className="p-3 text-muted-foreground max-w-xs truncate">
                      {inv.description || '-'}
                    </td>
                    <td className="p-3 text-left font-bold">{formatAmount(inv.amount)}</td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(inv)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrint(inv)} title="طباعة">
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(inv)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* حوار الإضافة/التعديل */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? 'تعديل فاتورة' : 'إضافة فاتورة جديدة'}</DialogTitle>
            <DialogDescription>
              {editId
                ? 'تحديث بيانات الفاتورة.'
                : 'إنشاء فاتورة جديدة. رقم الفاتورة يُولّد تلقائيًا.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>العميل *</Label>
              <Select
                value={form.customerId}
                onValueChange={(v) => setForm({ ...form, customerId: v, contractId: '', amount: '' })}
                disabled={!!editId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر العميل" />
                </SelectTrigger>
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
              <Label>العقد *</Label>
              <Select
                value={form.contractId}
                onValueChange={(v) => setForm({ ...form, contractId: v })}
                disabled={!!editId || !form.customerId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر العقد" />
                </SelectTrigger>
                <SelectContent>
                  {customerContracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.contractNumber} — قيمة: {formatAmount(c.amount)} — متبقي: {formatAmount(c.remaining)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="invoiceDate">تاريخ الفاتورة *</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={form.invoiceDate}
                  onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">المبلغ *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.001"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.000"
                  dir="ltr"
                  className={exceedsRemaining ? 'border-destructive' : ''}
                />
              </div>
            </div>

            {/* ملخص المتبقي الحيّ */}
            {summary && (
              <div className={`rounded-md p-3 text-sm space-y-1 ${
                exceedsRemaining
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-muted text-foreground'
              }`}>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">قيمة العقد:</span>
                  <span className="font-bold">{formatAmount(summary.contractAmount)} د.ك</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">إجمالي الفواتير الأخرى:</span>
                  <span className="font-bold">{formatAmount(summary.totalInvoiced - currentAmount)} د.ك</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المبلغ المتاح لهذه الفاتورة:</span>
                  <span className="font-bold">{formatAmount(availableForThis)} د.ك</span>
                </div>
                {exceedsRemaining && (
                  <div className="flex items-center gap-2 text-destructive font-bold mt-1 pt-1 border-t border-destructive/30">
                    <AlertTriangle className="h-4 w-4" />
                    <span>قيمة الفاتورة تتجاوز المبلغ المتبقي من العقد!</span>
                  </div>
                )}
                {!exceedsRemaining && typedAmount > 0 && (
                  <div className="text-green-600 text-xs pt-1 border-t border-muted-foreground/10">
                    المبلغ المتبقي بعد الحفظ: {formatAmount(availableForThis - typedAmount)} د.ك
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="description">البيان</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="بيان الفاتورة"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="ملاحظات"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.customerId || !form.contractId || !form.invoiceDate || !form.amount || Number(form.amount) <= 0 || exceedsRemaining}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* حوار الحذف */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف الفاتورة{' '}
              <strong>{deleteTarget?.invoiceNumber}</strong>؟
              <br />
              سيتم تحديث المبلغ المتبقي تلقائيًا.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>إلغاء</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حذف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
