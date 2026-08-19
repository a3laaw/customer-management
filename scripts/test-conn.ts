import { Client } from 'pg'
import dns from 'dns'
import net from 'net'

// إجبار IPv4
dns.setDefaultResultOrder('ipv4first')

const url = new URL(process.env.DATABASE_URL!)
console.log('Host:', url.hostname)
console.log('Port:', url.port || 5432)
console.log('Database:', url.pathname)

// حل DNS يدويًا
dns.lookup(url.hostname, { family: 4 }, (err, addr) => {
  if (err) { console.error('DNS error:', err); process.exit(1) }
  console.log('Resolved IPv4:', addr)

  const client = new Client({
    host: addr,  // استخدام IPv4 مباشرة
    port: Number(url.port) || 5432,
    database: url.pathname.slice(1),
    user: url.username,
    password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: false }
  })
  
  client.connect()
    .then(() => { console.log('✅ Connected'); return client.query('SELECT version()') })
    .then(r => { console.log('Version:', r.rows[0].version); client.end() })
    .catch(e => { console.error('❌', e.message); process.exit(1) })
})
