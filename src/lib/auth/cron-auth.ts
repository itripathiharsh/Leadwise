/**
 * Centralized authorization helper for scheduled/cron API routes.
 * Fails closed if CRON_SECRET is missing or invalid.
 */
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.warn('[SECURITY] CRON_SECRET is not configured. Rejecting request.')
    return false
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  const cronHeader = req.headers.get('x-cron-secret')

  if (authHeader === `Bearer ${secret}` || cronHeader === secret) {
    return true
  }

  return false
}
