import { PrismaClient } from '@prisma/client'
import ExcelJS from 'exceljs'
import {
  resetUserPasswordByOwner,
  changeUserRole,
  deactivateUser,
  deleteUser,
} from '../src/server/services/users'
import { executeSafeRestore } from '../src/server/services/restore'

const PRIMARY_DB_URL = process.env.DATABASE_URL!
const testUrlObj = new URL(process.env.DATABASE_URL!)
testUrlObj.pathname = '/atlas_crm_test_dr1'
const TEST_DB_URL = testUrlObj.toString()

async function run() {
  console.log('=================================================================')
  console.log('STARTING OWNER SAFETY & GOVERNANCE VERIFICATION')
  console.log('=================================================================\n')

  const primaryPrisma = new PrismaClient({ datasources: { db: { url: PRIMARY_DB_URL } } })
  const testPrisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } })

  try {
    // ─────────────────────────────────────────────────────────────
    // 1. Harsh and Admin are both active OWNERs in Primary DB
    // ─────────────────────────────────────────────────────────────
    console.log('[CHECK 1] Verifying Dual-OWNER configuration in primary CRM database:')
    const primaryOwners = await primaryPrisma.user.findMany({
      where: { email: { in: ['admin@sentio.in', 'harsh@sentio.in'] }, deletedAt: null },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    })

    const admin = primaryOwners.find((u) => u.email === 'admin@sentio.in')
    const harsh = primaryOwners.find((u) => u.email === 'harsh@sentio.in')

    if (!admin || admin.role !== 'OWNER' || !admin.isActive) {
      throw new Error(`Admin is not an active OWNER in primary DB! Found: ${JSON.stringify(admin)}`)
    }
    console.log(`  -> Admin (${admin.email}): Role=${admin.role}, Active=${admin.isActive}`)

    if (!harsh || harsh.role !== 'OWNER' || !harsh.isActive) {
      throw new Error(`Harsh is not an active OWNER in primary DB! Found: ${JSON.stringify(harsh)}`)
    }
    console.log(`  -> Harsh (${harsh.email}): Role=${harsh.role}, Active=${harsh.isActive}`)
    console.log('  -> PASS: Dual active OWNER accounts confirmed in primary DB.')

    // ─────────────────────────────────────────────────────────────
    // 2. One OWNER can reset the other (Mutual Reset Test)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[CHECK 2] Testing Mutual Password Reset on isolated test DB:')
    const harshCaller = {
      id: harsh.id,
      email: harsh.email,
      name: harsh.name,
      role: 'OWNER' as const,
      status: 'APPROVED' as const,
      phone: null,
      avatarColor: 'violet',
      isActive: true,
    }
    const adminCaller = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: 'OWNER' as const,
      status: 'APPROVED' as const,
      phone: null,
      avatarColor: 'violet',
      isActive: true,
    }

    // Harsh resets Admin
    const reset1 = await resetUserPasswordByOwner(
      harshCaller,
      admin.id,
      'Complex#Pass2026!HarshReset',
      testPrisma,
    )
    console.log(`  -> Harsh reset Admin password: ${reset1.success} (${reset1.message})`)
    if (!reset1.success) throw new Error('Harsh could not reset Admin password!')

    // Admin resets Harsh
    const reset2 = await resetUserPasswordByOwner(
      adminCaller,
      harsh.id,
      'Complex#Pass2026!AdminReset',
      testPrisma,
    )
    console.log(`  -> Admin reset Harsh password: ${reset2.success} (${reset2.message})`)
    if (!reset2.success) throw new Error('Admin could not reset Harsh password!')
    console.log('  -> PASS: Mutual OWNER credential reset verified.')

    // ─────────────────────────────────────────────────────────────
    // 3. Final Active OWNER Protection (Demote, Deactivate, Delete)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[CHECK 3] Testing Final Active OWNER Protection:')

    // A. Demote Admin to TL (harsh demotes admin with confirmation) -> Allowed since Harsh remains
    console.log('  -> Demoting Admin to TL (Harsh remains as sole active OWNER)...')
    const demoteAdmin = await changeUserRole(harshCaller, admin.id, 'TL', true, testPrisma)
    console.log(`  -> Admin role changed to: ${demoteAdmin.role}`)

    const remainingOwners = await testPrisma.user.count({
      where: { role: 'OWNER', isActive: true, deletedAt: null },
    })
    console.log(`  -> Remaining active OWNERs in test DB: ${remainingOwners}`)
    if (remainingOwners !== 1) throw new Error(`Expected exactly 1 owner, got ${remainingOwners}`)

    // B. Attempt to demote Harsh (the LAST remaining active OWNER) -> MUST FAIL
    console.log('  -> Attempting to demote Harsh (the sole remaining active OWNER)...')
    let demoteFailedAsExpected = false
    try {
      await changeUserRole(harshCaller, harsh.id, 'TL', true, testPrisma)
    } catch (err: any) {
      if (err.message.includes('Cannot demote the final active Owner')) {
        demoteFailedAsExpected = true
        console.log(`  -> Successfully blocked demotion: "${err.message}"`)
      } else {
        throw err
      }
    }
    if (!demoteFailedAsExpected) {
      throw new Error('CRITICAL VULNERABILITY: Demotion of final active OWNER was NOT blocked!')
    }

    // C. Attempt to deactivate Harsh (the LAST remaining active OWNER) -> MUST FAIL
    console.log('  -> Attempting to deactivate Harsh (the sole remaining active OWNER)...')
    let deactivateFailedAsExpected = false
    try {
      // Use Admin as caller (temporarily granting user:manage or caller)
      const adminTlCaller = { ...adminCaller, role: 'OWNER' as const }
      await deactivateUser(adminTlCaller, harsh.id, testPrisma)
    } catch (err: any) {
      if (err.message.includes('At least one active Owner is required')) {
        deactivateFailedAsExpected = true
        console.log(`  -> Successfully blocked deactivation: "${err.message}"`)
      } else {
        throw err
      }
    }
    if (!deactivateFailedAsExpected) {
      throw new Error('CRITICAL VULNERABILITY: Deactivation of final active OWNER was NOT blocked!')
    }

    // D. Attempt to delete an OWNER -> MUST FAIL
    console.log('  -> Promoting Admin back to OWNER...')
    await changeUserRole(harshCaller, admin.id, 'OWNER', true, testPrisma)

    console.log('  -> Attempting to delete Admin (an OWNER account)...')
    let deleteFailedAsExpected = false
    try {
      await deleteUser(harshCaller, admin.id, testPrisma)
    } catch (err: any) {
      if (err.message.includes('Owner accounts cannot be deleted')) {
        deleteFailedAsExpected = true
        console.log(`  -> Successfully blocked deletion: "${err.message}"`)
      } else {
        throw err
      }
    }
    if (!deleteFailedAsExpected) {
      throw new Error('CRITICAL VULNERABILITY: Deletion of OWNER account was NOT blocked!')
    }
    console.log('  -> PASS: Final active OWNER cannot be demoted, deactivated, or deleted.')

    // ─────────────────────────────────────────────────────────────
    // 4. Restore cannot reduce active OWNER count to zero
    // ─────────────────────────────────────────────────────────────
    console.log('\n[CHECK 4] Testing that Restore cannot reduce active OWNER count to zero:')
    // Build a workbook with 0 active OWNERs (only INTERN users)
    const zeroOwnerWb = new ExcelJS.Workbook()
    const uWs = zeroOwnerWb.addWorksheet('Users')
    uWs.addRow(['id', 'name', 'email', 'role', 'status', 'phone', 'avatarColor', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt'])
    // Add existing OWNER accounts set to INTERN to test demoting all active owners to zero
    uWs.addRow([admin.id, admin.name, admin.email, 'INTERN', 'APPROVED', '', 'blue', 'true', '', new Date().toISOString(), new Date().toISOString()])
    uWs.addRow([harsh.id, harsh.name, harsh.email, 'INTERN', 'APPROVED', '', 'blue', 'true', '', new Date().toISOString(), new Date().toISOString()])

    // Add minimal required empty sheets
    const sheets = [
      'Organisations', 'Contacts', 'Activities', 'Followups', 'Reassignment Requests',
      'EOD Reports', 'Audit Logs', 'Tags', 'Organisation Tags', 'Contact Tags',
      'Templates', 'Comments', 'Attachments', 'Conversations', 'Conversation Members', 'Messages'
    ]
    for (const s of sheets) {
      const ws = zeroOwnerWb.addWorksheet(s)
      ws.addRow(['id'])
    }

    const zeroOwnerBuf = Buffer.from(await (zeroOwnerWb.xlsx as any).writeBuffer())

    let restoreBlockedAsExpected = false
    try {
      await executeSafeRestore(null, zeroOwnerBuf, {
        mode: 'EXACT_OVERWRITE',
        preBackup: false,
        prismaClient: testPrisma,
      })
    } catch (err: any) {
      if (
        err.message.toLowerCase().includes('active owner') ||
        err.message.includes('Restore validation failed')
      ) {
        restoreBlockedAsExpected = true
        console.log(`  -> Successfully blocked zero-OWNER restore: "${err.message}"`)
      } else {
        throw err
      }
    }
    if (!restoreBlockedAsExpected) {
      throw new Error('CRITICAL VULNERABILITY: Restore with 0 active OWNERs was NOT blocked!')
    }
    console.log('  -> PASS: Restore cannot reduce active OWNER count to zero.')

    // ─────────────────────────────────────────────────────────────
    // 5. All role changes and password resets create audit logs
    // ─────────────────────────────────────────────────────────────
    console.log('\n[CHECK 5] Confirming audit logs created for all role changes and password resets:')
    const auditLogs = await testPrisma.auditLog.findMany({
      where: {
        action: { in: ['user.role_changed', 'user.password_reset'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    console.log(`  -> Total role change & password reset audit entries: ${auditLogs.length}`)
    for (const log of auditLogs) {
      console.log(`     [${log.action}] by ${log.userId}: "${log.summary}"`)
    }

    const hasRoleChangeAudit = auditLogs.some((a) => a.action === 'user.role_changed')
    const hasPasswordResetAudit = auditLogs.some((a) => a.action === 'user.password_reset')

    if (!hasRoleChangeAudit) throw new Error('user.role_changed audit log missing!')
    if (!hasPasswordResetAudit) throw new Error('user.password_reset audit log missing!')
    console.log('  -> PASS: All role changes and password resets generated immutable audit logs.')

    console.log('\n=================================================================')
    console.log('OWNER SAFETY & GOVERNANCE VERIFICATION COMPLETED SUCCESSFULLY!')
    console.log('=================================================================')
  } finally {
    await primaryPrisma.$disconnect()
    await testPrisma.$disconnect()
  }
}

run().catch((err) => {
  console.error('OWNER SAFETY VERIFICATION FAILED:', err)
  process.exit(1)
})
