import Link from 'next/link'

/**
 * صفحة 404 مخصصة بدون الاعتماد على SessionProvider أو AppShell
 * (تفادي خطأ ERR_INVALID_URL في Vercel build عند توليد static page)
 */
export default function NotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#f8fafc',
          color: '#1e3a5f',
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '6rem',
              margin: 0,
              fontWeight: 700,
              color: '#1e3a5f',
            }}
          >
            404
          </h1>
          <p
            style={{
              fontSize: '1.25rem',
              color: '#64748b',
              marginBottom: '2rem',
            }}
          >
            الصفحة غير موجودة
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              background: '#1e3a5f',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            العودة للرئيسية
          </a>
        </div>
      </body>
    </html>
  )
}
