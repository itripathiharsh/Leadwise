import { z } from 'zod'
import { NextResponse } from 'next/server'
import { verifyApiKey } from '@/server/services/api-keys'
import { getCurrentUser } from '@/lib/auth/current-user'
import { prisma } from '@/lib/db'
import { normalizeOrgName, normalizeDomain, normalizeEmail, normalizePhone } from '@/lib/normalize'
import { detectDecisionMakerConfidence } from '@/server/services/ai/intelligence'

async function resolveUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawKey = authHeader.slice(7).trim()
    const user = await verifyApiKey(rawKey)
    if (user) return user
  }
  return getCurrentUser()
}

const extensionCaptureSchema = z.object({
  organisationName: z.string().min(1, 'organisationName is required').max(200),
  website: z.string().max(300).optional().nullable(),
  contactName: z.string().min(1, 'contactName is required').max(200),
  designation: z.string().max(200).optional().nullable(),
  linkedinUrl: z.string().max(500).optional().nullable(),
  email: z.string().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
})

export async function POST(req: Request) {
  const user = await resolveUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const rawBody = await req.json()
    const parsed = extensionCaptureSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.format() }, { status: 400 })
    }
    const { organisationName, website, contactName, designation, linkedinUrl, email, phone } = parsed.data

    const orgNorm = normalizeOrgName(organisationName)
    const domainNorm = website ? normalizeDomain(website) : null

    // Find or create organisation
    let org = await prisma.organisation.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { nameNormalized: orgNorm },
          ...(domainNorm ? [{ domain: domainNorm }] : []),
        ],
      },
    })

    if (!org) {
      org = await prisma.organisation.create({
        data: {
          name: organisationName.trim(),
          nameNormalized: orgNorm,
          website: website || null,
          domain: domainNorm,
          createdById: user.id,
          assignedToId: user.id,
          status: 'NEW',
          priority: 'MEDIUM',
        },
      })
    }

    // Create or update contact
    const dmConfidence = detectDecisionMakerConfidence(designation || null)
    const isDm = dmConfidence >= 80

    const contact = await prisma.contact.create({
      data: {
        organisationId: org.id,
        name: contactName.trim(),
        nameNormalized: normalizeOrgName(contactName),
        designation: designation || null,
        linkedinUrl: linkedinUrl || null,
        email: email || null,
        emailNormalized: email ? normalizeEmail(email) : null,
        phone: phone || null,
        phoneNormalized: phone ? normalizePhone(phone) : null,
        isDecisionMaker: isDm,
        aiDmConfidence: dmConfidence,
        createdById: user.id,
        assignedToId: user.id,
        leadSource: 'LinkedIn Extension',
      },
    })

    return NextResponse.json({
      success: true,
      organisation: org,
      contact,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
