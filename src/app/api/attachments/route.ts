import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const organisationId = searchParams.get('organisationId')
  if (!organisationId) {
    return NextResponse.json({ error: 'organisationId is required' }, { status: 400 })
  }

  const attachments = await prisma.attachment.findMany({
    where: { organisationId },
    include: { uploadedBy: { select: { id: true, name: true } } },
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
    })

    return NextResponse.json({ success: true, attachment: record })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
