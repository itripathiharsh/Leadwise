import { NextResponse } from 'next/server'
import { executeFullBackup } from '@/server/services/backup'
import { isCronAuthorized } from '@/lib/auth/cron-auth'

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await executeFullBackup('SCHEDULED')
    return NextResponse.json({
      success: result.status === 'SUCCESS' || result.status === 'PARTIAL_SUCCESS',
      status: result.status,
      fileName: result.fileName,
      driveUrl: result.driveUrl,
      recordId: result.recordId,
      errorMessage: result.errorMessage,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  return GET(req)
}
