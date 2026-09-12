import { PrismaClient, Role, UserStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting clean production database setup...')

  // 1. Purge all existing data safely adhering to foreign key constraints
  await prisma.organisationTag.deleteMany()
  await prisma.contactTag.deleteMany()
  await prisma.tag.deleteMany()
  await prisma.template.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.apiKey.deleteMany()
  await prisma.webhookEndpoint.deleteMany()
  await prisma.savedView.deleteMany()
  await prisma.reportSchedule.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.notificationPreference.deleteMany()
  await prisma.backupRecord.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.followUp.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.organisation.deleteMany()
  await prisma.eodReport.deleteMany()
  await prisma.importBatch.deleteMany()
  await prisma.reassignmentRequest.deleteMany()
  await prisma.userTarget.deleteMany()
  await prisma.user.deleteMany()

  console.log('🧹 Purged all demo and mock CRM records.')

  // Securely hash initial administrative credentials from environment
  const seedPassword = process.env.SEED_PASSWORD || crypto.randomBytes(16).toString('hex')
  const passwordHash = await bcrypt.hash(seedPassword, 10)

  // 2. Create ONLY the two permanent administrative accounts
  const owner = await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@sentio.in',
      passwordHash,
      role: Role.OWNER,
      status: UserStatus.APPROVED,
      phone: null,
      avatarColor: 'violet',
      isActive: true,
    },
  })

  const tl = await prisma.user.create({
    data: {
      name: 'Harsh',
      email: 'harsh@sentio.in',
      passwordHash,
      role: Role.TL, // Team Lead
      status: UserStatus.APPROVED,
      phone: null,
      avatarColor: 'teal',
      isActive: true,
    },
  })

  console.log('✅ Created permanent administrative accounts:')
  console.log(`   - OWNER: admin@sentio.in`)
  console.log(`   - TL:    Harsh@sentio.in (Role: Team Lead)`)

  // 3. Initialize notification preferences for initial administrators
  for (const adminUser of [owner, tl]) {
    await prisma.notificationPreference.create({
      data: {
        userId: adminUser.id,
        followUpReminders: true,
        meetingReminders: true,
        assignmentNotifications: true,
        backupAlerts: true,
      },
    })

    await prisma.userTarget.create({
      data: {
        userId: adminUser.id,
        dailyOrganisations: 20,
        dailyCalls: 15,
        dailyEmails: 20,
        dailyLinkedin: 10,
        dailyMeetings: 2,
      },
    })
  }

  console.log('✨ Production database initialized cleanly with 0 mock CRM records.')
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
