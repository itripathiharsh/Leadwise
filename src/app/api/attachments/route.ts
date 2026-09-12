import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { prisma } from '@/lib/db'
import { canReadOrganisation, canWriteOrganisation } from '@/lib/rbac'

const BLOCKED_EXTENSIONS = ['exe', 'bat', 'cmd', 'sh', 'php', 'js', 'html', 'htm', 'vbs', 'scr']

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const organisationId = searchParams.get('organisationId')
  const attachmentId = searchParams.get('attachmentId')

  // Direct attachment download
  if (attachmentId) {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        organisation: { select: { id: true, assignedToId: true, createdById: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
    })
    if (!attachment) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    if (!canReadOrganisation(user, attachment.organisation)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ attachment })
  }

  if (!organisationId) {
    return NextResponse.json({ error: 'organisationId is required' }, { status: 400 })
  }

  const org = await prisma.organisation.findFirst({
    where: { id: organisationId, deletedAt: null },
    select: { id: true, assignedToId: true, createdById: true },
  })
  if (!org) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
  if (!canReadOrganisation(user, org)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Omit contentBase64 from list view to prevent memory exhaustion
  const attachments = await prisma.attachment.findMany({
    where: { organisationId },
    select: {
      id: true,
      filename: true,
      fileSize: true,
      mimeType: true,
      createdAt: true,
      uploadedById: true,
      uploadedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ attachments })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const organisationId = formData.get('organisationId') as string | null

    if (!file || !organisationId) {
      return NextResponse.json({ error: 'file and organisationId are required' }, { status: 400 })
    }

    const org = await prisma.organisation.findFirst({
      where: { id: organisationId, deletedAt: null },
      select: { id: true, assignedToId: true, createdById: true },
    })
    if (!org) return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    if (!canWriteOrganisation(user, org)) {
      return NextResponse.json({ error: 'You do not have permission to upload files for this organisation' }, { status: 403 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: 'File type is not permitted for upload' }, { status: 400 })
    }

    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be under 4MB for zero-cost storage' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const record = await prisma.attachment.create({
      data: {
        organisationId,
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        contentBase64: base64,
        uploadedById: user.id,
      },
      select: {
        id: true,
        filename: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
        uploadedById: true,
      },
    })

    return NextResponse.json({ success: true, attachment: record })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Attachment ID is required' }, { status: 400 })

  const attachment = await prisma.attachment.findUnique({
    where: { id },
    include: { organisation: { select: { id: true, assignedToId: true, createdById: true } } },
  })
  if (!attachment) return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })

  if (!canWriteOrganisation(user, attachment.organisation)) {
    return NextResponse.json({ error: 'You do not have permission to delete this attachment' }, { status: 403 })
  }

  await prisma.attachment.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

