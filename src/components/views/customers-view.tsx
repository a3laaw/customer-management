'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Users,
  Loader2,
  Phone,
  Mail,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { formatAmount, formatDate } from '@/lib/utils'

interface Customer {
  id: string
  customerCode: string
  name: string
  phone: string
  address: string
  email: string
  notes: string
  createdAt: string
}

interface CustomerForm {
  name: string
  phone: string
  address: string
  email: string
  notes: string
}

const emptyForm: CustomerForm = {
  name: '',
  phone: '',
  address: '',
  email: '',
  notes: '',
}

export function CustomersView() {
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<CustomerForm>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const [viewCustomer, setViewCustomer] = useState<Customer | null>(null)

  const qc = useQueryClient()
  const { toast } = useToast()

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['customers', search],
    queryFn: async () => {
      const q = search ? `?q=${encodeURIComponent(search)}` : ''
      const res = await fetch(`/api/customers${q}`)
      if (!res.ok) throw new Error('فشل التحميل')
      return res.json()
    },
    // تأخير بسيط للبحث لتفادي الطلبات الكثيرة
  })

  const { data: customerContracts = [] } = useQuery({
    queryKey: ['customer-contracts', viewCustomer?.id],
    queryFn: async () => {
      if (!viewCustomer) return []
      const res = await fetch(`/api/customers/${viewCustomer.id}/contracts`)
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!viewCustomer,
  })

  const { data: customerInvoices = [] } = useQuery({
    queryKey: ['customer-invoices', viewCustomer?.id],
    queryFn: async () => {
      if (!viewCustomer) return []
      const res = await fetch(`/api/customers/${viewCustomer.id}/invoices`)
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!viewCustomer,
  })

  const saveMutation = useMutation({
    mutationFn: async (data: CustomerForm) => {
      const url = editId ? `/api/customers/${editId}` : '/api/customers'
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
      toast({ title: 'تم', description: editId ? 'تم تحديث العميل.' : 'تم إنشاء العميل.' })
      setDialogOpen(false)
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      setForm(emptyForm)
      setEditId(null)
    },
    onError: (err: Error) => {
      toast({
        title: 'خطأ',
        description: err.message,
        variant: 'destructive',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'فشل الحذف')
      return json
    },
    onSuccess: () => {
      toast({ title: 'تم', description: 'تم حذف العميل بنجاح.' })
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
    onError: (err: Error) => {
      toast({
        title: 'لا يمكن الحذف',
        description: err.message,
        variant: 'destructive',
      })
      setDeleteTarget(null)
    },
  })

  function openAdd() {
    setForm(emptyForm)
    setEditId(null)
    setDialogOpen(true)
  }
  function openEdit(c: Customer) {
    setForm({
      name: c.name,
      phone: c.phone,
      address: c.address,
      email: c.email,
      notes: c.notes,
    })
    setEditId(c.id)
    setDialogOpen(true)
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return customers
    const q = search.trim().toLowerCase()
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.customerCode.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    )
  }, [customers, search])

  return (
    <div className="space-y-4">
      {/* ترويسة + بحث */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-2xl font-bold">العملاء</h2>
          <p className="text-sm text-muted-foreground">
            إدارة بيانات العملاء وعرض عقودهم وفواتيرهم
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 h-11">
          <Plus className="h-5 w-5" />
          إضافة عميل
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ابحث بالاسم أو رقم العميل أو الهاتف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* قائمة العملاء */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            {search ? 'لا توجد نتائج مطابقة.' : 'لا يوجد عملاء بعد. اضغط «إضافة عميل» للبدء.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div
                    onClick={() => setViewCustomer(c)}
                    className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                      {c.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.customerCode}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(c)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(c)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1 text-sm text-muted-foreground">
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      <span className="truncate">{c.phone}</span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.address && (
                    <p className="text-xs truncate">📍 {c.address}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* حوار الإضافة/التعديل */}
      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        setForm={setForm}
        editId={editId}
        onSubmit={() => saveMutation.mutate(form)}
        loading={saveMutation.isPending}
      />

      {/* حوار الحذف */}
      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        customer={deleteTarget}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />

      {/* حوار عرض التفاصيل */}
      <ViewCustomerDialog
        open={!!viewCustomer}
        onOpenChange={(o) => !o && setViewCustomer(null)}
        customer={viewCustomer}
        contracts={customerContracts}
        invoices={customerInvoices}
      />
    </div>
  )
}

// ============= مكوّن حوار إضافة/تعديل عميل =============
function CustomerDialog({
  open,
  onOpenChange,
  form,
  setForm,
  editId,
  onSubmit,
  loading,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  form: CustomerForm
  setForm: (f: CustomerForm) => void
  editId: string | null
  onSubmit: () => void
  loading: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editId ? 'تعديل عميل' : 'إضافة عميل جديد'}</DialogTitle>
          <DialogDescription>
            املأ بيانات العميل. الحقول المؤشّرة بـ * إلزامية.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">اسم العميل *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="اسم العميل أو الشركة"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone">الهاتف</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="رقم الهاتف"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                dir="ltr"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">العنوان</Label>
            <Textarea
              id="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="العنوان الكامل"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="ملاحظات داخلية"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button onClick={onSubmit} disabled={loading || !form.name.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============= حوار التأكيد الحذف =============
function DeleteDialog({
  open,
  onOpenChange,
  customer,
  loading,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  customer: Customer | null
  loading: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>تأكيد الحذف</DialogTitle>
          <DialogDescription>
            هل أنت متأكد من حذف العميل:{' '}
            <strong>{customer?.name}</strong>؟
            <br />
            سيُمنع الحذف إذا كان مرتبطًا بعقود أو فواتير.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حذف'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============= حوار عرض التفاصيل =============
function ViewCustomerDialog({
  open,
  onOpenChange,
  customer,
  contracts,
  invoices,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  customer: Customer | null
  contracts: any[]
  invoices: any[]
}) {
  if (!customer) return null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              {customer.name.charAt(0)}
            </div>
            <span>{customer.name}</span>
          </DialogTitle>
          <DialogDescription>
            {customer.customerCode} · أُنشئ في {formatDate(customer.createdAt)}
          </DialogDescription>
        </DialogHeader>

        {/* بيانات الاتصال */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {customer.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <span dir="ltr">{customer.phone}</span>
            </div>
          )}
          {customer.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <span dir="ltr" className="truncate">{customer.email}</span>
            </div>
          )}
          {customer.address && (
            <div className="col-span-2 text-muted-foreground">
              📍 {customer.address}
            </div>
          )}
          {customer.notes && (
            <div className="col-span-2 p-3 bg-muted rounded-md text-muted-foreground">
              {customer.notes}
            </div>
          )}
        </div>

        {/* العقود */}
        <div className="space-y-2">
          <h4 className="font-bold text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            عقود العميل ({contracts.length})
          </h4>
          {contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد عقود لهذا العميل.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {contracts.map((c) => (
                <Link
                  key={c.id}
                  href={`/contracts?id=${c.id}`}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted text-sm"
                >
                  <span className="font-mono">{c.contractNumber}</span>
                  <span className="text-muted-foreground">
                    {formatDate(c.contractDate)}
                  </span>
                  <span className="font-bold">
                    {formatAmount(c.amount)} د.ك
                  </span>
                  <span className="text-xs text-muted-foreground">
                    متبقي: {formatAmount(c.remaining)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* الفواتير */}
        <div className="space-y-2">
          <h4 className="font-bold text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            فواتير العميل ({invoices.length})
          </h4>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد فواتير لهذا العميل.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {invoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/invoices?id=${inv.id}`}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted text-sm"
                >
                  <span className="font-mono">{inv.invoiceNumber}</span>
                  <span className="text-muted-foreground">
                    {formatDate(inv.invoiceDate)}
                  </span>
                  <span className="font-bold">
                    {formatAmount(inv.amount)} د.ك
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
