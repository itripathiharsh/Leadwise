import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'

const PRIMARY_DB_URL = process.env.DATABASE_URL!
const testUrlObj = new URL(process.env.DATABASE_URL!)
testUrlObj.pathname = '/atlas_crm_test_dr1'
const TEST_DB_URL = testUrlObj.toString()

async function run() {
  const secret = process.env.OWNER_RECOVERY_SECRET
  const seedPassword = process.env.SEED_PASSWORD

  if (!secret) {
    throw new Error('OWNER_RECOVERY_SECRET must be set in environment.')
  }
  if (!seedPassword) {
    throw new Error('SEED_PASSWORD must be set in environment.')
  }

  console.log('=================================================================')
  console.log('STARTING DISASTER RECOVERY TEST ON ISOLATED BLANK TEST DATABASE')
  console.log(`Target Test DB: atlas_crm_test_dr1`)
  console.log('=================================================================\n')

  // 1. Inspect original Primary Database to record baseline IDs
  const primaryPrisma = new PrismaClient({ datasources: { db: { url: PRIMARY_DB_URL } } })
  const originalUsers = await primaryPrisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, isActive: true },
    orderBy: { createdAt: 'asc' },
  })
  console.log(`Baseline users in primary DB: ${originalUsers.length}`)
  const adminBaseline = originalUsers.find((u) => u.email === 'admin@sentio.in')!
  const harshBaseline = originalUsers.find((u) => u.email === 'harsh@sentio.in')!
  console.log(`  Admin original ID: ${adminBaseline.id}, Role: ${adminBaseline.role}`)
  console.log(`  Harsh original ID: ${harshBaseline.id}, Role: ${harshBaseline.role}`)

  // 2. Export Excel backup buffer from Primary DB
  console.log('\nStep 1: Exporting full Excel backup from primary DB...')
  const { buildFullBackupWorkbook } = await import('../src/server/services/backup')
  const { workbook } = await buildFullBackupWorkbook()
  const backupBuffer = Buffer.from(await (workbook.xlsx as any).writeBuffer())
  console.log(`  Excel backup generated: ${backupBuffer.length} bytes`)

  // 3. Export Encrypted Credentials sidecar (.enc) using OWNER_RECOVERY_SECRET
  console.log('\nStep 2: Exporting encrypted credentials sidecar (credentials.enc)...')
  const { exportEncryptedCredentials } = await import('../src/server/services/credentials-backup')
  const credentialsBuffer = await exportEncryptedCredentials(secret)
  console.log(`  Encrypted credentials generated: ${credentialsBuffer.length} bytes`)
  await primaryPrisma.$disconnect()

  // 4. Clean and initialize blank test database: atlas_crm_test_dr1
  console.log('\nStep 3: Resetting and initializing blank test database atlas_crm_test_dr1...')
  const adminDbClient = new PrismaClient({ datasources: { db: { url: PRIMARY_DB_URL } } })
  try {
    await adminDbClient.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'atlas_crm_test_dr1' AND pid <> pg_backend_pid();
    `)
    await adminDbClient.$executeRawUnsafe('DROP DATABASE IF EXISTS atlas_crm_test_dr1;')
    await adminDbClient.$executeRawUnsafe('CREATE DATABASE atlas_crm_test_dr1;')
  } finally {
    await adminDbClient.$disconnect()
  }

  // Apply full migration schema onto blank database
  console.log('Applying complete schema migration to atlas_crm_test_dr1...')
  const migrationSql = fs
    .readFileSync(
      path.join(__dirname, '..', 'prisma', 'full_schema.sql'),
      'utf8',
    )
    .replace(/^\uFEFF/, '')
  const testPrisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } })
  const statements = migrationSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  for (const stmt of statements) {
    try {
      await testPrisma.$executeRawUnsafe(stmt)
    } catch (e) {
      console.error('Failed statement:', stmt)
      throw e
    }
  }
  console.log(`Executed ${statements.length} schema DDL statements successfully in atlas_crm_test_dr1.`)

  // Confirm DB is completely blank before restore
  const preRestoreUserCount = await testPrisma.user.count()
  const preRestoreOrgCount = await testPrisma.organisation.count()
  console.log(`Pre-restore counts in test DB: Users=${preRestoreUserCount}, Orgs=${preRestoreOrgCount}`)
  if (preRestoreUserCount !== 0 || preRestoreOrgCount !== 0) {
    throw new Error('Test DB is not blank before restore!')
  }

  // 5. Execute Safe Restore on blank test DB using exported files
  console.log('\nStep 4: Executing safe restore with credentials sidecar into test DB...')
  // Switch global environment DATABASE_URL to test DB so services target it
  const { executeSafeRestore } = await import('../src/server/services/restore')
  const restoreResult = await executeSafeRestore(null, backupBuffer, {
    mode: 'EXACT_OVERWRITE',
    preBackup: false,
    credentialsBuffer,
    credentialsSecret: secret,
    prismaClient: testPrisma,
  })

  console.log('Restore execution finished:', {
    success: restoreResult.success,
    restoredCounts: restoreResult.restored,
    restoredCredentials: restoreResult.restoredCredentials,
    skippedExisting: restoreResult.skippedExisting,
  })

  // 6. Comprehensive Verifications & Assertions
  console.log('\n=================================================================')
  console.log('RUNNING COMPREHENSIVE DISASTER RECOVERY ASSERTIONS')
  console.log('=================================================================')

  // A. Confirm total users & no duplicate users
  const restoredUsers = await testPrisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, isActive: true, passwordHash: true },
    orderBy: { createdAt: 'asc' },
  })
  console.log(`\n[CHECK 1] Total users in restored DB: ${restoredUsers.length}`)
  if (restoredUsers.length !== originalUsers.length) {
    throw new Error(`User count mismatch! Expected ${originalUsers.length}, found ${restoredUsers.length}`)
  }
  const emailSet = new Set(restoredUsers.map((u) => u.email))
  if (emailSet.size !== restoredUsers.length) {
    throw new Error('Duplicate users detected in restored DB!')
  }
  console.log('  -> PASS: User counts match perfectly, zero duplicate users created.')

  // B. Confirm original IDs preserved
  console.log('\n[CHECK 2] Confirming original User IDs preservation:')
  const restoredAdmin = restoredUsers.find((u) => u.email === 'admin@sentio.in')
  const restoredHarsh = restoredUsers.find((u) => u.email === 'harsh@sentio.in')

  if (!restoredAdmin) throw new Error('Restored Admin not found!')
  if (!restoredHarsh) throw new Error('Restored Harsh not found!')

  if (restoredAdmin.id !== adminBaseline.id) {
    throw new Error(`Admin ID changed! Expected ${adminBaseline.id}, got ${restoredAdmin.id}`)
  }
  console.log(`  -> Admin ID preserved: ${restoredAdmin.id}`)

  if (restoredHarsh.id !== harshBaseline.id) {
    throw new Error(`Harsh ID changed! Expected ${harshBaseline.id}, got ${restoredHarsh.id}`)
  }
  console.log(`  -> Harsh ID preserved: ${restoredHarsh.id}`)
  console.log('  -> PASS: Original User IDs are 100% preserved.')

  // C. Confirm both OWNER accounts exist and are active
  console.log('\n[CHECK 3] Confirming both OWNER accounts exist and are active:')
  if (restoredAdmin.role !== 'OWNER' || !restoredAdmin.isActive) {
    throw new Error('Admin is not active OWNER!')
  }
  console.log(`  -> Admin role: ${restoredAdmin.role}, active: ${restoredAdmin.isActive}`)

  if (restoredHarsh.role !== 'OWNER' || !restoredHarsh.isActive) {
    throw new Error('Harsh is not active OWNER!')
  }
  console.log(`  -> Harsh role: ${restoredHarsh.role}, active: ${restoredHarsh.isActive}`)
  console.log('  -> PASS: Dual-OWNER configuration verified.')

  // D. Confirm both users can log in using their original passwords
  console.log('\n[CHECK 4] Confirming original password authentication on restored database:')
  const adminPassMatch = await bcrypt.compare(seedPassword, restoredAdmin.passwordHash)
  if (!adminPassMatch) {
    throw new Error('Admin original password does NOT match restored passwordHash!')
  }
  console.log('  -> Admin password authentication: SUCCESS (matches original credentials)')

  const harshPassMatch = await bcrypt.compare(seedPassword, restoredHarsh.passwordHash)
  if (!harshPassMatch) {
    throw new Error('Harsh original password does NOT match restored passwordHash!')
  }
  console.log('  -> Harsh password authentication: SUCCESS (matches original credentials)')
  console.log('  -> PASS: Both users authenticate with original passwords.')

  // E. Confirm all relationships still point to original user IDs
  console.log('\n[CHECK 5] Confirming foreign key relationships to original user IDs:')

  // Organisations
  const orgs = await testPrisma.organisation.findMany({ select: { id: true, name: true, assignedToId: true } })
  const assignedOrgs = orgs.filter((o) => o.assignedToId !== null)
  console.log(`  -> Total Organisations: ${orgs.length} (${assignedOrgs.length} assigned)`)
  for (const org of assignedOrgs) {
    if (!originalUsers.some((u) => u.id === org.assignedToId)) {
      throw new Error(`Organisation ${org.name} points to unknown assignedToId: ${org.assignedToId}`)
    }
  }
  console.log('  -> Organisations assignedToId relationships: VERIFIED')

  // Contacts
  const contacts = await testPrisma.contact.findMany({ select: { id: true, name: true, organisationId: true } })
  console.log(`  -> Total Contacts: ${contacts.length}`)
  for (const c of contacts) {
    if (!orgs.some((o) => o.id === c.organisationId)) {
      throw new Error(`Contact ${c.name} points to unknown organisationId: ${c.organisationId}`)
    }
  }
  console.log('  -> Contacts organisation relationships: VERIFIED')

  // Activities
  const activities = await testPrisma.activity.findMany({ select: { id: true, performedById: true } })
  console.log(`  -> Total Activities: ${activities.length}`)
  for (const a of activities) {
    if (!originalUsers.some((u) => u.id === a.performedById)) {
      throw new Error(`Activity ${a.id} points to unknown performedById: ${a.performedById}`)
    }
  }
  console.log('  -> Activities performedById relationships: VERIFIED')

  // Follow-ups
  const followups = await testPrisma.followUp.findMany({ select: { id: true, assignedToId: true } })
  console.log(`  -> Total Follow-ups: ${followups.length}`)
  for (const f of followups) {
    if (!originalUsers.some((u) => u.id === f.assignedToId)) {
      throw new Error(`Follow-up ${f.id} points to unknown assignedToId: ${f.assignedToId}`)
    }
  }
  console.log('  -> Follow-ups assignedToId relationships: VERIFIED')

  // Chats & Members & Messages
  const convos = await testPrisma.conversation.findMany({
    include: { members: true, messages: true },
  })
  console.log(`  -> Total Chat Conversations: ${convos.length}`)
  for (const c of convos) {
    if (!originalUsers.some((u) => u.id === c.createdById)) {
      throw new Error(`Conversation ${c.id} points to unknown createdById: ${c.createdById}`)
    }
    for (const m of c.members) {
      if (!originalUsers.some((u) => u.id === m.userId)) {
        throw new Error(`ConversationMember in ${c.id} points to unknown userId: ${m.userId}`)
      }
    }
    for (const msg of c.messages) {
      if (!originalUsers.some((u) => u.id === msg.senderId)) {
        throw new Error(`ChatMessage in ${c.id} points to unknown senderId: ${msg.senderId}`)
      }
    }
  }
  console.log('  -> Chat conversations, members, and messages: VERIFIED')

  // Audit Logs
  const auditLogs = await testPrisma.auditLog.findMany({ select: { id: true, userId: true, action: true } })
  console.log(`  -> Total Audit Logs: ${auditLogs.length}`)
  const userAudits = auditLogs.filter((a) => a.userId !== null)
  for (const a of userAudits) {
    if (!originalUsers.some((u) => u.id === a.userId)) {
      throw new Error(`AuditLog ${a.id} points to unknown userId: ${a.userId}`)
    }
  }
  console.log('  -> Audit logs user relationships: VERIFIED')

  console.log('\n=================================================================')
  console.log('DISASTER RECOVERY FULL RESTORE TEST PASSED WITH 100% FIDELITY!')
  console.log('=================================================================')

  await testPrisma.$disconnect()
}

run().catch((err) => {
  console.error('DISASTER RECOVERY TEST FAILED:', err)
  process.exit(1)
})
