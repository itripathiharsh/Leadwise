import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { detectOrgFromEmail } from '@/server/services/enrichment'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  if (!email) {
    return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
  }

  const result = await detectOrgFromEmail(email)
  return NextResponse.json(result)
}
