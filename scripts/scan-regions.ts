import { Client } from 'pg'
import dns from 'dns'

dns.setDefaultResultOrder('ipv4first')

const PASSWORD = 'RW3mnyl9IlJGL5sx'
const PROJECT_REF = 'nvqioceezcgoqydzryxp'

// قائمة بكل regions التي يدعمها Supabase
const REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-central-1', 'eu-central-2', 'eu-west-1', 'eu-west-2', 'eu-west-3',
  'ap-northeast-1', 'ap-northeast-2', 'ap-south-1', 'ap-southeast-1', 'ap-southeast-2',
  'sa-east-1', 'ca-central-1'
]

async function tryRegion(region: string) {
  const host = `aws-0-${region}.pooler.supabase.com`
  const client = new Client({
    host,
    port: 5432,
    database: 'postgres',
    user: `postgres.${PROJECT_REF}`,
    password: PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  })
  try {
    await client.connect()
    return { region, host, client }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    try { await client.end() } catch {}
    return { region, host, error: msg }
  }
}

async function main() {
  console.log(`🔍 البحث في كل regions لـ Supabase project: ${PROJECT_REF}\n`)
  
  // تشغيل بالتوازي
  const results = await Promise.all(REGIONS.map(tryRegion))
  
  console.log('النتائج:')
  let successRegion: string | null = null
  for (const r of results) {
    if ('client' in r && r.client) {
      console.log(`   ✅ ${r.region}: نجح الاتصال (${r.host})`)
      successRegion = r.region
      await r.client.end()
      break
    } else {
      const err = (r as any).error || ''
      const short = err.substring(0, 50)
      console.log(`   ❌ ${r.region}: ${short}`)
    }
  }
  
  if (successRegion) {
    console.log(`\n🎉 الإقليم الناجح: ${successRegion}`)
    console.log(`📋 Connection string:`)
    console.log(`postgresql://postgres.${PROJECT_REF}:${PASSWORD}@aws-0-${successRegion}.pooler.supabase.com:5432/postgres`)
  } else {
    console.log(`\n❌ لم ينجح أي region. المشكلة قد تكون:`)
    console.log(`   - الباسوورد غير صحيح`)
    console.log(`   - المشروع متوقف على Supabase`)
    console.log(`   - لم تُفعّل pooler connection في إعدادات المشروع`)
  }
}

main()
