'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Plus, Search, Pencil, Trash2, FileText, Loader2, FileSpreadsheet,
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

interface Contract {
  id: string
  contractNumber: string
  customerId: string
  customerName: string
  customerCode: string
  contractDate: string
  description: string
  amount: number
  notes: string
  createdAt: string
  totalInvoiced: number
  remaining: number
}

interface Customer {
  id: string
  customerCode: string
  name: string
}

interface ContractForm {
  customerId: string
  contractDate: string
  description: string
  amount: string
  notes: string
}

const emptyForm: ContractForm = {
  customerId: '',
  contractDate: todayISO(),
  description: '',
  amount: '',
  notes: '',
}

export function ContractsView() {
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<ContractForm>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null)
  const qc = useQueryClient()
  const { toast } = useToast()

  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ['contracts', search],
    queryFn: async () => {
      const q = search ? `?q=${encodeURIComponent(search)}` : ''
      const res = await fetch(`/api/contracts${q}`)
      if (!res.ok) throw new Error('فشل التحميل')
      return res.json()
    },
  })

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers-all'],
    queryFn: async () => {
      const res = await fetch('/api/customers')
      if (!res.ok) return []
      return res.json()
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data: ContractForm) => {
      const url = editId ? `/api/contracts/${editId}` : '/api/contracts'
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
      toast({ title: 'تم', description: editId ? 'تم تحديث العقد.' : 'تم إنشاء العقد.' })
      setDialogOpen(false)
      qc.invalidateQueries({ queryKey: ['contracts'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      setForm(emptyForm)
      setEditId(null)
    },
    onError: (err: Error) => {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/contracts/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'فشل الحذف')
      return json
    },
    onSuccess: () => {
      toast({ title: 'تم', description: 'تم حذف العقد.' })
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ['contracts'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (err: Error) => {
      toast({ title: 'لا يمكن الحذف', description: err.message, variant: 'destructive' })
      setDeleteTarget(null)
    },
  })

  function openAdd() {
    if (customers.length === 0) {
      toast({
        title: 'تنبيه',
        description: 'لا يوجد أي عميل بعد. أنشئ عميلًا أولًا.',
        variant: 'destructive',
      })
      return
    }
    setForm({ ...emptyForm, customerId: customers[0]?.id || '' })
    setEditId(null)
    setDialogOpen(true)
  }
  function openEdit(c: Contract) {
    setForm({
      customerId: c.customerId,
      contractDate: c.contractDate,
      description: c.description,
      amount: String(c.amount),
      notes: c.notes,
    })
    setEditId(c.id)
    setDialogOpen(true)
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return contracts
    const q = search.trim().toLowerCase()
    return contracts.filter(
      (c) =>
        c.contractNumber.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q)
    )
  }, [contracts, search])

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-2xl font-bold">العقود</h2>
          <p className="text-sm text-muted-foreground">
            إدارة العقود وحساب المبالغ المتبقية تلقائيًا
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 h-11">
          <Plus className="h-5 w-5" />
          إضافة عقد
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ابحث برقم العقد أو اسم العميل..."
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
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            {search ? 'لا توجد نتائج.' : 'لا توجد عقود بعد. اضغط «إضافة عقد» للبدء.'}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-right">
                <tr>
                  <th className="p-3 font-bold">رقم العقد</th>
                  <th className="p-3 font-bold">العميل</th>
                  <th className="p-3 font-bold">التاريخ</th>
                  <th className="p-3 font-bold text-left">قيمة العقد</th>
                  <th className="p-3 font-bold text-left">الفواتير</th>
                  <th className="p-3 font-bold text-left">المتبقي</th>
                  <th className="p-3 font-bold text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-muted/30">
                    <td className="p-3">
                      <Link href={`/statement?customerId=${c.customerId}&contractId=${c.id}`} className="font-mono font-bold text-primary hover:underline">
                        {c.contractNumber}
                      </Link>
                    </td>
                    <td className="p-3">{c.customerName}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(c.contractDate)}</td>
                    <td className="p-3 text-left font-bold">{formatAmount(c.amount)}</td>
                    <td className="p-3 text-left text-muted-foreground">{formatAmount(c.totalInvoiced)}</td>
                    <td className="p-3 text-left">
                      <span className={`font-bold ${c.remaining < 0 ? 'text-destructive' : c.remaining === 0 ? 'text-green-600' : ''}`}>
                        {formatAmount(c.remaining)}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Link href={`/statement?customerId=${c.customerId}&contractId=${c.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="كشف حساب">
                            <FileSpreadsheet className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(c)}>
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
            <DialogTitle>{editId ? 'تعديل عقد' : 'إضافة عقد جديد'}</DialogTitle>
            <DialogDescription>
              {editId
                ? 'تحديث بيانات العقد.'
                : 'إنشاء عقد جديد. رقم العقد يُولّد تلقائيًا.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>العميل *</Label>
              <Select
                value={form.customerId}
                onValueChange={(v) => setForm({ ...form, customerId: v })}
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="contractDate">تاريخ العقد *</Label>
                <Input
                  id="contractDate"
                  type="date"
                  value={form.contractDate}
                  onChange={(e) => setForm({ ...form, contractDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">قيمة العقد *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.001"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.000"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">وصف العقد</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="وصف العقد"
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
              disabled={saveMutation.isPending || !form.customerId || !form.contractDate || !form.amount || Number(form.amount) <= 0}
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
              هل أنت متأكد من حذف العقد <strong>{deleteTarget?.contractNumber}</strong>؟
              <br />
              سيُمنع الحذف إذا كان مرتبطًا بفواتير.
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
