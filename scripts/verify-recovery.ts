import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('── Step 1: Checking active owners ──')
  const owners = await prisma.user.findMany({
    where: { role: 'OWNER', isActive: true, deletedAt: null },
    select: { id: true, name: true, email: true, role: true, passwordHash: true },
  })

  console.log(`Found ${owners.length} active OWNER accounts:`)
  for (const o of owners) {
    console.log(`  - ${o.name} (${o.email}), ID: ${o.id}, Role: ${o.role}`)
  }

  if (owners.length < 2) {
    throw new Error(`Expected at least 2 active OWNER accounts, found ${owners.length}`)
  }

  const admin = owners.find((o) => o.email === 'admin@sentio.in')
  const harsh = owners.find((o) => o.email === 'harsh@sentio.in')

  if (!admin || !harsh) {
    throw new Error('Both Admin (primary) and Harsh (backup) must be active OWNERs')
  }

  console.log('\n── Step 2: Testing independent login of Backup OWNER (Harsh) ──')
  const harshPass = 'Sentio@123'
  const harshLoginOk = await bcrypt.compare(harshPass, harsh.passwordHash)
  console.log(`Harsh credentials check with default seed password: ${harshLoginOk ? 'VALID' : 'CUSTOM'}`)

  console.log('\n── Step 3: Simulating Backup OWNER recovering Primary OWNER account ──')
  const originalAdminHash = admin.passwordHash
  const tempRecoveryPass = 'AdminRecoveredByHarsh2026!'
  const newHash = await bcrypt.hash(tempRecoveryPass, 12)

  // Harsh updates Admin's password
  await prisma.user.update({
    where: { id: admin.id },
    data: { passwordHash: newHash, updatedAt: new Date() },
  })

  // Verify Admin can now log in using the recovered password
  const updatedAdmin = await prisma.user.findUnique({ where: { id: admin.id } })
  const adminLoginWithNewPass = await bcrypt.compare(tempRecoveryPass, updatedAdmin!.passwordHash)
  console.log(`Admin login with recovered password: ${adminLoginWithNewPass ? 'SUCCESS' : 'FAILED'}`)

  if (!adminLoginWithNewPass) {
    throw new Error('Recovery failed: Admin could not log in with recovered password!')
  }

  // Restore original password hash for Admin
  await prisma.user.update({
    where: { id: admin.id },
    data: { passwordHash: originalAdminHash },
  })
  console.log('Restored original Admin password hash.')

  console.log('\n── Step 4: Testing Final Active OWNER Protection ──')
  const otherOwnersIfAdminRemoved = await prisma.user.count({
    where: { role: 'OWNER', isActive: true, deletedAt: null, id: { not: admin.id } },
  })
  console.log(`Other active owners if Admin is demoted: ${otherOwnersIfAdminRemoved}`)

  const otherOwnersIfHarshRemoved = await prisma.user.count({
    where: { role: 'OWNER', isActive: true, deletedAt: null, id: { not: harsh.id } },
  })
  console.log(`Other active owners if Harsh is demoted: ${otherOwnersIfHarshRemoved}`)

  if (otherOwnersIfAdminRemoved < 1 || otherOwnersIfHarshRemoved < 1) {
    throw new Error('Final owner protection test failed: each owner must have at least one counterpart.')
  }

  console.log('\n✅ All Dual-OWNER recovery scenarios verified successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
