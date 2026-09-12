import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { hashPassword, checkPasswordStrength } from '@/lib/auth/password'
import { normalizeEmail } from '@/lib/normalize'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { writeAuditSafe } from '@/server/services/audit'
import { notifyOwnersAndTLs } from '@/server/services/notifications'
import { Role, UserStatus, NotificationType, NotificationPriority } from '@prisma/client'

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(80),
  email: z.string().email('Invalid email address.').max(120),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(100),
  phone: z.string().max(25).optional().nullable(),
})

export async function POST(req: Request) {
  try {
    const limit = checkRateLimit(getClientIp(req))
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many signup attempts. Try again later.' }, { status: 429 })
    }

    const body = await req.json()
    const parsed = signupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid signup input.', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { name, email, password, phone } = parsed.data

    const strength = checkPasswordStrength(password)
    if (!strength.ok) {
      return NextResponse.json({ error: strength.message }, { status: 400 })
    }

    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    // Check existing accounts
    const existing = await prisma.user.findFirst({
      where: { email: normalizedEmail, deletedAt: null },
    })

    if (existing) {
      if (existing.status === UserStatus.PENDING) {
        return NextResponse.json(
          {
            error: 'An account with this email is already registered and awaiting review by Team Leadership.',
            status: 'PENDING',
          },
          { status: 400 },
        )
      }
      if (existing.status === UserStatus.REJECTED) {
        return NextResponse.json(
          {
            error: 'An account registration with this email was previously declined. Please contact Team Leadership.',
            status: 'REJECTED',
          },
          { status: 400 },
        )
      }
      return NextResponse.json(
        { error: 'An account with this corporate email already exists. Please sign in.' },
        { status: 400 },
      )
    }

    const passwordHash = await hashPassword(password)

    // User is created in PENDING state with isActive = false
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: Role.INTERN,
        status: UserStatus.PENDING,
        isActive: false,
        phone: phone?.trim() || null,
        avatarColor: 'indigo',
      },
    })

    // Notify leaders of pending onboarding request
    await notifyOwnersAndTLs({
      type: NotificationType.SYSTEM,
      priority: NotificationPriority.INFO,
      title: 'New User Signup Pending Review',
      message: `${newUser.name} (${newUser.email}) registered and is awaiting approval in Team Management.`,
      linkUrl: '/team',
      entityType: 'user',
      entityId: newUser.id,
    }).catch(() => {})

    // Write audit event
    await writeAuditSafe({
      userId: newUser.id,
      action: 'auth.signup_requested',
      entityType: 'user',
      entityId: newUser.id,
      entityLabel: newUser.name,
      summary: `${newUser.name} (${newUser.email}) submitted signup request (Status: PENDING)`,
    })

    return NextResponse.json({
      success: true,
      status: 'PENDING',
      message: 'Account registration submitted successfully. Your request is pending review by Team Leadership.',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
