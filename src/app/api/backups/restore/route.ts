import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { assertCan } from '@/lib/rbac'
import { validateAndPreviewRestore, executeSafeRestore } from '@/server/services/restore'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  assertCan(user, 'backup:manage')

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const action = (formData.get('action') as string) || 'preview'

    if (!file) {
      return NextResponse.json({ error: 'No Excel backup file uploaded' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (action === 'preview') {
      const preview = await validateAndPreviewRestore(buffer)
      return NextResponse.json({ preview })
    }

    const result = await executeSafeRestore(user, buffer)
    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
