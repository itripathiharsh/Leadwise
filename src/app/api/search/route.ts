import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { search } from '@/server/services/search'
import { positiveIntSchema } from '@/lib/validation'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') || ''
  const takeParsed = positiveIntSchema.safeParse(searchParams.get('take') ?? undefined)
  const take = takeParsed.success ? Math.min(takeParsed.data, 50) : 8

  const results = await search(user, q, { take })
  return NextResponse.json(results)
}
