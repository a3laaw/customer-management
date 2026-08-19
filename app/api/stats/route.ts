import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  const [customersCount, contractsCount, contracts, invoices] = await Promise.all([
    db.customer.count(),
    db.contract.count(),
    db.contract.aggregate({ _sum: { amount: true } }),
    db.invoice.aggregate({ _sum: { amount: true } }),
  ])

  const contractsAmount = contracts._sum.amount ?? 0
  const invoicesAmount = invoices._sum.amount ?? 0
  const remaining = contractsAmount - invoicesAmount

  // آخر 5 فواتير
  const recentInvoices = await db.invoice.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { name: true } },
      contract: { select: { contractNumber: true } },
    },
  })

  return NextResponse.json({
    customersCount,
    contractsCount,
    contractsAmount,
    invoicesAmount,
    remaining,
    recentInvoices: recentInvoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customer.name,
      contractNumber: inv.contract.contractNumber,
      amount: inv.amount,
      date: inv.invoiceDate,
    })),
  })
}
