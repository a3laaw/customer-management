import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { generateCustomerCode, getArabicErrorMessage } from '@/lib/utils'

// جلب كل العملاء (مع دعم البحث)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q') || ''
  const where = query
    ? {
        OR: [
          { name: { contains: query } },
          { customerCode: { contains: query } },
          { phone: { contains: query } },
        ],
      }
    : {}
  const customers = await db.customer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(customers)
}

// إضافة عميل
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }
  if (session.user.role === 'user') {
    return NextResponse.json({ error: 'لا تملك صلاحية الإضافة' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { name, phone, address, email, notes } = body

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { error: 'اسم العميل مطلوب ولا يمكن أن يكون فارغًا.' },
        { status: 400 }
      )
    }

    const customerCode = await generateCustomerCode()

    const customer = await db.customer.create({
      data: {
        customerCode,
        name: String(name).trim(),
        phone: String(phone || '').trim(),
        address: String(address || '').trim(),
        email: String(email || '').trim(),
        notes: String(notes || '').trim(),
      },
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: getArabicErrorMessage(error) },
      { status: 400 }
    )
  }
}
