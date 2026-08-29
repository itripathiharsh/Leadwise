import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { authenticate } from '@/server/services/auth'
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 },
      )
    }

    const outcome = await authenticate(email, password)

    if (!outcome.ok) {
      if (outcome.reason === 'INACTIVE') {
        return NextResponse.json(
          { error: 'This account has been deactivated. Please contact the Owner.' },
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
