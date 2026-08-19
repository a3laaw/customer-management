import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { generateInvoiceNumber, getArabicErrorMessage } from '@/lib/utils'

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
          { invoiceNumber: { contains: query } },
          { customer: { name: { contains: query } } },
          { contract: { contractNumber: { contains: query } } },
        ],
      }
    : {}
  const invoices = await db.invoice.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { name: true } },
      contract: { select: { contractNumber: true, amount: true } },
    },
  })
  return NextResponse.json(
    invoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      customerId: i.customerId,
      contractId: i.contractId,
      invoiceDate: i.invoiceDate,
      description: i.description,
      amount: i.amount,
      notes: i.notes,
      createdAt: i.createdAt,
      customerName: i.customer.name,
      contractNumber: i.contract.contractNumber,
      contractAmount: i.contract.amount,
    }))
  )
}

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
    const { customerId, contractId, invoiceDate, description, amount, notes } = body

    if (!customerId || !contractId || !invoiceDate) {
      return NextResponse.json(
        { error: 'يجب اختيار العميل والعقد وتحديد التاريخ.' },
        { status: 400 }
      )
    }
    const amountNum = Number(amount)
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'مبلغ الفاتورة يجب أن يكون أكبر من صفر ولا يمكن أن يكون سالبًا.' },
        { status: 400 }
      )
    }

    // تحقق من تطابق العقد مع العميل
    const contract = await db.contract.findUnique({
      where: { id: String(contractId) },
      include: { invoices: { select: { amount: true } } },
    })
    if (!contract) {
      return NextResponse.json(
        { error: 'العقد المحدد غير موجود.' },
        { status: 400 }
      )
    }
    if (contract.customerId !== String(customerId)) {
      return NextResponse.json(
        { error: 'العقد المحدد لا ينتمي إلى العميل المحدد.' },
        { status: 400 }
      )
    }

    // التحقق من تجاوز المبلغ المتبقي
    const totalInvoiced = contract.invoices.reduce((s, i) => s + i.amount, 0)
    const remaining = contract.amount - totalInvoiced
    if (amountNum > remaining + 0.001) {
      return NextResponse.json(
        {
          error: `قيمة الفاتورة تتجاوز المبلغ المتبقي من العقد.\nقيمة العقد: ${contract.amount.toFixed(3)}\nإجمالي الفواتير السابقة: ${totalInvoiced.toFixed(3)}\nالمبلغ المتبقي: ${remaining.toFixed(3)}\nقيمة الفاتورة المدخلة: ${amountNum.toFixed(3)}`,
        },
        { status: 400 }
      )
    }

    const invoiceNumber = await generateInvoiceNumber()
    const invoice = await db.invoice.create({
      data: {
        invoiceNumber,
        customerId: String(customerId),
        contractId: String(contractId),
        invoiceDate: String(invoiceDate),
        description: String(description || '').trim(),
        amount: amountNum,
        notes: String(notes || '').trim(),
      },
      include: {
        customer: { select: { name: true } },
        contract: { select: { contractNumber: true, amount: true } },
      },
    })
    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: getArabicErrorMessage(error) },
      { status: 400 }
    )
  }
}
