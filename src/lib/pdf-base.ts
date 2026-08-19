/**
 * مكتبة PDF عربية RTL باستخدام pdf-lib + خط Tajawal.
 *
 * نظرًا لأن pdf-lib لا يدعم bidi أصليًا، نعالج النص العربي يدويًا:
 * - الحروف العربية مرتبطة تلقائيًا في الخط.
 * - نعكس ترتيب الكلمات في الجملة لعرض RTL.
 *
 * للجداول: نحدد عناوين الأعمدة ونرسم الخلايا يدويًا.
 */
import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb, type RGB } from 'pdf-lib'
import fontkitModule from '@pdf-lib/fontkit'
import path from 'path'
import fs from 'fs'

// fontkitModule هو default export، نأخذ منه fontkit
const fontkit: any = (fontkitModule as any).create
  ? (fontkitModule as any)
  : fontkitModule

// ============= تحميل الخط =============
const FONT_PATH = path.join(process.cwd(), 'public', 'fonts', 'Tajawal-Regular.ttf')
const FONT_BOLD_PATH = path.join(process.cwd(), 'public', 'fonts', 'Tajawal-Bold.ttf')

let cachedFont: PDFFont | null = null
let cachedBoldFont: PDFFont | null = null

async function getFont(doc: PDFDocument, bold = false): Promise<PDFFont> {
  if (bold && cachedBoldFont && (cachedBoldFont as any).doc === doc) return cachedBoldFont
  if (!bold && cachedFont && (cachedFont as any).doc === doc) return cachedFont
  doc.registerFontkit(fontkit)
  const fontPath = bold ? FONT_BOLD_PATH : FONT_PATH
  if (!fs.existsSync(fontPath)) {
    throw new Error('ملف الخط غير موجود: ' + fontPath)
  }
  const bytes = fs.readFileSync(fontPath)
  const font = await doc.embedFont(bytes, { subset: true })
  if (bold) cachedBoldFont = font
  else cachedFont = font
  ;(font as any).doc = doc
  return font
}

// ============= ألوان =============
export const COLORS = {
  primary: rgb(0.122, 0.227, 0.373), // #1F3A5F
  accent: rgb(0.788, 0.635, 0.153),  // #C9A227
  text: rgb(0.102, 0.102, 0.102),
  muted: rgb(0.4, 0.4, 0.4),
  light: rgb(0.95, 0.96, 0.98),
  border: rgb(0.835, 0.851, 0.882),
  white: rgb(1, 1, 1),
  bgRow: rgb(0.97, 0.98, 0.99),
}

// ============= أدوات RTL =============
/**
 * معالجة نص عربي للعرض في pdf-lib:
 * - الحروف العربية تتصل تلقائيًا في خط Tajawal.
 * - نعكس ترتيب الكلمات لعرض RTL صحيح.
 * - الأرقام والنصوص اللاتينية تبقى كما هي (LTR داخل النص).
 */
export function shapeArabic(text: string): string {
  if (!text) return ''
  // تقسيم النص إلى كلمات وعكسها للعرض RTL
  // الأرقام والرموز اللاتينية تبقى بنفس الترتيب داخل كل كلمة
  const words = text.split(/\s+/)
  return words.reverse().join(' ')
}

// ============= صفحة A4 =============
export async function createPdfPage(doc: PDFDocument): Promise<PDFPage> {
  const page = doc.addPage([595.28, 841.89]) // A4 بـ points
  return page
}

// ============= رسم النص =============
export async function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  options: {
    size?: number
    bold?: boolean
    color?: RGB
    align?: 'right' | 'left' | 'center'
    maxWidth?: number
  } = {}
) {
  const { size = 11, bold = false, color = COLORS.text, align = 'right', maxWidth } = options
  const doc = page.doc as PDFDocument
  const font = await getFont(doc, bold)
  const shaped = shapeArabic(String(text || ''))

  let textX = x
  if (align === 'right') {
    const w = font.widthOfTextAtSize(shaped, size)
    textX = x - w
  } else if (align === 'center') {
    const w = font.widthOfTextAtSize(shaped, size)
    textX = x - w / 2
  }
  // قص النص إذا تجاوز maxWidth (بسيط)
  let finalText = shaped
  if (maxWidth) {
    const w = font.widthOfTextAtSize(shaped, size)
    if (w > maxWidth) {
      // تقريب: قص وفق عدد الأحرف
      const ratio = maxWidth / w
      const cut = Math.floor(shaped.length * ratio * 0.95)
      finalText = shaped.substring(0, cut) + '…'
    }
  }
  page.drawText(finalText, { x: textX, y, size, font, color })
  return font.widthOfTextAtSize(finalText, size)
}

// ============= رسم مستطيل =============
export function drawRect(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  options: { fill?: RGB; border?: RGB; borderWidth?: number } = {}
) {
  const { fill, border, borderWidth = 0.5 } = options
  if (fill) {
    page.drawRectangle({
      x, y, width: w, height: h,
      color: fill,
      borderColor: border,
      borderWidth: border ? borderWidth : 0,
    })
  } else if (border) {
    page.drawRectangle({
      x, y, width: w, height: h,
      borderColor: border,
      borderWidth,
    })
  } else {
    page.drawRectangle({ x, y, width: w, height: h })
  }
}

// ============= رسم خط =============
export function drawLine(
  page: PDFPage,
  x1: number, y1: number, x2: number, y2: number,
  color: RGB = COLORS.border, thickness = 0.5
) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness,
    color,
  })
}

export { getFont, PDFDocument, PDFPage, PDFFont, rgb, RGB }
