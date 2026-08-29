import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized cron trigger' }, { status: 401 })
  }

  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sun, 1 = Mon, 5 = Fri
  const isFirstOfMonth = today.getDate() === 1

  let weeklyGenerated = false
  let monthlyGenerated = false

  // Weekly check (on Friday or trigger)
  if (dayOfWeek === 5) {
    await prisma.reportSchedule.upsert({
      where: { type: 'WEEKLY' },
      create: { type: 'WEEKLY', lastRunAt: today },
      update: { lastRunAt: today },
    })
    weeklyGenerated = true
  }

  // Monthly check (on 1st of month)
  if (isFirstOfMonth) {
    await prisma.reportSchedule.upsert({
      where: { type: 'MONTHLY' },
      create: { type: 'MONTHLY', lastRunAt: today },
      update: { lastRunAt: today },
    })
    monthlyGenerated = true
  }

  return NextResponse.json({
    success: true,
    timestamp: today.toISOString(),
    weeklyGenerated,
    monthlyGenerated,
  })
}
