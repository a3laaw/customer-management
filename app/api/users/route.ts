import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { hashPassword, getArabicErrorMessage } from '@/lib/utils'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'الصلاحية للمدير فقط' }, { status: 403 })
  }
  const users = await db.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
    },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'الصلاحية للمدير فقط' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const { username, name, password, role, active } = body

    if (!username || !String(username).trim()) {
      return NextResponse.json({ error: 'اسم المستخدم مطلوب.' }, { status: 400 })
    }
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'الاسم الكامل مطلوب.' }, { status: 400 })
    }
    if (!password || String(password).length < 4) {
      return NextResponse.json(
        { error: 'كلمة المرور مطلوبة (4 أحرف على الأقل).' },
        { status: 400 }
      )
    }
    if (!['admin', 'manager', 'user'].includes(role)) {
      return NextResponse.json({ error: 'دور غير صالح.' }, { status: 400 })
    }

    const hash = await hashPassword(String(password))
    const user = await db.user.create({
      data: {
        username: String(username).trim(),
        name: String(name).trim(),
        password: hash,
        role: String(role),
        active: active !== false,
      },
      select: {
        id: true, username: true, name: true, role: true, active: true, createdAt: true,
      },
    })
    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: getArabicErrorMessage(error) }, { status: 400 })
  }
}
