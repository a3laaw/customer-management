'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save, Building2, Palette, Database, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useTheme } from 'next-themes'

export function SettingsView() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [form, setForm] = useState({
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    logoPath: '',
    currency: 'د.ك',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings')
      return res.ok ? res.json() : null
    },
  })

  useEffect(() => {
    if (data) {
      setForm({
        companyName: data.companyName || '',
        companyAddress: data.companyAddress || '',
        companyPhone: data.companyPhone || '',
        companyEmail: data.companyEmail || '',
        logoPath: data.logoPath || '',
        currency: data.currency || 'د.ك',
      })
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: async (formData: typeof form) => {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'فشل الحفظ')
      return json
    },
    onSuccess: () => {
      toast({ title: 'تم', description: 'تم حفظ الإعدادات بنجاح.' })
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (err: Error) => {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' })
    },
  })

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2_000_000) {
      toast({ title: 'خطأ', description: 'حجم الصورة يجب أن يكون أقل من 2 ميجابايت.', variant: 'destructive' })
      return
    }
    try {
      // تحويل لـ base64 (تُحفظ في قاعدة البيانات)
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        setForm({ ...form, logoPath: result })
      }
      reader.readAsDataURL(file)
    } catch (err) {
      toast({ title: 'خطأ', description: 'تعذر قراءة الملف.', variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold">الإعدادات</h2>
        <p className="text-sm text-muted-foreground">
          بيانات الشركة المستخدمة في الفواتير وكشوف الحساب
        </p>
      </div>

      {/* بيانات الشركة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            بيانات الشركة
          </CardTitle>
          <CardDescription>تظهر تلقائيًا في الفواتير وكشوف الحساب</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="companyName">اسم الشركة</Label>
            <Input
              id="companyName"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              placeholder="اسم الشركة"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="companyAddress">العنوان</Label>
            <Textarea
              id="companyAddress"
              value={form.companyAddress}
              onChange={(e) => setForm({ ...form, companyAddress: e.target.value })}
              placeholder="العنوان الكامل"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="companyPhone">الهاتف</Label>
              <Input
                id="companyPhone"
                value={form.companyPhone}
                onChange={(e) => setForm({ ...form, companyPhone: e.target.value })}
                placeholder="الهاتف"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="companyEmail">البريد الإلكتروني</Label>
              <Input
                id="companyEmail"
                type="email"
                value={form.companyEmail}
                onChange={(e) => setForm({ ...form, companyEmail: e.target.value })}
                placeholder="email@example.com"
                dir="ltr"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="currency">العملة</Label>
              <Input
                id="currency"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                placeholder="د.ك"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logo">شعار الشركة</Label>
              <div className="flex items-center gap-3">
                {form.logoPath ? (
                  <img
                    src={form.logoPath}
                    alt="الشعار"
                    className="w-16 h-16 object-contain border rounded"
                  />
                ) : (
                  <div className="w-16 h-16 border-2 border-dashed rounded flex items-center justify-center text-xs text-muted-foreground">
                    لا يوجد
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => document.getElementById('logoInput')?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    رفع شعار
                  </Button>
                  {form.logoPath && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setForm({ ...form, logoPath: '' })}
                    >
                      إزالة
                    </Button>
                  )}
                  <input
                    id="logoInput"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">أقصى حجم 2 ميجابايت — PNG/JPG</p>
            </div>
          </div>
          <div className="pt-3 border-t">
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.currency}
              className="gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              حفظ الإعدادات
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* الواجهة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            مظهر الواجهة
          </CardTitle>
          <CardDescription>اختر بين الوضع الفاتح والداكن</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              onClick={() => setTheme('light')}
            >
              فاتح
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              onClick={() => setTheme('dark')}
            >
              داكن
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* النسخ الاحتياطي */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            النسخ الاحتياطي
          </CardTitle>
          <CardDescription>
            تنزيل نسخة احتياطية كاملة من قاعدة البيانات (SQLite)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="gap-2"
            onClick={async () => {
              try {
                const res = await fetch('/api/backup')
                if (!res.ok) {
                  const data = await res.json()
                  throw new Error(data.error || 'فشل')
                }
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `backup_${new Date().toISOString().slice(0, 10)}.sqlite`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                setTimeout(() => URL.revokeObjectURL(url), 30_000)
                toast({ title: 'تم', description: 'تم تنزيل النسخة الاحتياطية.' })
              } catch (err) {
                toast({
                  title: 'خطأ',
                  description: err instanceof Error ? err.message : 'خطأ',
                  variant: 'destructive',
                })
              }
            }}
          >
            <Database className="h-4 w-4" />
            تنزيل نسخة احتياطية
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
