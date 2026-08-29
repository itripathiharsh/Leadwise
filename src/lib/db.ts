import { PrismaClient } from '@prisma/client'

/**
 * Prisma singleton.
 *
 * Next.js dev-server hot reloading re-evaluates modules on every change; without
 * caching the client on `globalThis` each reload would open a new connection
 * pool and eventually exhaust Postgres' connection limit.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [{ emit: 'stdout', level: 'error' }, { emit: 'stdout', level: 'warn' }]
        : [{ emit: 'stdout', level: 'error' }],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
