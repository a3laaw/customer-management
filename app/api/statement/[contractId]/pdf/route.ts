import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import { PDFDocument, rgb } from 'pdf-lib'
import {
  COLORS, getFont, drawText, drawRect, drawLine,
} from '@/lib/pdf-base'
import { formatAmount, formatDate } from '@/lib/utils'

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 40

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }
  const { contractId } = await params
  const url = new URL(req.url)
  const customerId = url.searchParams.get('customerId') || ''
  const isDownload = url.searchParams.get('download') === '1'

  const contract = await db.contract.findUnique({
    where: { id: contractId },
    include: {
      customer: true,
      invoices: { orderBy: { invoiceDate: 'asc' } },
    },
  })
  if (!contract) {
    return NextResponse.json({ error: 'العقد غير موجود.' }, { status: 404 })
  }
  if (customerId && contract.customerId !== customerId) {
    return NextResponse.json({ error: 'العقد لا ينتمي للعميل المحدد.' }, { status: 400 })
  }
  const settings = await db.settings.findUnique({ where: { id: '1' } }) || {
    companyName: '', companyAddress: '', companyPhone: '',
    companyEmail: '', logoPath: '', currency: 'د.ك',
  }

  const totalInvoiced = contract.invoices.reduce((s, i) => s + i.amount, 0)
  const remaining = contract.amount - totalInvoiced

  try {
    const pdfDoc = await PDFDocument.create()
    pdfDoc.setTitle(`كشف حساب - ${contract.contractNumber}`)
    pdfDoc.setAuthor(settings.companyName || 'نظام إدارة العملاء')
    const page = pdfDoc.addPage([PAGE_W, PAGE_H])

    let y = PAGE_H - MARGIN
    // خط ذهبي علوي
    drawRect(page, MARGIN, y, PAGE_W - 2 * MARGIN, 3, { fill: COLORS.accent })
    y -= 20

    // اسم الشركة (يمين)
    await drawText(page, settings.companyName || 'اسم الشركة', PAGE_W - MARGIN, y, {
      size: 14, bold: true, color: COLORS.primary,
    })
    y -= 18
    if (settings.companyAddress) {
      await drawText(page, settings.companyAddress, PAGE_W - MARGIN, y, {
        size: 9, color: COLORS.muted,
      })
      y -= 13
    }
    if (settings.companyPhone) {
      await drawText(page, `هاتف: ${settings.companyPhone}`, PAGE_W - MARGIN, y, {
        size: 9, color: COLORS.muted,
      })
      y -= 13
    }
    if (settings.companyEmail) {
      await drawText(page, `بريد: ${settings.companyEmail}`, PAGE_W - MARGIN, y, {
        size: 9, color: COLORS.muted,
      })
    }

    y = PAGE_H - MARGIN - 100
    drawLine(page, MARGIN, y, PAGE_W - MARGIN, y, COLORS.accent, 1)
    y -= 20

    // عنوان
    await drawText(page, 'كشف حساب', PAGE_W / 2, y, {
      size: 22, bold: true, color: COLORS.primary, align: 'center',
    })
    y -= 30

    // ============ بيانات العميل ============
    await drawText(page, 'بيانات العميل', PAGE_W - MARGIN, y, {
      size: 13, bold: true, color: COLORS.primary,
    })
    y -= 18

    const colW = (PAGE_W - 2 * MARGIN) / 2
    // ترويسة
    drawRect(page, MARGIN, y - 4, colW, 22, { fill: COLORS.light, border: COLORS.border })
    drawRect(page, MARGIN + colW, y - 4, colW, 22, { fill: COLORS.light, border: COLORS.border })
    await drawText(page, 'العميل', MARGIN + colW - 6, y, {
      size: 10, bold: true, align: 'right',
    })
    await drawText(page, 'البيانات', PAGE_W - MARGIN - 6, y, {
      size: 10, bold: true, align: 'right',
    })
    y -= 22

    const custRows: [string, string][] = [
      [`الاسم: ${contract.customer.name}`, `رقم العميل: ${contract.customer.customerCode}`],
      [`العنوان: ${contract.customer.address || '-'}`, `الهاتف: ${contract.customer.phone || '-'}`],
      [`البريد: ${contract.customer.email || '-'}`, `تاريخ الإنشاء: ${formatDate(contract.customer.createdAt.toISOString().slice(0, 10))}`],
    ]
    for (const [left, right] of custRows) {
      drawRect(page, MARGIN, y - 4, colW, 18, { border: COLORS.border })
      drawRect(page, MARGIN + colW, y - 4, colW, 18, { border: COLORS.border })
      await drawText(page, left, MARGIN + colW - 6, y, {
        size: 10, align: 'right', maxWidth: colW - 12,
      })
      await drawText(page, right, PAGE_W - MARGIN - 6, y, {
        size: 10, align: 'right', maxWidth: colW - 12,
      })
      y -= 18
    }
    y -= 10

    // ============ بيانات العقد ============
    await drawText(page, 'بيانات العقد', PAGE_W - MARGIN, y, {
      size: 13, bold: true, color: COLORS.primary,
    })
    y -= 18

    const conRows: [string, string][] = [
      [`رقم العقد: ${contract.contractNumber}`, `تاريخ العقد: ${formatDate(contract.contractDate)}`],
      [`وصف العقد: ${contract.description || '-'}`, `قيمة العقد: ${formatAmount(contract.amount)} ${settings.currency}`],
    ]
    for (const [left, right] of conRows) {
      drawRect(page, MARGIN, y - 4, colW, 18, { border: COLORS.border })
      drawRect(page, MARGIN + colW, y - 4, colW, 18, { border: COLORS.border })
      await drawText(page, left, MARGIN + colW - 6, y, {
        size: 10, align: 'right', maxWidth: colW - 12,
      })
      await drawText(page, right, PAGE_W - MARGIN - 6, y, {
        size: 10, align: 'right', maxWidth: colW - 12,
      })
      y -= 18
    }
    y -= 15

    // ============ جدول الحركة ============
    await drawText(page, 'حركة الحساب', PAGE_W - MARGIN, y, {
      size: 13, bold: true, color: COLORS.primary,
    })
    y -= 18

    // أعمدة الجدول
    const tblCols = [
      { name: 'التاريخ', w: 80 },
      { name: 'البيان', w: 180 },
      { name: 'رقم المرجع', w: 90 },
      { name: 'المبلغ', w: 85 },
      { name: 'الرصيد', w: 85 },
    ]
    const totalW = tblCols.reduce((s, c) => s + c.w, 0)
    if (totalW > PAGE_W - 2 * MARGIN) {
      // تقليص بسيط
      tblCols[1].w = PAGE_W - 2 * MARGIN - (80 + 90 + 85 + 85)
    }
    const adjTotalW = tblCols.reduce((s, c) => s + c.w, 0)

    // ترويسة
    drawRect(page, MARGIN, y - 4, adjTotalW, 22, { fill: COLORS.primary })
    let cx = MARGIN
    for (const c of tblCols) {
      await drawText(page, c.name, cx + c.w / 2, y, {
        size: 10, bold: true, color: COLORS.white, align: 'center',
      })
      cx += c.w
    }
    y -= 22

    // صف العقد (الأول)
    drawRect(page, MARGIN, y - 4, adjTotalW, 22, {
      fill: COLORS.light, border: COLORS.border,
    })
    await drawText(page, formatDate(contract.contractDate), MARGIN + 40, y, {
      size: 10, bold: true, align: 'center',
    })
    await drawText(page, 'قيمة العقد', MARGIN + tblCols[0].w + 6, y, {
      size: 10, bold: true, align: 'right',
    })
    await drawText(page, contract.contractNumber, MARGIN + tblCols[0].w + tblCols[1].w + tblCols[2].w / 2, y, {
      size: 10, bold: true, align: 'center',
    })
    await drawText(page, formatAmount(contract.amount), MARGIN + tblCols[0].w + tblCols[1].w + tblCols[2].w + tblCols[3].w - 6, y, {
      size: 10, bold: true, align: 'right',
    })
    await drawText(page, formatAmount(contract.amount), PAGE_W - MARGIN - 6, y, {
      size: 10, bold: true, align: 'right',
    })
    y -= 22

    // صفوف الفواتير + رصيد جاري
    let running = contract.amount
    for (const inv of contract.invoices) {
      running -= inv.amount
      const isAlt = contract.invoices.indexOf(inv) % 2 === 1
      drawRect(page, MARGIN, y - 4, adjTotalW, 22, {
        fill: isAlt ? COLORS.bgRow : undefined,
        border: COLORS.border,
      })
      await drawText(page, formatDate(inv.invoiceDate), MARGIN + 40, y, {
        size: 10, align: 'center',
      })
      await drawText(page, inv.description || 'فاتورة', MARGIN + tblCols[0].w + 6, y, {
        size: 10, align: 'right', maxWidth: tblCols[1].w - 12,
      })
      await drawText(page, inv.invoiceNumber, MARGIN + tblCols[0].w + tblCols[1].w + tblCols[2].w / 2, y, {
        size: 10, align: 'center',
      })
      await drawText(page, formatAmount(inv.amount), MARGIN + tblCols[0].w + tblCols[1].w + tblCols[2].w + tblCols[3].w - 6, y, {
        size: 10, align: 'right',
      })
      await drawText(page, formatAmount(running), PAGE_W - MARGIN - 6, y, {
        size: 10, align: 'right',
      })
      y -= 22
    }
    y -= 10

    // ============ ملخص الأرصدة ============
    const summaryW = 200
    const summaryX = PAGE_W - MARGIN - summaryW
    const summaryRows: [string, string, boolean][] = [
      ['قيمة العقد', `${formatAmount(contract.amount)} ${settings.currency}`, false],
      ['إجمالي الفواتير', `${formatAmount(totalInvoiced)} ${settings.currency}`, false],
      ['المبلغ المتبقي', `${formatAmount(remaining)} ${settings.currency}`, true],
    ]
    let sy = y
    for (const [label, val, highlight] of summaryRows) {
      drawRect(page, summaryX, sy - 4, summaryW, 22, {
        fill: highlight ? COLORS.accent : COLORS.light,
        border: COLORS.border,
      })
      await drawText(page, label, summaryX + 6, sy, {
        size: 10, bold: highlight,
        color: highlight ? COLORS.white : COLORS.text,
        maxWidth: 110,
      })
      await drawText(page, val, summaryX + summaryW - 6, sy, {
        size: 10, bold: true,
        color: highlight ? COLORS.white : COLORS.text,
        align: 'right',
      })
      sy -= 22
    }

    // تذييل
    drawText(page, `صفحة 1`, PAGE_W / 2, 20, {
      size: 9, color: COLORS.muted, align: 'center',
    })

    const pdfBytes = await pdfDoc.save()
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': isDownload
          ? `attachment; filename="statement_${contract.contractNumber}.pdf"`
          : `inline; filename="statement_${contract.contractNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Statement PDF error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'فشل توليد PDF' },
      { status: 500 }
    )
  }
}
