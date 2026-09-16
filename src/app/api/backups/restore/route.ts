import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { assertCan } from '@/lib/rbac'
import { validateAndPreviewRestore, executeSafeRestore } from '@/server/services/restore'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Strict OWNER authorization for restore operations
  if (user.role !== 'OWNER') {
    return NextResponse.json(
      { error: 'Forbidden: Database restoration is strictly restricted to OWNER.' },
      { status: 403 },
    )
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const action = (formData.get('action') as string) || 'preview'
    const modeRaw = (formData.get('mode') as string) || 'missing_only'
    const preBackupRaw = formData.get('preBackup') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No Excel backup file uploaded' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (action === 'preview') {
      const preview = await validateAndPreviewRestore(buffer)
      return NextResponse.json({ preview })
    }

    const mode = modeRaw === 'exact_overwrite' ? 'EXACT_OVERWRITE' : 'MISSING_ONLY'
    const preBackup = preBackupRaw !== 'false'

    const credentialsFile = formData.get('credentialsFile') as File | null
    const credentialsSecret = (formData.get('credentialsSecret') as string | null) || undefined

    let credentialsBuffer: Buffer | undefined
    if (credentialsFile) {
      const credArrayBuf = await credentialsFile.arrayBuffer()
      credentialsBuffer = Buffer.from(credArrayBuf)
    }

    const result = await executeSafeRestore(user, buffer, {
      mode,
      preBackup,
      credentialsBuffer,
      credentialsSecret,
    })
    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
