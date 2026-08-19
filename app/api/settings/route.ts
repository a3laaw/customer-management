import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }
  let s = await db.settings.findUnique({ where: { id: '1' } })
  if (!s) {
    s = await db.settings.create({
      data: {
        id: '1',
        companyName: '',
        companyAddress: '',
        companyPhone: '',
        companyEmail: '',
        logoPath: '',
        currency: 'د.ك',
        uiTheme: 'light',
      },
    })
  }
  return NextResponse.json(s)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'لا تملك صلاحية تعديل الإعدادات' },
      { status: 403 }
    )
  }
  try {
    const body = await req.json()
    const {
      companyName,
      companyAddress,
      companyPhone,
      companyEmail,
      logoPath,
      currency,
    } = body
    if (!currency || !String(currency).trim()) {
      return NextResponse.json(
        { error: 'يرجى إدخال رمز العملة.' },
        { status: 400 }
      )
    }
    const s = await db.settings.upsert({
      where: { id: '1' },
      update: {
        companyName: String(companyName || '').trim(),
        companyAddress: String(companyAddress || '').trim(),
        companyPhone: String(companyPhone || '').trim(),
        companyEmail: String(companyEmail || '').trim(),
        logoPath: String(logoPath || '').trim(),
        currency: String(currency).trim(),
      },
      create: {
        id: '1',
        companyName: String(companyName || '').trim(),
        companyAddress: String(companyAddress || '').trim(),
        companyPhone: String(companyPhone || '').trim(),
        companyEmail: String(companyEmail || '').trim(),
        logoPath: String(logoPath || '').trim(),
        currency: String(currency).trim(),
      },
    })
    return NextResponse.json(s)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطأ' },
      { status: 400 }
    )
  }
}
