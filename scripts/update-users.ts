import { PrismaClient, Role, UserStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 1. Remove Harsh
  const deleted = await prisma.user.deleteMany({
    where: { email: 'harsh@sentio.in' },
  })
  console.log(`Deleted harsh@sentio.in: ${deleted.count} record(s)`)

  // 2. Update/create admin@sentio.in with password sentio@2025
  const passwordHash = await bcrypt.hash('sentio@2025', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sentio.in' },
    update: {
      name: 'Admin',
      passwordHash,
      role: Role.OWNER,
      status: UserStatus.APPROVED,
      isActive: true,
    },
    create: {
      name: 'Admin',
      email: 'admin@sentio.in',
      passwordHash,
      role: Role.OWNER,
      status: UserStatus.APPROVED,
      avatarColor: 'violet',
      isActive: true,
    },
  })
  console.log(`Updated admin: ${admin.email} as ${admin.role}`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

