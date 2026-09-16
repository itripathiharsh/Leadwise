import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { env } from '@/lib/env'
import { normalizeEmail } from '@/lib/normalize'
import { checkPasswordStrength, hashPassword } from '@/lib/auth/password'
import { writeAuditSafe } from '@/server/services/audit'

const emergencyRecoverySchema = z.object({
  recoverySecret: z.string().min(1, 'Recovery secret is required'),
  action: z.enum(['RESET_PASSWORD', 'REACTIVATE', 'PROMOTE']),
  targetEmail: z.string().email('Valid target email is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(100).optional(),
})

export async function POST(req: Request) {
  try {
    const configuredSecret = env.ownerRecoverySecret
    if (!configuredSecret || configuredSecret.length < 16) {
      return NextResponse.json(
        { error: 'Emergency recovery is disabled (OWNER_RECOVERY_SECRET is not configured on the server).' },
        { status: 503 },
      )
    }

    const rawBody = await req.json()
    const parsed = emergencyRecoverySchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid recovery request', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { recoverySecret, action, targetEmail, newPassword } = parsed.data

    // Constant-time secret comparison to prevent timing attacks
    const expectedBuf = Buffer.from(configuredSecret, 'utf8')
    const receivedBuf = Buffer.from(recoverySecret, 'utf8')

    if (
      expectedBuf.length !== receivedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, receivedBuf)
    ) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid recovery secret.' },
        { status: 401 },
      )
    }

    const normalizedEmail = normalizeEmail(targetEmail)
    if (!normalizedEmail) {
      return NextResponse.json(
        { error: 'Invalid target email address.' },
        { status: 400 },
      )
    }

    const targetUser = await prisma.user.findFirst({
      where: { email: normalizedEmail, deletedAt: null },
      select: { id: true, name: true, email: true, role: true, isActive: true, status: true },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: `User with email "${targetEmail}" not found.` },
        { status: 404 },
      )
    }

    if (action === 'RESET_PASSWORD') {
      if (!newPassword) {
        return NextResponse.json(
          { error: 'newPassword is required for RESET_PASSWORD action.' },
          { status: 400 },
        )
      }

      const strength = checkPasswordStrength(newPassword)
      if (!strength.ok) {
        return NextResponse.json(
          { error: strength.message || 'Password does not meet complexity requirements.' },
          { status: 400 },
        )
      }

      const passwordHash = await hashPassword(newPassword)
      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          passwordHash,
          isActive: true,
          status: 'APPROVED',
          updatedAt: new Date(),
        },
      })

      await writeAuditSafe({
        userId: targetUser.id,
        action: 'auth.emergency_recovery',
        entityType: 'user',
        entityId: targetUser.id,
        entityLabel: targetUser.name,
        summary: `Emergency server recovery: credentials reset and account reactivated for ${targetUser.email}`,
      })

      return NextResponse.json({
        success: true,
        message: `Emergency recovery: Password reset successfully for ${targetUser.email}.`,
      })
    }

    if (action === 'REACTIVATE') {
      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          isActive: true,
          status: 'APPROVED',
          updatedAt: new Date(),
        },
      })

      await writeAuditSafe({
        userId: targetUser.id,
        action: 'auth.emergency_recovery',
        entityType: 'user',
        entityId: targetUser.id,
        entityLabel: targetUser.name,
        summary: `Emergency server recovery: reactivated account for ${targetUser.email}`,
      })

      return NextResponse.json({
        success: true,
        message: `Emergency recovery: Reactivated account for ${targetUser.email}.`,
      })
    }

    if (action === 'PROMOTE') {
      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          role: 'OWNER',
          isActive: true,
          status: 'APPROVED',
          updatedAt: new Date(),
        },
      })

      await writeAuditSafe({
        userId: targetUser.id,
        action: 'auth.emergency_recovery',
        entityType: 'user',
        entityId: targetUser.id,
        entityLabel: targetUser.name,
        summary: `Emergency server recovery: promoted ${targetUser.email} to OWNER`,
      })

      return NextResponse.json({
        success: true,
        message: `Emergency recovery: Promoted ${targetUser.email} to OWNER.`,
      })
    }

    return NextResponse.json({ error: `Unsupported recovery action: ${action}` }, { status: 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
