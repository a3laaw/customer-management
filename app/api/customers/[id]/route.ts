import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { getArabicErrorMessage } from '@/lib/utils'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }
  const { id } = await params
  const customer = await db.customer.findUnique({ where: { id } })
  if (!customer) {
    return NextResponse.json(
      { error: 'العميل غير موجود.' },
      { status: 404 }
    )
  }
  return NextResponse.json(customer)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }
  if (session.user.role === 'user') {
    return NextResponse.json(
      { error: 'لا تملك صلاحية التعديل' },
      { status: 403 }
    )
  }
  const { id } = await params
  try {
    const body = await req.json()
    const { name, phone, address, email, notes } = body

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { error: 'اسم العميل مطلوب.' },
        { status: 400 }
      )
    }

    const customer = await db.customer.update({
      where: { id },
      data: {
        name: String(name).trim(),
        phone: String(phone || '').trim(),
        address: String(address || '').trim(),
        email: String(email || '').trim(),
        notes: String(notes || '').trim(),
      },
    })
    return NextResponse.json(customer)
  } catch (error) {
    return NextResponse.json(
      { error: getArabicErrorMessage(error) },
      { status: 400 }
    )
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
    return NextResponse.json(
      { error: 'لا تملك صلاحية الحذف' },
      { status: 403 }
    )
  }
  const { id } = await params
  try {
    // تحقق يدوي من الارتباطات قبل الحذف
    const contractsCount = await db.contract.count({
      where: { customerId: id },
    })
    if (contractsCount > 0) {
      return NextResponse.json(
        {
          error: `لا يمكن حذف العميل لأنه مرتبط بـ ${contractsCount} عقد. احذف العقود المرتبطة أولًا.`,
        },
        { status: 400 }
      )
    }
    const invoicesCount = await db.invoice.count({
      where: { customerId: id },
    })
    if (invoicesCount > 0) {
      return NextResponse.json(
        {
          error: `لا يمكن حذف العميل لأنه مرتبط بـ ${invoicesCount} فاتورة.`,
        },
        { status: 400 }
      )
    }
    await db.customer.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: getArabicErrorMessage(error) },
      { status: 400 }
    )
  }
}
