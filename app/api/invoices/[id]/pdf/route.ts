import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import {
  PDFDocument, rgb, StandardFonts,
} from 'pdf-lib'
import {
  COLORS, getFont, drawText, drawRect, drawLine, shapeArabic,
} from '@/lib/pdf-base'
import { formatAmount, formatDate } from '@/lib/utils'

const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 40

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
      customer: true,
      contract: {
        include: {
          invoices: { select: { amount: true } },
        },
      },
    },
  })
  if (!invoice) {
    return NextResponse.json({ error: 'الفاتورة غير موجودة.' }, { status: 404 })
  }
  const settings = await db.settings.findUnique({ where: { id: '1' } }) || {
    companyName: '', companyAddress: '', companyPhone: '',
    companyEmail: '', logoPath: '', currency: 'د.ك',
  }

  const totalInvoiced = invoice.contract.invoices.reduce((s, i) => s + i.amount, 0)
  const remaining = invoice.contract.amount - totalInvoiced

  try {
    const pdfDoc = await PDFDocument.create()
    pdfDoc.setTitle(`فاتورة ${invoice.invoiceNumber}`)
    pdfDoc.setAuthor(settings.companyName || 'نظام إدارة العملاء')
    const page = pdfDoc.addPage([PAGE_W, PAGE_H])
    const font = await getFont(pdfDoc, false)
    const boldFont = await getFont(pdfDoc, true)

    let y = PAGE_H - MARGIN
    // ============ الترويسة: اسم الشركة + شعار ============
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

    // شعار (يمين - بمعنى في الـ RTL هو اليسار البصري)
    if (settings.logoPath) {
      try {
        const logoUrl = settings.logoPath
        if (logoUrl.startsWith('data:image/')) {
          const base64 = logoUrl.split(',')[1]
          const isPng = logoUrl.includes('image/png')
          const isJpeg = logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg')
          const bytes = Uint8Array.from(Buffer.from(base64, 'base64'))
          let img
          if (isPng) img = await pdfDoc.embedPng(bytes)
          else if (isJpeg) img = await pdfDoc.embedJpg(bytes)
          if (img) {
            const maxW = 80, maxH = 80
            const ratio = Math.min(maxW / img.width, maxH / img.height)
            page.drawImage(img, {
              x: MARGIN,
              y: PAGE_H - MARGIN - 80,
              width: img.width * ratio,
              height: img.height * ratio,
            })
          }
        }
      } catch (e) {
        // تجاهل أخطاء الشعار
      }
    }

    y = PAGE_H - MARGIN - 110
    // خط ذهبي فاصل
    drawLine(page, MARGIN, y, PAGE_W - MARGIN, y, COLORS.accent, 1)
    y -= 20

    // عنوان الفاتورة
    await drawText(page, 'فاتورة', PAGE_W / 2, y, {
      size: 22, bold: true, color: COLORS.primary, align: 'center',
    })
    y -= 25

    // بيانات الفاتورة (رقم + تاريخ) - يمين
    await drawText(page, `رقم الفاتورة: ${invoice.invoiceNumber}`, PAGE_W - MARGIN, y, {
      size: 11, bold: true,
    })
    y -= 16
    await drawText(page, `التاريخ: ${formatDate(invoice.invoiceDate)}`, PAGE_W - MARGIN, y, {
      size: 11,
    })
    y -= 25

    // ============ بيانات العميل والعقد ============
    // عنوان قسم
    await drawText(page, 'بيانات العميل والعقد', PAGE_W - MARGIN, y, {
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
    await drawText(page, 'العقد', PAGE_W - MARGIN - 6, y, {
      size: 10, bold: true, align: 'right',
    })
    y -= 22

    // صفوف البيانات
    const rows: [string, string][] = [
      [`الاسم: ${invoice.customer.name}`, `رقم العقد: ${invoice.contract.contractNumber}`],
      [`الهاتف: ${invoice.customer.phone || '-'}`, `تاريخ العقد: ${formatDate(invoice.contract.contractDate)}`],
      [`البريد: ${invoice.customer.email || '-'}`, `البيان: ${invoice.contract.description || '-'}`],
    ]
    for (const [left, right] of rows) {
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

    // ============ تفاصيل الفاتورة ============
    await drawText(page, 'تفاصيل الفاتورة', PAGE_W - MARGIN, y, {
      size: 13, bold: true, color: COLORS.primary,
    })
    y -= 18

    // جدول تفاصيل
    const cols = [
      { name: '#', w: 30 },
      { name: 'البيان', w: PAGE_W - 2 * MARGIN - 30 - 100 },
      { name: 'المبلغ', w: 100 },
    ]
    const totalW = cols.reduce((s, c) => s + c.w, 0)
    // ترويسة
    drawRect(page, MARGIN, y - 4, totalW, 22, { fill: COLORS.primary })
    let cx = MARGIN
    for (const c of cols) {
      await drawText(page, c.name, cx + c.w / 2, y, {
        size: 10, bold: true, color: COLORS.white, align: 'center',
      })
      cx += c.w
    }
    y -= 22

    // صف واحد حاليًا
    drawRect(page, MARGIN, y - 4, totalW, 22, { border: COLORS.border })
    await drawText(page, '1', MARGIN + 15, y, {
      size: 10, align: 'center',
    })
    await drawText(page, invoice.description || 'فاتورة', MARGIN + 30 + 6, y, {
      size: 10, align: 'right', maxWidth: cols[1].w - 12,
    })
    await drawText(page, `${formatAmount(invoice.amount)} ${settings.currency}`, PAGE_W - MARGIN - 6, y, {
      size: 10, align: 'right',
    })
    y -= 22

    y -= 15

    // ============ ملخص الأرصدة ============
    const summaryW = 200
    const summaryX = PAGE_W - MARGIN - summaryW
    const summaryRows: [string, string, boolean][] = [
      ['إجمالي الفاتورة', `${formatAmount(invoice.amount)} ${settings.currency}`, false],
      ['قيمة العقد', `${formatAmount(invoice.contract.amount)} ${settings.currency}`, false],
      ['إجمالي الفواتير على العقد', `${formatAmount(totalInvoiced)} ${settings.currency}`, false],
      ['المبلغ المتبقي من العقد', `${formatAmount(remaining)} ${settings.currency}`, true],
    ]
    let sy = y
    for (const [label, val, highlight] of summaryRows) {
      drawRect(page, summaryX, sy - 4, summaryW, 20, {
        fill: highlight ? COLORS.accent : COLORS.light,
        border: COLORS.border,
      })
      await drawText(page, label, summaryX + 6, sy, {
        size: 10, bold: highlight,
        color: highlight ? COLORS.white : COLORS.text,
        maxWidth: 120,
      })
      await drawText(page, val, summaryX + summaryW - 6, sy, {
        size: 10, bold: true,
        color: highlight ? COLORS.white : COLORS.text,
        align: 'right',
      })
      sy -= 20
    }
    y = sy - 15

    // ============ ملاحظات + توقيع ============
    if (y > 100) {
      // ملاحظات
      drawRect(page, MARGIN, y - 4, PAGE_W - 2 * MARGIN, 30, { border: COLORS.border, fill: COLORS.light })
      await drawText(page, 'ملاحظات:', MARGIN + 6, y + 14, {
        size: 10, bold: true,
      })
      await drawText(page, invoice.notes || '-', MARGIN + 60, y + 14, {
        size: 10,
      })
      y -= 35

      // توقيع
      drawRect(page, MARGIN, y - 4, PAGE_W - 2 * MARGIN, 50, { border: COLORS.border })
      await drawText(page, 'الختم والتوقيع:', PAGE_W - MARGIN - 6, y + 30, {
        size: 10, bold: true, align: 'right',
      })
    }

    // تذييل
    drawText(page, `صفحة 1`, PAGE_W / 2, 20, {
      size: 9, color: COLORS.muted, align: 'center',
    })

    const pdfBytes = await pdfDoc.save()
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice_${invoice.invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'فشل توليد PDF' },
      { status: 500 }
    )
  }
}
