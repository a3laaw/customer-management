import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { generateContractNumber, getArabicErrorMessage } from '@/lib/utils'

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
          { contractNumber: { contains: query } },
          { customer: { name: { contains: query } } },
        ],
      }
    : {}
  const contracts = await db.contract.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { name: true, customerCode: true } },
      invoices: { select: { amount: true } },
    },
  })
  const result = contracts.map((c) => {
    const totalInvoiced = c.invoices.reduce((s, i) => s + i.amount, 0)
    return {
      id: c.id,
      contractNumber: c.contractNumber,
      customerId: c.customerId,
      customerName: c.customer.name,
      customerCode: c.customer.customerCode,
      contractDate: c.contractDate,
      description: c.description,
      amount: c.amount,
      notes: c.notes,
      createdAt: c.createdAt,
      totalInvoiced,
      remaining: c.amount - totalInvoiced,
    }
  })
  return NextResponse.json(result)
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
    const { customerId, contractDate, description, amount, notes } = body

    if (!customerId) {
      return NextResponse.json(
        { error: 'يجب اختيار العميل.' },
        { status: 400 }
      )
    }
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

    const customer = await db.customer.findUnique({
      where: { id: String(customerId) },
    })
    if (!customer) {
      return NextResponse.json(
        { error: 'العميل المحدد غير موجود.' },
        { status: 400 }
      )
    }

    const contractNumber = await generateContractNumber()
    const contract = await db.contract.create({
      data: {
        contractNumber,
        customerId: String(customerId),
        contractDate: String(contractDate),
        description: String(description || '').trim(),
        amount: amountNum,
        notes: String(notes || '').trim(),
      },
      include: { customer: { select: { name: true, customerCode: true } } },
    })
    return NextResponse.json(contract, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: getArabicErrorMessage(error) },
      { status: 400 }
    )
  }
}
