import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'

/**
 * ملخص العقد: قيمة العقد + إجمالي الفواتير + المبلغ المتبقي
 * يستخدم في شاشة إنشاء/تعديل الفاتورة لإظهار التحذير الحيّ.
 */
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
    select: { id: true, amount: true },
  })
  if (!contract) {
    return NextResponse.json(
      { error: 'العقد غير موجود.' },
      { status: 404 }
    )
  }
  const invoices = await db.invoice.aggregate({
    where: { contractId: id },
    _sum: { amount: true },
  })
  const totalInvoiced = invoices._sum.amount ?? 0
  const remaining = contract.amount - totalInvoiced
  return NextResponse.json({
    contractId: contract.id,
    contractAmount: contract.amount,
    totalInvoiced,
    remaining,
  })
}
