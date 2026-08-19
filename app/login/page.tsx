'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, LogIn } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور.')
      return
    }
    setLoading(true)
    try {
      const res = await signIn('credentials', {
        redirect: false,
        username: username.trim(),
        password,
      })
      if (res?.error) {
        setError(res.error)
      } else if (res?.ok) {
        router.replace('/')
        router.refresh()
      } else {
        setError('تعذر تسجيل الدخول. حاول مرة أخرى.')
      }
    } catch (err) {
      setError('حدث خطأ غير متوقع.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSeed() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setError(data.message)
        setUsername('admin')
        setPassword('admin123')
      } else {
        setError(data.error || 'فشل إنشاء المستخدم الافتراضي.')
      }
    } catch {
      setError('تعذر الاتصال بالخادم.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl">
              ن
            </div>
          </div>
          <CardTitle className="text-center text-2xl">
            نظام إدارة العملاء
          </CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            سجّل دخولك للوصول إلى النظام
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">اسم المستخدم</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                autoComplete="username"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
            {error && (
              <div className="rounded-md bg-destructive/10 text-destructive p-3 text-sm whitespace-pre-line">
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-11"
              disabled={loading || !username || !password}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="ml-2 h-5 w-5" />
                  دخول
                </>
              )}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button
              variant="link"
              size="sm"
              onClick={handleSeed}
              disabled={loading}
              className="text-muted-foreground"
            >
              إنشاء مستخدم admin افتراضي (أول تثبيت)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
