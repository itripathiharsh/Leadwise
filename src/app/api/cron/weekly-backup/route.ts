import { NextResponse } from 'next/server'
import { executeFullBackup } from '@/server/services/backup'

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true // Allow in dev if not configured

  const authHeader = req.headers.get('authorization')
  const cronHeader = req.headers.get('x-cron-secret')

  if (authHeader === `Bearer ${secret}` || cronHeader === secret) {
    return true
  }

  return false
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
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
