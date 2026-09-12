interface RateLimitEntry {
  count: number
  windowStart: number
}

const loginAttempts = new Map<string, RateLimitEntry>()
const MAX_ATTEMPTS = 60
const WINDOW_MS = 60_000 // 1 min
const MAX_MAP_SIZE = 5_000
let lastCleanup = Date.now()
const CLEANUP_INTERVAL_MS = 30_000 // Clean up stale entries every 30 seconds

function cleanupStaleEntries(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS && loginAttempts.size < MAX_MAP_SIZE) {
    return
  }
  lastCleanup = now

  for (const [key, entry] of loginAttempts.entries()) {
    if (now - entry.windowStart > WINDOW_MS) {
      loginAttempts.delete(key)
    }
  }

  // If still oversized under DDoS/high-churn, evict oldest entries
  if (loginAttempts.size > MAX_MAP_SIZE) {
    const keysToDelete = Array.from(loginAttempts.keys()).slice(0, Math.floor(MAX_MAP_SIZE / 2))
    for (const key of keysToDelete) {
      loginAttempts.delete(key)
    }
  }
}

export function checkRateLimit(
  identifier: string,
  maxAttempts = MAX_ATTEMPTS,
  windowMs = WINDOW_MS,
): { ok: boolean; remaining: number } {
  const now = Date.now()
  cleanupStaleEntries(now)

  const entry = loginAttempts.get(identifier)

  if (!entry || now - entry.windowStart > windowMs) {
    loginAttempts.set(identifier, { count: 1, windowStart: now })
    return { ok: true, remaining: maxAttempts - 1 }
  }

  entry.count++
  const remaining = Math.max(0, maxAttempts - entry.count)
  if (entry.count > maxAttempts) return { ok: false, remaining: 0 }
  return { ok: true, remaining }
}

export function getClientIp(req: Request): string {
  const xForwardedFor = req.headers.get('x-forwarded-for')
  if (xForwardedFor) {
    // Return first non-empty segment, sanitized
    const first = xForwardedFor.split(',')[0].trim()
    if (first) return first
  }
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}
