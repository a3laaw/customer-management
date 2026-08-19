import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { hashPassword, getArabicErrorMessage } from '@/lib/utils'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'الصلاحية للمدير فقط' }, { status: 403 })
  }
  const { id } = await params
  try {
    const body = await req.json()
    const { name, password, role, active } = body

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'الاسم مطلوب.' }, { status: 400 })
    }
    if (!['admin', 'manager', 'user'].includes(role)) {
      return NextResponse.json({ error: 'دور غير صالح.' }, { status: 400 })
    }

    const data: any = {
      name: String(name).trim(),
      role: String(role),
      active: active !== false,
    }
    if (password && String(password).length > 0) {
      if (String(password).length < 4) {
        return NextResponse.json(
          { error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل.' },
          { status: 400 }
        )
      }
      data.password = await hashPassword(String(password))
    }

    const user = await db.user.update({
      where: { id },
      data,
      select: {
        id: true, username: true, name: true, role: true, active: true, createdAt: true,
      },
    })
    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ error: getArabicErrorMessage(error) }, { status: 400 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'الصلاحية للمدير فقط' }, { status: 403 })
  }
  const { id } = await params
  // منع حذف النفس
  if (session.user.id === id) {
    return NextResponse.json(
      { error: 'لا يمكنك حذف حسابك الحالي.' },
      { status: 400 }
    )
  }
  try {
    await db.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: getArabicErrorMessage(error) }, { status: 400 })
  }
}
