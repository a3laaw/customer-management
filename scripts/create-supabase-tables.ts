/**
 * سكريبت إنشاء الجداول على Supabase PostgreSQL
 * يجرّب عدة endpoints (Direct + Poolers) حتى يجد واحدًا يعمل
 */
import { Client } from 'pg'
import fs from 'fs'
import path from 'path'
import dns from 'dns'

dns.setDefaultResultOrder('ipv4first')

const PASSWORD = process.env.SUPABASE_PASSWORD || 'RW3mnyl9IlJGL5sx'
const PROJECT_REF = process.env.SUPABASE_PROJECT || 'nvqioceezcgoqydzryxp'

// قائمة endpoints للتجربة (session pooler + transaction pooler + direct)
const ENDPOINTS = [
  {
    name: 'Session Pooler (ap-northeast-2) — المُكتشف',
    config: {
      host: 'aws-0-ap-northeast-2.pooler.supabase.com',
      port: 5432,
      database: 'postgres',
      user: `postgres.${PROJECT_REF}`,
      password: PASSWORD,
      ssl: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Session Pooler (eu-central-1)',
    config: {
      host: 'aws-0-eu-central-1.pooler.supabase.com',
      port: 5432,
      database: 'postgres',
      user: `postgres.${PROJECT_REF}`,
      password: PASSWORD,
      ssl: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Session Pooler (us-east-1)',
    config: {
      host: 'aws-0-us-east-1.pooler.supabase.com',
      port: 5432,
      database: 'postgres',
      user: `postgres.${PROJECT_REF}`,
      password: PASSWORD,
      ssl: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Transaction Pooler (ap-northeast-2, port 6543)',
    config: {
      host: 'aws-0-ap-northeast-2.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      user: `postgres.${PROJECT_REF}`,
      password: PASSWORD,
      ssl: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Direct connection',
    config: {
      host: `db.${PROJECT_REF}.supabase.co`,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: PASSWORD,
      ssl: { rejectUnauthorized: false }
    }
  }
]

async function tryEndpoint(endpoint: typeof ENDPOINTS[0]) {
  console.log(`\n🔌 تجربة: ${endpoint.name}`)
  console.log(`   Host: ${endpoint.config.host}:${endpoint.config.port}`)
  console.log(`   User: ${endpoint.config.user}`)
  
  const client = new Client({
    ...endpoint.config,
    connectionTimeoutMillis: 10000
  })
  
  try {
    await client.connect()
    console.log(`   ✅ نجح الاتصال!`)
    return client
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`   ❌ فشل: ${msg.substring(0, 100)}`)
    try { await client.end() } catch {}
    return null
  }
}

async function main() {
  console.log('🔍 البحث عن endpoint يعمل لـ Supabase...')
  console.log(`   Project ref: ${PROJECT_REF}`)
  console.log(`   Password: ${PASSWORD.replace(/./g, '*')}`)
  
  let workingClient: Client | null = null
  let workingEndpoint: typeof ENDPOINTS[0] | null = null
  
  for (const endpoint of ENDPOINTS) {
    const client = await tryEndpoint(endpoint)
    if (client) {
      workingClient = client
      workingEndpoint = endpoint
      break
    }
  }
  
  if (!workingClient || !workingEndpoint) {
    console.error('\n❌ جميع المحاولات فشلت. تحقق من:')
    console.error('   1. صحة الباسوورد')
    console.error('   2. أن المشروع نشط على Supabase')
    console.error('   3. اتصال الإنترنت')
    process.exit(1)
  }

  try {
    // قراءة ملف SQL
    const sqlPath = path.join(process.cwd(), 'supabase_schema.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    console.log(`\n📄 ملف SQL محمّل (${sql.length} حرف)`)

    // تنفيذ SQL
    console.log('🏗️  جاري إنشاء الجداول...')
    await workingClient.query(sql)
    console.log('✅ تم إنشاء الجداول بنجاح!')

    // التحقق من الجداول الموجودة
    const result = await workingClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    console.log('\n📊 الجداول الموجودة الآن:')
    for (const row of result.rows) {
      const count = await workingClient.query(`SELECT COUNT(*) FROM "${row.table_name}"`)
      console.log(`   ✅ ${row.table_name} (${count.rows[0].count} سجل)`)
    }

    // التحقق من مستخدم admin
    const admin = await workingClient.query(`SELECT username, name, role FROM "User" WHERE username = 'admin'`)
    if (admin.rows.length > 0) {
      console.log(`\n👤 مستخدم admin موجود:`)
      console.log(`   اسم المستخدم: ${admin.rows[0].username}`)
      console.log(`   الاسم: ${admin.rows[0].name}`)
      console.log(`   الدور: ${admin.rows[0].role}`)
      console.log(`   كلمة المرور: admin123 (غيّرها فور أول دخول)`)
    }

    console.log(`\n🎉 تم الإعداد بنجاح! استخدم connection string التالي في Vercel:`)
    console.log(`   ${workingEndpoint.name}`)
    
    // إعداد connection string النهائي
    const c = workingEndpoint.config
    const connStr = `postgresql://${c.user}:${PASSWORD}@${c.host}:${c.port}/${c.database}?sslmode=require`
    console.log(`\n📋 DATABASE_URL لـ Vercel:`)
    console.log(`   ${connStr}`)

  } catch (err) {
    console.error('❌ خطأ أثناء إنشاء الجداول:', err instanceof Error ? err.message : err)
    process.exit(1)
  } finally {
    await workingClient.end()
  }
}

main()
