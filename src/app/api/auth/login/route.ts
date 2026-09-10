import { loginSchema } from '@/lib/validation'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { checkRateLimit } from "@/lib/rate-limit"
import { authenticate } from '@/server/services/auth'
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session'

export async function POST(req: Request) {
  try {
    const limit = checkRateLimit(req.headers.get("x-forwarded-for") || req.url || "unknown")
    if (!limit.ok) return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 })
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 })
    }
    const { email, password } = parsed.data

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 },
      )
    }

    const outcome = await authenticate(email, password)

    if (!outcome.ok) {
      if (outcome.reason === 'PENDING') {
        return NextResponse.json(
          {
            error: 'Your account registration is pending review by Team Leadership. Access will be granted once approved.',
            status: 'PENDING',
          },
          { status: 403 },
        )
      }
      if (outcome.reason === 'REJECTED') {
        return NextResponse.json(
          {
            error: 'Your account registration was not approved. Please contact Team Leadership.',
            status: 'REJECTED',
          },
          { status: 403 },
        )
      }
      if (outcome.reason === 'DISCONTINUED') {
        return NextResponse.json(
          {
            error: 'This account has been discontinued. Please contact your Team Lead or Owner for assistance.',
            status: 'DISCONTINUED',
          },
          { status: 403 },
        )
      }
      if (outcome.reason === 'INACTIVE') {
        return NextResponse.json(
          { error: 'This account has been deactivated. Please contact Team Leadership.' },
          { status: 403 },
        )
      }
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 },
      )
    }

    const token = await createSessionToken(outcome.session)
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions())

    return NextResponse.json({
      success: true,
      user: outcome.session,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
