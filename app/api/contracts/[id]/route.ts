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
  const contract = await db.contract.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, customerCode: true } },
      invoices: { select: { amount: true } },
    },
  })
  if (!contract) {
    return NextResponse.json(
      { error: 'العقد غير موجود.' },
      { status: 404 }
    )
  }
  const totalInvoiced = contract.invoices.reduce((s, i) => s + i.amount, 0)
  return NextResponse.json({
    id: contract.id,
    contractNumber: contract.contractNumber,
    customerId: contract.customerId,
    customerName: contract.customer.name,
    contractDate: contract.contractDate,
    description: contract.description,
    amount: contract.amount,
    notes: contract.notes,
    totalInvoiced,
    remaining: contract.amount - totalInvoiced,
  })
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
    const { contractDate, description, amount, notes } = body
    if (!contractDate) {
      return NextResponse.json(
        { error: 'تاريخ العقد مطلوب.' },
        { status: 400 }
      )
    }
    const amountNum = Number(amount)
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'قيمة العقد يجب أن تكون أكبر من صفر.' },
        { status: 400 }
      )
    }

    // تحقق من عدم تناقص القيمة عن إجمالي الفواتير
    const current = await db.contract.findUnique({
      where: { id },
      include: { invoices: { select: { amount: true } } },
    })
    if (!current) {
      return NextResponse.json(
        { error: 'العقد غير موجود.' },
        { status: 404 }
      )
    }
    const totalInvoiced = current.invoices.reduce((s, i) => s + i.amount, 0)
    if (amountNum < totalInvoiced - 0.001) {
      return NextResponse.json(
        {
          error: `لا يمكن تقليل قيمة العقد إلى ${amountNum.toFixed(3)} لأن إجمالي الفواتير المسجلة عليه = ${totalInvoiced.toFixed(3)}.`,
        },
        { status: 400 }
      )
    }

    const contract = await db.contract.update({
      where: { id },
      data: {
        contractDate: String(contractDate),
        description: String(description || '').trim(),
        amount: amountNum,
        notes: String(notes || '').trim(),
      },
    })
    return NextResponse.json(contract)
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
    const invoicesCount = await db.invoice.count({
      where: { contractId: id },
    })
    if (invoicesCount > 0) {
      return NextResponse.json(
        {
          error: `لا يمكن حذف العقد لأنه مرتبط بـ ${invoicesCount} فاتورة. احذف الفواتير المرتبطة أولًا.`,
        },
        { status: 400 }
      )
    }
    await db.contract.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: getArabicErrorMessage(error) },
      { status: 400 }
    )
  }
}
