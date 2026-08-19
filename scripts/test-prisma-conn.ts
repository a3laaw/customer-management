import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  console.log('🔌 اختبار Prisma مع Supabase...')
  const users = await db.user.count()
  const customers = await db.customer.count()
  const contracts = await db.contract.count()
  const invoices = await db.invoice.count()
  const settings = await db.settings.count()
  console.log(`   ✅ Users: ${users}`)
  console.log(`   ✅ Customers: ${customers}`)
  console.log(`   ✅ Contracts: ${contracts}`)
  console.log(`   ✅ Invoices: ${invoices}`)
  console.log(`   ✅ Settings: ${settings}`)
  const admin = await db.user.findUnique({ where: { username: 'admin' } })
  if (admin) {
    console.log(`\n👤 admin موجود: ${admin.name} (${admin.role})`)
  }
  await db.$disconnect()
}
main().catch(e => { console.error('❌', e.message); process.exit(1) })
