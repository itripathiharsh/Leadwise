import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { in: ['admin@sentio.in', 'harsh@sentio.in'] } },
    select: { email: true, passwordHash: true },
  })

  for (const u of users) {
    console.log(`User: ${u.email}`)
    console.log(`  Hash starts with: ${u.passwordHash.substring(0, 7)}...`)
    const matchesSeed = process.env.SEED_PASSWORD
      ? await bcrypt.compare(process.env.SEED_PASSWORD, u.passwordHash)
      : false
    console.log(`  Matches process.env.SEED_PASSWORD: ${matchesSeed}`)
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
