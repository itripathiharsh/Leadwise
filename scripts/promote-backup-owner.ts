import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Promoting selected TL (Harsh) to Backup OWNER...')

  const targetEmail = 'harsh@sentio.in'
  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
    include: {
      _count: {
        select: {
          organisationsAssigned: true,
          activities: true,
          followUpsAssigned: true,
          auditLogs: true,
        },
      },
    },
  })

  if (!user) {
    console.error(`User with email "${targetEmail}" not found in database.`)
    process.exit(1)
  }

  console.log(`Found user: ${user.name} (${user.id}), current role: ${user.role}`)
  console.log(`Existing relations count:`, user._count)

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      role: 'OWNER',
      status: 'APPROVED',
      isActive: true,
    },
  })

  // Record audit log for promotion
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'user.role_changed',
      entityType: 'user',
      entityId: user.id,
      entityLabel: user.name,
      summary: `Promoted ${user.name} (${user.email}) to Backup OWNER. Preserved original ID and all existing records.`,
      before: { role: user.role, status: user.status },
      after: { role: 'OWNER', status: 'APPROVED' },
    },
  })

  // Verify total active owners
  const activeOwners = await prisma.user.findMany({
    where: { role: 'OWNER', isActive: true, deletedAt: null },
    select: { id: true, name: true, email: true, role: true },
  })

  console.log('Promotion complete!')
  console.log('Active OWNERs in CRM:', activeOwners)

  if (activeOwners.length < 2) {
    throw new Error('Expected at least 2 active OWNER accounts!')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
