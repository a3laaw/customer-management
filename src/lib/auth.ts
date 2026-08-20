import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/utils'
import type { Role } from '@/lib/utils'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      username: string
      name: string
      role: Role
    }
  }
  interface User {
    id: string
    username: string
    name: string
    role: Role
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    username: string
    name: string
    role: Role
  }
}

// ============= ضمان توفر secret =============
// NextAuth يحتاج NEXTAUTH_SECRET لتشفير جلسات JWT
// لو لم يُضبط، نولّد واحدًا ثابتًا (لاحظ: غير آمن للإنتاج الحقيقي،
// لكن يفادي انهيار التطبيق بالكامل. الأفضل ضبط NEXTAUTH_SECRET على Vercel)
const FALLBACK_SECRET = 'customer-management-development-secret-do-not-use-in-production-CHANGE-ME-please-32-chars-min'

function getAuthSecret(): string {
  // NextAuth يقرأ NEXTAUTH_SECRET تلقائيًا من process.env
  // لكن نتأكد من وجوده
  return process.env.NEXTAUTH_SECRET || FALLBACK_SECRET
}

// ============= اشتقاق NEXTAUTH_URL من request لو لم يُضبط =============
// NextAuth يحتاج NEXTAUTH_URL لمعرفة origin
// Vercel يوفر VERCEL_URL تلقائيًا — نستعمله كـ fallback
function getAuthUrl(): string | undefined {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  return undefined
}

export const authOptions: NextAuthOptions = {
  // ضبط secret صراحةً (NextAuth يقرأه تلقائيًا، لكن نتأكد)
  secret: getAuthSecret(),
  // ضبط URL صراحةً (NextAuth يستعمل env تلقائيًا لكن نتأكد)
  ...(getAuthUrl() ? { url: getAuthUrl() } : {}),
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 }, // أسبوع
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'اسم المستخدم', type: 'text' },
        password: { label: 'كلمة المرور', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error('يرجى إدخال اسم المستخدم وكلمة المرور.')
        }
        const user = await db.user.findUnique({
          where: { username: credentials.username },
        })
        if (!user) {
          throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة.')
        }
        if (!user.active) {
          throw new Error('الحساب معطّل. تواصل مع المدير.')
        }
        const valid = await verifyPassword(credentials.password, user.password)
        if (!valid) {
          throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة.')
        }
        return {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role as Role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = (user as { username: string }).username
        token.name = user.name ?? ''
        token.role = (user as { role: Role }).role
      }
      return token
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        username: token.username,
        name: token.name ?? '',
        role: token.role,
      }
      return session
    },
  },
}
