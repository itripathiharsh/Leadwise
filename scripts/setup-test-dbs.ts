import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.$executeRawUnsafe('DROP DATABASE IF EXISTS atlas_crm_test_dr1;')
    await prisma.$executeRawUnsafe('CREATE DATABASE atlas_crm_test_dr1;')
    console.log('Successfully created database atlas_crm_test_dr1')

    await prisma.$executeRawUnsafe('DROP DATABASE IF EXISTS atlas_crm_test_dr2;')
    await prisma.$executeRawUnsafe('CREATE DATABASE atlas_crm_test_dr2;')
    console.log('Successfully created database atlas_crm_test_dr2')
  } catch (err) {
    console.error('Error creating test databases:', err)
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
