import { PrismaClient } from '@prisma/client'

/**
 * Prisma singleton.
 *
 * Next.js dev-server hot reloading re-evaluates modules on every change; without
 * caching the client on `globalThis` each reload would open a new connection
 * pool and eventually exhaust Postgres' connection limit.
 */

function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL
  if (!url) return undefined
  try {
    const parsed = new URL(url)
    // When connecting to Supabase Supavisor pooler (port 6543), strictly enforce
    // connection_limit=1 and pgbouncer=true in serverless to prevent exceeding
    // the 200 client connection limit.
    if (parsed.port === '6543' || url.includes('pooler.supabase.com')) {
      if (!parsed.searchParams.has('connection_limit')) {
        parsed.searchParams.set('connection_limit', '1')
      }
      if (!parsed.searchParams.has('pgbouncer')) {
        parsed.searchParams.set('pgbouncer', 'true')
      }
      if (!parsed.searchParams.has('pool_timeout')) {
        parsed.searchParams.set('pool_timeout', '20')
      }
      return parsed.toString()
    }
    return url
  } catch {
    return url
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const configuredUrl = getDatabaseUrl()

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: configuredUrl ? { db: { url: configuredUrl } } : undefined,
    log:
      process.env.NODE_ENV === 'development'
        ? [{ emit: 'stdout', level: 'error' }, { emit: 'stdout', level: 'warn' }]
        : [{ emit: 'stdout', level: 'error' }],
  })

// ALWAYS cache the client on globalThis in all environments (including production serverless)
// to avoid creating new connections on every request in warm containers!
globalForPrisma.prisma = prisma
