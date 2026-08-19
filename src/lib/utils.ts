/**
 * أدوات مساعدة عامة: التحقق، تنسيق الأرقام، التواريخ، ID.
 */
import bcrypt from 'bcryptjs'
import { ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { db } from '@/lib/db'

// ============= Tailwind class merge (cn) =============
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============= كلمات المرور =============
const SALT_ROUNDS = 10

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ============= تنسيق المبالغ =============
export function formatAmount(amount: number, decimals: number = 3): string {
  const value = Number.isFinite(amount) ? amount : 0
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatAmountWithCurrency(
  amount: number,
  currency: string = 'د.ك'
): string {
  return `${formatAmount(amount)} ${currency}`
}

// ============= تنسيق التواريخ =============
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}` // DD/MM/YYYY
  } catch {
    return dateStr
  }
}

export function formatDateTime(date: Date | string | undefined | null): string {
  if (!date) return ''
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return String(date)
    const datePart = formatDate(d.toISOString().slice(0, 10))
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${datePart} ${hours}:${minutes}`
  } catch {
    return String(date)
  }
}

// ============= توليد الأرقام التسلسلية =============
export async function generateCustomerCode(): Promise<string> {
  const count = await db.customer.count()
  return `CUST-${String(count + 1).padStart(4, '0')}`
}

export async function generateContractNumber(): Promise<string> {
  const count = await db.contract.count()
  return `CON-${String(count + 1).padStart(4, '0')}`
}

export async function generateInvoiceNumber(): Promise<string> {
  const count = await db.invoice.count()
  return `INV-${String(count + 1).padStart(4, '0')}`
}

// ============= رسائل الأخطاء العربية =============
export function getArabicErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message
    if (msg.includes('Unique constraint')) {
      if (msg.includes('customerCode')) return 'رقم العميل مستخدم مسبقًا.'
      if (msg.includes('contractNumber')) return 'رقم العقد مستخدم مسبقًا.'
      if (msg.includes('invoiceNumber')) return 'رقم الفاتورة مستخدم مسبقًا.'
      if (msg.includes('username')) return 'اسم المستخدم مستخدم مسبقًا.'
      return 'القيمة مستخدمة مسبقًا (يجب أن تكون فريدة).'
    }
    if (msg.includes('Foreign key constraint')) {
      return 'لا يمكن الحذف: هناك سجلات مرتبطة.'
    }
    return msg
  }
  return 'حدث خطأ غير متوقع.'
}

// ============= أنواع =============
export type Role = 'admin' | 'manager' | 'user'

export interface SessionUser {
  id: string
  username: string
  name: string
  role: Role
}

// ============= إعدادات =============
export async function getSettings() {
  const s = await db.settings.findUnique({ where: { id: '1' } })
  if (!s) {
    return {
      companyName: '',
      companyAddress: '',
      companyPhone: '',
      companyEmail: '',
      logoPath: '',
      currency: 'د.ك',
      uiTheme: 'light',
    }
  }
  return s
}
