import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

// جلب عقود العميل مع إجمالي الفواتير والمتبقي
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }
  const { id } = await params
  const contracts = await db.contract.findMany({
    where: { customerId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { invoices: true } },
      invoices: {
        select: { amount: true },
      },
    },
  })

  const result = contracts.map((c) => {
    const totalInvoiced = c.invoices.reduce((s, i) => s + i.amount, 0)
    return {
      id: c.id,
      contractNumber: c.contractNumber,
      contractDate: c.contractDate,
      description: c.description,
      amount: c.amount,
      notes: c.notes,
      invoicesCount: c._count.invoices,
      totalInvoiced,
      remaining: c.amount - totalInvoiced,
    }
  })
  return NextResponse.json(result)
}
