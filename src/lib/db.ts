import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * تهيئة Prisma Client بشكل آمن:
 * - لا يتم الإنشاء عند تحميل الوحدة (هذا يسبب ERR_INVALID_URL في Vercel build)
 * - يتم الإنشاء عند أول استدعاء فقط
 * - يُعاد استخدام نفس الـ instance في الـ dev mode
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })
}

// استخدام Proxy لتفادي إنشاء PrismaClient عند تحميل الوحدة
// هذا يحل مشكلة ERR_INVALID_URL في Vercel build
export const db = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient()
    }
    return Reflect.get(globalForPrisma.prisma, prop)
  },
}) as PrismaClient
