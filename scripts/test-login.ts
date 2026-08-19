import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const admin = await db.user.findUnique({ where: { username: 'admin' } })
  if (!admin) { console.log('❌ admin غير موجود'); return }
  console.log('admin.password:', admin.password.substring(0, 30) + '...')
  // التحقق من admin123
  const valid = await bcrypt.compare('admin123', admin.password)
  console.log('bcrypt.compare("admin123", hash):', valid)
  // توليد hash جديد صحيح
  const newHash = await bcrypt.hash('admin123', 10)
  console.log('newHash للتجربة:', newHash)
  // تحديث في القاعدة
  await db.user.update({ where: { id: admin.id }, data: { password: newHash } })
  console.log('✅ تم تحديث كلمة المرور بـ hash جديد')
  const verifyAgain = await bcrypt.compare('admin123', newHash)
  console.log('التحقق من الـ hash الجديد:', verifyAgain)
  await db.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
