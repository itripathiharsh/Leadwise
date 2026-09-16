import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'

const PRIMARY_DB_URL = process.env.DATABASE_URL!
const testUrlObj = new URL(process.env.DATABASE_URL!)
testUrlObj.pathname = '/atlas_crm_test_dr2'
const TEST_DB_URL = testUrlObj.toString()

async function run() {
  const seedPassword = process.env.SEED_PASSWORD
  if (!seedPassword) {
    throw new Error('SEED_PASSWORD must be set in environment.')
  }

  console.log('=================================================================')
  console.log('STARTING PASSWORD-RESET FALLBACK TEST ON BLANK TEST DATABASE')
  console.log(`Target Test DB: atlas_crm_test_dr2`)
  console.log('=================================================================\n')

  // 1. Get baseline users from Primary Database
  const primaryPrisma = new PrismaClient({ datasources: { db: { url: PRIMARY_DB_URL } } })
  const originalUsers = await primaryPrisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, isActive: true },
    orderBy: { createdAt: 'asc' },
  })
  const adminBaseline = originalUsers.find((u) => u.email === 'admin@sentio.in')!
  const harshBaseline = originalUsers.find((u) => u.email === 'harsh@sentio.in')!
  console.log(`Baseline users in primary DB: ${originalUsers.length}`)
  console.log(`  Admin original ID: ${adminBaseline.id}`)
  console.log(`  Harsh original ID: ${harshBaseline.id}`)

  // 2. Export full Excel backup buffer from Primary DB (WITHOUT credentials sidecar)
  console.log('\nStep 1: Exporting full Excel backup from primary DB (no sidecar)...')
  const { buildFullBackupWorkbook } = await import('../src/server/services/backup')
  const { workbook } = await buildFullBackupWorkbook()
  const backupBuffer = Buffer.from(await (workbook.xlsx as any).writeBuffer())
  console.log(`  Excel backup generated: ${backupBuffer.length} bytes`)
  await primaryPrisma.$disconnect()

  // 3. Reset and initialize blank test database atlas_crm_test_dr2
  console.log('\nStep 2: Resetting and initializing blank test database atlas_crm_test_dr2...')
  const adminDbClient = new PrismaClient({ datasources: { db: { url: PRIMARY_DB_URL } } })
  try {
    await adminDbClient.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'atlas_crm_test_dr2' AND pid <> pg_backend_pid();
    `)
    await adminDbClient.$executeRawUnsafe('DROP DATABASE IF EXISTS atlas_crm_test_dr2;')
    await adminDbClient.$executeRawUnsafe('CREATE DATABASE atlas_crm_test_dr2;')
  } finally {
    await adminDbClient.$disconnect()
  }

  // Apply complete schema DDL to blank DB
  console.log('Applying complete schema DDL to atlas_crm_test_dr2...')
  const fullSchemaSql = fs.readFileSync(
    path.join(__dirname, '..', 'prisma', 'full_schema.sql'),
    'utf8',
  )
  const testPrisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } })
  const statements = fullSchemaSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  for (const stmt of statements) {
    await testPrisma.$executeRawUnsafe(stmt)
  }
  console.log(`Executed ${statements.length} schema DDL statements in atlas_crm_test_dr2.`)

  // Confirm DB is blank before restore
  const preRestoreUsers = await testPrisma.user.count()
  if (preRestoreUsers !== 0) throw new Error('Test DB 2 is not blank before restore!')

  // 4. Restore workbook WITHOUT credentials.enc sidecar
  console.log('\nStep 3: Restoring Excel workbook WITHOUT credentials.enc sidecar...')
  const { executeSafeRestore } = await import('../src/server/services/restore')
  const restoreResult = await executeSafeRestore(null, backupBuffer, {
    mode: 'EXACT_OVERWRITE',
    preBackup: false,
    prismaClient: testPrisma,
    // NO credentialsBuffer or credentialsSecret passed!
  })

  console.log('Restore execution finished:', {
    success: restoreResult.success,
    restoredCounts: restoreResult.restored,
    restoredCredentials: restoreResult.restoredCredentials,
  })

  // 5. Verifications
  console.log('\n=================================================================')
  console.log('RUNNING PASSWORD-RESET FALLBACK VERIFICATIONS')
  console.log('=================================================================')

  // A. Check user counts and original IDs
  const restoredUsers = await testPrisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, isActive: true, passwordHash: true },
  })
  console.log(`\n[CHECK 1] Total users in restored DB: ${restoredUsers.length}`)
  if (restoredUsers.length !== originalUsers.length) {
    throw new Error(`User count mismatch! Expected ${originalUsers.length}, got ${restoredUsers.length}`)
  }
  const restoredAdmin = restoredUsers.find((u) => u.email === 'admin@sentio.in')!
  const restoredHarsh = restoredUsers.find((u) => u.email === 'harsh@sentio.in')!

  if (restoredAdmin.id !== adminBaseline.id) {
    throw new Error(`Admin ID not preserved! Expected ${adminBaseline.id}, got ${restoredAdmin.id}`)
  }
  if (restoredHarsh.id !== harshBaseline.id) {
    throw new Error(`Harsh ID not preserved! Expected ${harshBaseline.id}, got ${restoredHarsh.id}`)
  }
  console.log('  -> PASS: Original User IDs are preserved.')

  // B. Check secure temporary credentials (fallback hashes)
  console.log('\n[CHECK 2] Verifying users received secure temporary fallback hashes:')
  const adminMatchesOriginal = await bcrypt.compare(seedPassword, restoredAdmin.passwordHash)
  const harshMatchesOriginal = await bcrypt.compare(seedPassword, restoredHarsh.passwordHash)

  if (adminMatchesOriginal || harshMatchesOriginal) {
    throw new Error('Original passwords unexpectedly matched without credential sidecar!')
  }
  console.log('  -> Original password authentication rejected (safe fallback hash generated): PASS')
  console.log(`  -> Fallback hash format valid bcrypt: ${restoredAdmin.passwordHash.startsWith('$2')}`)

  // C. Confirm all relationships preserved
  console.log('\n[CHECK 3] Confirming relationships preserved in fallback restore:')
  const orgCount = await testPrisma.organisation.count()
  const contactCount = await testPrisma.contact.count()
  const activityCount = await testPrisma.activity.count()
  const followupCount = await testPrisma.followUp.count()
  const convoCount = await testPrisma.conversation.count()
  const msgCount = await testPrisma.message.count()
  const auditCount = await testPrisma.auditLog.count()

  console.log(`  -> Orgs: ${orgCount}, Contacts: ${contactCount}, Activities: ${activityCount}`)
  console.log(`  -> Follow-ups: ${followupCount}, Conversations: ${convoCount}, Messages: ${msgCount}, Audit: ${auditCount}`)
  if (orgCount !== 5 || contactCount !== 3 || activityCount !== 3 || followupCount !== 3 || convoCount !== 2 || msgCount !== 6) {
    throw new Error('Relational counts mismatch!')
  }
  console.log('  -> PASS: All entities and relationships preserved.')

  // D. Test Backup OWNER resetting Primary OWNER
  console.log('\n[CHECK 4] Testing Backup OWNER (Harsh) resetting Primary OWNER (Admin):')
  const { resetUserPasswordByOwner } = await import('../src/server/services/users')

  const harshCaller = {
    id: restoredHarsh.id,
    email: restoredHarsh.email,
    name: restoredHarsh.name,
    role: 'OWNER' as const,
    status: 'APPROVED' as const,
    phone: null,
    avatarColor: 'violet',
    isActive: true,
  }

  // Set a new strong password for Admin
  const newAdminPassword = 'Atlas#Owner2026!Reset'
  const resetResult = await resetUserPasswordByOwner(
    harshCaller,
    restoredAdmin.id,
    newAdminPassword,
    testPrisma,
  )
  console.log('  -> Reset call result:', resetResult)
  if (!resetResult.success) {
    throw new Error('Password reset by Backup OWNER failed!')
  }

  // Verify Admin can now authenticate with the newly set password
  const updatedAdmin = await testPrisma.user.findUnique({
    where: { id: restoredAdmin.id },
    select: { id: true, email: true, passwordHash: true },
  })
  if (!updatedAdmin) throw new Error('Admin not found after reset!')

  const newPassMatches = await bcrypt.compare(newAdminPassword, updatedAdmin.passwordHash)
  if (!newPassMatches) {
    throw new Error('Admin new password does not match passwordHash!')
  }
  console.log('  -> Admin authentication with newly reset password: SUCCESS!')

  // E. Verify Audit Log created for password reset and no passwords exposed
  console.log('\n[CHECK 5] Checking Audit Log for password reset action:')
  const resetAudit = await testPrisma.auditLog.findFirst({
    where: {
      action: 'user.password_reset',
      entityId: restoredAdmin.id,
    },
    orderBy: { createdAt: 'desc' },
  })
  if (!resetAudit) {
    throw new Error('Audit log for user.password_reset was not found!')
  }
  console.log(`  -> Audit log found: ID=${resetAudit.id}, Action=${resetAudit.action}`)
  console.log(`  -> Summary: "${resetAudit.summary}"`)
  console.log(`  -> Caller userId matches Harsh: ${resetAudit.userId === restoredHarsh.id}`)

  // Verify no password appears anywhere in audit summary or payload
  const auditString = JSON.stringify(resetAudit)
  if (auditString.includes(newAdminPassword) || auditString.includes(seedPassword)) {
    throw new Error('CRITICAL SECURITY VIOLATION: Password leaked in Audit Log!')
  }
  console.log('  -> Zero passwords leaked in Audit Log: VERIFIED')

  // F. Verify no passwords in Excel backup
  console.log('\n[CHECK 6] Verifying zero passwords in Excel backup:')
  const userWs = workbook.getWorksheet('Users')
  if (userWs) {
    userWs.eachRow((row) => {
      row.eachCell((cell) => {
        const str = String(cell.value || '')
        if (str.includes(seedPassword) || str.startsWith('$2a$') || str.startsWith('$2b$')) {
          throw new Error('CRITICAL SECURITY VIOLATION: Password or hash leaked in Excel backup!')
        }
      })
    })
  }
  console.log('  -> Excel backup free of passwords and password hashes: VERIFIED')

  console.log('\n=================================================================')
  console.log('PASSWORD-RESET FALLBACK TEST COMPLETED SUCCESSFULLY!')
  console.log('=================================================================')

  await testPrisma.$disconnect()
}

run().catch((err) => {
  console.error('PASSWORD-RESET FALLBACK TEST FAILED:', err)
  process.exit(1)
})
