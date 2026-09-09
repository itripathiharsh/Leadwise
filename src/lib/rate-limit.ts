const loginAttempts = new Map<string, { count: number; windowStart: number }>()
const MAX_ATTEMPTS = 60
const WINDOW_MS = 60_000 // 1 min

export function checkRateLimit(identifier: string): { ok: boolean; remaining: number } {
  const now = Date.now()
  const entry = loginAttempts.get(identifier)

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    loginAttempts.set(identifier, { count: 1, windowStart: now })
    return { ok: true, remaining: MAX_ATTEMPTS - 1 }
  }

  entry.count++
  const remaining = Math.max(0, MAX_ATTEMPTS - entry.count)
  if (entry.count > MAX_ATTEMPTS) return { ok: false, remaining: 0 }
  return { ok: true, remaining }
}
