import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { search } from '@/server/services/search'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const take = searchParams.get('take') ? parseInt(searchParams.get('take')!, 10) : 8

  const results = await search(user, q, { take })
  return NextResponse.json(results)
}
