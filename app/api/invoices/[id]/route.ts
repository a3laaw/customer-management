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
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, customerCode: true, phone: true, address: true, email: true } },
      contract: {
        select: {
          contractNumber: true,
          contractDate: true,
          amount: true,
          invoices: { select: { amount: true } },
        },
      },
    },
  })
  if (!invoice) {
    return NextResponse.json({ error: 'الفاتورة غير موجودة.' }, { status: 404 })
  }
  const totalInvoiced = invoice.contract.invoices.reduce(
    (s, i) => s + i.amount,
    0
  )
  return NextResponse.json({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    contractId: invoice.contractId,
    invoiceDate: invoice.invoiceDate,
    description: invoice.description,
    amount: invoice.amount,
    notes: invoice.notes,
    createdAt: invoice.createdAt,
    customer: invoice.customer,
    contract: {
      contractNumber: invoice.contract.contractNumber,
      contractDate: invoice.contract.contractDate,
      amount: invoice.contract.amount,
      totalInvoiced,
      remaining: invoice.contract.amount - totalInvoiced,
    },
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
    const { invoiceDate, description, amount, notes } = body
    if (!invoiceDate) {
      return NextResponse.json(
        { error: 'تاريخ الفاتورة مطلوب.' },
        { status: 400 }
      )
    }
    const amountNum = Number(amount)
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'مبلغ الفاتورة يجب أن يكون أكبر من صفر.' },
        { status: 400 }
      )
    }

    const current = await db.invoice.findUnique({
      where: { id },
      select: { contractId: true },
    })
    if (!current) {
      return NextResponse.json(
        { error: 'الفاتورة غير موجودة.' },
        { status: 404 }
      )
    }

    // حساب المتاح لهذه الفاتورة = قيمة العقد - (إجمالي فواتير العقد - قيمة الفاتورة الحالية)
    const contract = await db.contract.findUnique({
      where: { id: current.contractId },
      include: {
        invoices: {
          where: { id: { not: id } },
          select: { amount: true },
        },
      },
    })
    if (!contract) {
      return NextResponse.json(
        { error: 'العقد غير موجود.' },
        { status: 400 }
      )
    }
    const totalOthers = contract.invoices.reduce((s, i) => s + i.amount, 0)
    const remainingForThis = contract.amount - totalOthers
    if (amountNum > remainingForThis + 0.001) {
      return NextResponse.json(
        {
          error: `قيمة الفاتورة الجديدة تتجاوز المبلغ المتبقي من العقد.\nقيمة العقد: ${contract.amount.toFixed(3)}\nإجمالي الفواتير الأخرى: ${totalOthers.toFixed(3)}\nالمبلغ المتاح لهذه الفاتورة: ${remainingForThis.toFixed(3)}\nقيمة الفاتورة الجديدة: ${amountNum.toFixed(3)}`,
        },
        { status: 400 }
      )
    }

    const invoice = await db.invoice.update({
      where: { id },
      data: {
        invoiceDate: String(invoiceDate),
        description: String(description || '').trim(),
        amount: amountNum,
        notes: String(notes || '').trim(),
      },
    })
    return NextResponse.json(invoice)
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
    await db.invoice.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: getArabicErrorMessage(error) },
      { status: 400 }
    )
  }
}
