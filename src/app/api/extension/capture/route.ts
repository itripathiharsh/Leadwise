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

export async function POST(req: Request) {
  const user = await resolveUser(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { organisationName, website, contactName, designation, linkedinUrl, email, phone } = body

    if (!organisationName || !contactName) {
      return NextResponse.json({ error: 'organisationName and contactName are required' }, { status: 400 })
    }

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
