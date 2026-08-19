'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Pencil, Trash2, Loader2, ShieldCheck, UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib/utils'

interface User {
  id: string
  username: string
  name: string
  role: 'admin' | 'manager' | 'user'
  active: boolean
  createdAt: string
}

interface UserForm {
  username: string
  name: string
  password: string
  role: 'user' | 'manager' | 'admin'
  active: boolean
}

const emptyForm: UserForm = {
  username: '',
  name: '',
  password: '',
  role: 'user',
  active: true,
}

const roleLabels = {
  admin: 'مدير',
  manager: 'مشرف',
  user: 'مستخدم',
}

export function UsersView() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const qc = useQueryClient()
  const { toast } = useToast()

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users')
      if (!res.ok) throw new Error('فشل التحميل')
      return res.json()
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data: UserForm) => {
      const url = editId ? `/api/users/${editId}` : '/api/users'
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
      toast({ title: 'تم', description: editId ? 'تم تحديث المستخدم.' : 'تم إنشاء المستخدم.' })
      setDialogOpen(false)
      qc.invalidateQueries({ queryKey: ['users'] })
      setForm(emptyForm)
      setEditId(null)
    },
    onError: (err: Error) => {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'فشل الحذف')
      return json
    },
    onSuccess: () => {
      toast({ title: 'تم', description: 'تم حذف المستخدم.' })
      setDeleteTarget(null)
      qc.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err: Error) => {
      toast({ title: 'لا يمكن الحذف', description: err.message, variant: 'destructive' })
      setDeleteTarget(null)
    },
  })

  function openAdd() {
    setForm(emptyForm)
    setEditId(null)
    setDialogOpen(true)
  }
  function openEdit(u: User) {
    setForm({
      username: u.username,
      name: u.name,
      password: '',
      role: u.role,
      active: u.active,
    })
    setEditId(u.id)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-2xl font-bold">المستخدمون</h2>
          <p className="text-sm text-muted-foreground">
            إدارة حسابات الموظفين والصلاحيات
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 h-11">
          <Plus className="h-5 w-5" />
          إضافة مستخدم
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
            لا يوجد مستخدمون.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-right">
                <tr>
                  <th className="p-3 font-bold">اسم المستخدم</th>
                  <th className="p-3 font-bold">الاسم</th>
                  <th className="p-3 font-bold">الدور</th>
                  <th className="p-3 font-bold">الحالة</th>
                  <th className="p-3 font-bold">تاريخ الإنشاء</th>
                  <th className="p-3 font-bold text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t hover:bg-muted/30">
                    <td className="p-3 font-mono">{u.username}</td>
                    <td className="p-3">{u.name}</td>
                    <td className="p-3">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary">
                        {roleLabels[u.role]}
                      </span>
                    </td>
                    <td className="p-3">
                      {u.active ? (
                        <span className="text-green-600 text-xs font-bold">● نشط</span>
                      ) : (
                        <span className="text-muted-foreground text-xs font-bold">○ معطّل</span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">{formatDate(u.createdAt.toISOString?.() || u.createdAt)}</td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(u)}
                        >
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {editId ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
            </DialogTitle>
            <DialogDescription>
              {editId
                ? 'اترك كلمة المرور فارغة لإبقائها كما هي.'
                : 'أنشئ حسابًا جديدًا للموظف.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="username">اسم المستخدم *</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="username"
                dir="ltr"
                disabled={!!editId}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">الاسم الكامل *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="الاسم الكامل"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">
                كلمة المرور {editId ? '(اتركها فارغة للإبقاء)' : '*'}
              </Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editId ? '••••••' : 'كلمة المرور'}
                dir="ltr"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>الدور</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v as UserForm['role'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">مستخدم</SelectItem>
                    <SelectItem value="manager">مشرف</SelectItem>
                    <SelectItem value="admin">مدير</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>الحالة</Label>
                <Select
                  value={form.active ? 'active' : 'inactive'}
                  onValueChange={(v) => setForm({ ...form, active: v === 'active' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="inactive">معطّل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.username || !form.name || (!editId && !form.password)}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حفظ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف المستخدم <strong>{deleteTarget?.username}</strong>؟
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
