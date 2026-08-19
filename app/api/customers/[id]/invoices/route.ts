import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }
  const { id } = await params
  const invoices = await db.invoice.findMany({
    where: { customerId: id },
    orderBy: { createdAt: 'desc' },
    include: {
      contract: { select: { contractNumber: true } },
    },
  })
  return NextResponse.json(
    invoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      invoiceDate: i.invoiceDate,
      description: i.description,
      amount: i.amount,
      notes: i.notes,
      contractNumber: i.contract.contractNumber,
    }))
  )
}
