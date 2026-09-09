import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { findOrganisationDuplicates } from '@/server/services/duplicates'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name') || ''
  const website = searchParams.get('website') || undefined

  if (!name.trim() || name.trim().length < 2) {
    return NextResponse.json({ duplicates: [] })
  }

  try {
    const duplicates = await findOrganisationDuplicates({
      name: name.trim(),
      website: website?.trim() || null,
    })
    return NextResponse.json({ duplicates })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg, duplicates: [] }, { status: 400 })
  }
}
