import { PrismaClient, Role, UserStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const usersToCreate = [
    {
      name: 'Dev',
      email: 'dev@sentio.in',
      password: 'dev@123',
      role: Role.TL,
      avatarColor: 'teal',
    },
    {
      name: 'Bhumika',
      email: 'bhumika@sentio.in',
      password: 'bhumika@123',
      role: Role.INTERN,
      avatarColor: 'amber',
    },
    {
      name: 'Sandriya',
      email: 'sandriya@sentio.in',
      password: 'sandriya@123',
      role: Role.INTERN,
      avatarColor: 'rose',
    },
  ]

  for (const user of usersToCreate) {
    const passwordHash = await bcrypt.hash(user.password, 10)
    const result = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash,
        role: user.role,
        status: UserStatus.APPROVED,
        isActive: true,
      },
      create: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
        status: UserStatus.APPROVED,
        avatarColor: user.avatarColor,
        isActive: true,
      },
    })
    console.log(`✅ Upserted ${result.email} (${result.name}) as ${result.role}`)
  }
}

main()
  .catch((e) => {
    console.error('❌ Failed to add users:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

