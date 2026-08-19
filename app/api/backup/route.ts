import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { authOptions } from '@/lib/auth'
import path from 'path'
import fs from 'fs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'الصلاحية للمدير فقط' }, { status: 403 })
  }
  try {
    const dbPath = path.join(process.cwd(), 'db', 'custom.db')
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: 'قاعدة البيانات غير موجودة.' }, { status: 500 })
    }
    const data = fs.readFileSync(dbPath)
    const filename = `backup_${new Date().toISOString().slice(0, 10)}.sqlite`
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطأ' },
      { status: 500 }
    )
  }
}
