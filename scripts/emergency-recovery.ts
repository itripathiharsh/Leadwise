import { PrismaClient } from '@prisma/client'
import { hashPassword, checkPasswordStrength } from '../src/lib/auth/password'
import { normalizeEmail } from '../src/lib/normalize'

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  const actionArg = args.find((a) => a.startsWith('--action='))?.split('=')[1]
  const emailArg = args.find((a) => a.startsWith('--email='))?.split('=')[1]
  const passwordArg = args.find((a) => a.startsWith('--password='))?.split('=')[1]

  if (!actionArg || !emailArg) {
    console.log(`
Usage: npx tsx scripts/emergency-recovery.ts --action=<reset-password|reactivate|promote> --email=<email> [--password=<new-pass>]

Options:
  --action=reset-password   Reset password for the specified user
  --action=reactivate       Reactivate an inactive or disabled user
  --action=promote          Promote user to OWNER
  --email=<email>           Target user email
  --password=<password>     New password (required for reset-password)
`)
    process.exit(1)
  }

  const normalized = normalizeEmail(emailArg)
  if (!normalized) {
    console.error(`Error: Invalid email format: "${emailArg}"`)
    process.exit(1)
  }

  const user = await prisma.user.findFirst({
    where: { email: normalized, deletedAt: null },
  })

  if (!user) {
    console.error(`User with email "${emailArg}" not found in database.`)
    process.exit(1)
  }

  console.log(`Found user: ${user.name} (${user.id}), current role: ${user.role}, active: ${user.isActive}`)

  if (actionArg === 'reset-password') {
    if (!passwordArg) {
      console.error('Error: --password is required for reset-password action.')
      process.exit(1)
    }
    const check = checkPasswordStrength(passwordArg)
    if (!check.ok) {
      console.error(`Error: Password strength requirement failed: ${check.message}`)
      process.exit(1)
    }
    const passwordHash = await hashPassword(passwordArg)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, isActive: true, status: 'APPROVED' },
    })
    console.log(`Password reset successfully for ${user.name} (${user.email}). Account is active.`)
  } else if (actionArg === 'reactivate') {
    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: true, status: 'APPROVED' },
    })
    console.log(`Reactivated account for ${user.name} (${user.email}).`)
  } else if (actionArg === 'promote') {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'OWNER', isActive: true, status: 'APPROVED' },
    })
    console.log(`Promoted ${user.name} (${user.email}) to OWNER.`)
  } else {
    console.error(`Unknown action: ${actionArg}`)
    process.exit(1)
  }
}

main()
  .catch((err) => {
    console.error('Error in emergency recovery script:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
