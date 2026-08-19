/**
 * بذر قاعدة البيانات بمستخدم admin افتراضي + إعدادات فارغة.
 * يمكن استدعاؤه عند أول تثبيت: POST /api/seed
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/utils'

export async function POST() {
  try {
    // إنشاء إعدادات إن لم تكن موجودة
    const settingsExist = await db.settings.findUnique({ where: { id: '1' } })
    if (!settingsExist) {
      await db.settings.create({
        data: {
          // id سيأخذ القيمة الافتراضية "1"
          companyName: '',
          companyAddress: '',
          companyPhone: '',
          companyEmail: '',
          logoPath: '',
          currency: 'د.ك',
          uiTheme: 'light',
        },
      })
    }

    // إنشاء admin افتراضي إن لم يوجد
    const adminExists = await db.user.findUnique({
      where: { username: 'admin' },
    })
    if (!adminExists) {
      const password = await hashPassword('admin123')
      await db.user.create({
        data: {
          username: 'admin',
          name: 'مدير النظام',
          password,
          role: 'admin',
          active: true,
        },
      })
      return NextResponse.json({
        success: true,
        message: 'تم إنشاء مستخدم admin افتراضي.\nاسم المستخدم: admin\nكلمة المرور: admin123\nيرجى تغييرها بعد تسجيل الدخول.',
      })
    }

    return NextResponse.json({
      success: true,
      message: 'قاعدة البيانات جاهزة. مستخدم admin موجود مسبقًا.',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطأ غير معروف' },
      { status: 500 }
    )
  }
}
