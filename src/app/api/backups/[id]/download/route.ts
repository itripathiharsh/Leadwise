import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { assertCan } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { buildFullBackupWorkbook } from '@/server/services/backup'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  assertCan(user, 'backup:manage')

  const { id } = await params
  const record = await prisma.backupRecord.findUnique({
    where: { id },
  })

  if (!record) {
    return NextResponse.json({ error: 'Backup record not found' }, { status: 404 })
  }

  const { workbook } = await buildFullBackupWorkbook()
  const arrayBuffer = await workbook.xlsx.writeBuffer()
  const buffer = Buffer.from(arrayBuffer)

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${record.fileName}"`,
      'Content-Length': buffer.length.toString(),
    },
  })
}
