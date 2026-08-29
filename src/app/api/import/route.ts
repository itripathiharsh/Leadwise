import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { stageImport, commitImport, listImportBatches } from '@/server/services/import'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const batches = await listImportBatches(user)
  return NextResponse.json({ batches })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const contentType = req.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File | null
      if (!file) {
        return NextResponse.json({ error: 'No Excel file provided.' }, { status: 400 })
      }

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const result = await stageImport(user, { name: file.name, buffer })
      return NextResponse.json(result)
    }

    // JSON commit
    const body = await req.json()
    const result = await commitImport(user, body)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
