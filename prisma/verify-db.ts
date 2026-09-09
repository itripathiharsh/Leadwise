import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const usersCount = await prisma.user.count()
  const orgsCount = await prisma.organisation.count()
  console.log(`Database verification SUCCESS: Found ${usersCount} users and ${orgsCount} organisations.`)
}

main()
  .catch((e) => {
    const sanitized = (e.message || String(e)).replace(/:[^:@/]+@/, ':****@')
    console.error(`Database check failed: ${sanitized}`)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
