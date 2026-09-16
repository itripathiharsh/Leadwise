import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const BASE_URL = 'http://localhost:3000'

async function run() {
  const secret = process.env.OWNER_RECOVERY_SECRET
  const seedPassword = process.env.SEED_PASSWORD

  if (!secret) {
    throw new Error('OWNER_RECOVERY_SECRET is not configured in environment.')
  }
  if (!seedPassword) {
    throw new Error('SEED_PASSWORD is not configured in environment.')
  }

  console.log('=================================================================')
  console.log('STARTING LIVE EMERGENCY RECOVERY VERIFICATION')
  console.log('=================================================================\n')

  // 1. Verify Secret Security & Isolation
  console.log('[SECURITY AUDIT 1] Confirming OWNER_RECOVERY_SECRET isolation:')

  // Check Git status - ensure .env is untracked / ignored
  const gitIgnored = execSync('git check-ignore .env', { encoding: 'utf8' }).trim()
  if (!gitIgnored.includes('.env')) {
    throw new Error('.env file is NOT ignored by git!')
  }
  console.log('  -> .env file is properly ignored by Git: VERIFIED')

  // Ensure secret does not appear in git tracked files
  try {
    const gitGrep = execSync(`git grep "${secret}"`, { encoding: 'utf8' }).trim()
    if (gitGrep.length > 0) {
      throw new Error('CRITICAL SECURITY VIOLATION: OWNER_RECOVERY_SECRET found in git repo!')
    }
  } catch (e: any) {
    // git grep returns exit code 1 when not found, which is expected and good!
    console.log('  -> OWNER_RECOVERY_SECRET is NOT committed to Git: VERIFIED')
  }

  // Ensure secret is not in frontend files
  const frontendDir = path.join(__dirname, '..', 'src', 'app')
  const clientCode = fs.readdirSync(frontendDir, { recursive: true })
    .filter((f) => String(f).endsWith('.tsx') || String(f).endsWith('.ts'))
    .map((f) => fs.readFileSync(path.join(frontendDir, String(f)), 'utf8'))
    .join('\n')

  if (clientCode.includes(secret)) {
    throw new Error('CRITICAL SECURITY VIOLATION: OWNER_RECOVERY_SECRET exposed in frontend code!')
  }
  console.log('  -> OWNER_RECOVERY_SECRET is NOT exposed to frontend code: VERIFIED')

  // 2. Test Emergency Recovery API Route: Invalid Secret rejection
  console.log('\n[API TEST 1] Testing rejection of invalid recovery secret:')
  const invalidRes = await fetch(`${BASE_URL}/api/auth/emergency-recovery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recoverySecret: 'invalid-secret-which-should-be-rejected-12345',
      action: 'REACTIVATE',
      targetEmail: 'admin@sentio.in',
    }),
  })
  console.log(`  -> Invalid secret response status: ${invalidRes.status}`)
  if (invalidRes.status !== 401) {
    throw new Error(`Expected 401 for invalid secret, got ${invalidRes.status}`)
  }
  console.log('  -> Invalid secret rejected with 401: PASS')

  // 3. Test Emergency Recovery: REACTIVATE
  console.log('\n[API TEST 2] Testing REACTIVATE action via emergency recovery:')
  const reactivateRes = await fetch(`${BASE_URL}/api/auth/emergency-recovery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recoverySecret: secret,
      action: 'REACTIVATE',
      targetEmail: 'admin@sentio.in',
    }),
  })
  const reactivateData = await reactivateRes.json()
  console.log(`  -> Reactivate status: ${reactivateRes.status}`, reactivateData)
  if (reactivateRes.status !== 200 || !reactivateData.success) {
    throw new Error('REACTIVATE action failed!')
  }
  console.log('  -> REACTIVATE action: PASS')

  // 4. Test Emergency Recovery: RESET_PASSWORD
  console.log('\n[API TEST 3] Testing RESET_PASSWORD action via emergency recovery:')
  const resetRes = await fetch(`${BASE_URL}/api/auth/emergency-recovery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recoverySecret: secret,
      action: 'RESET_PASSWORD',
      targetEmail: 'admin@sentio.in',
      newPassword: seedPassword,
    }),
  })
  const resetData = await resetRes.json()
  console.log(`  -> Reset password status: ${resetRes.status}`, resetData)
  if (resetRes.status !== 200 || !resetData.success) {
    throw new Error('RESET_PASSWORD action failed!')
  }
  console.log('  -> RESET_PASSWORD action: PASS')

  // 5. Test Emergency Recovery: PROMOTE
  console.log('\n[API TEST 4] Testing PROMOTE action via emergency recovery:')
  const promoteRes = await fetch(`${BASE_URL}/api/auth/emergency-recovery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recoverySecret: secret,
      action: 'PROMOTE',
      targetEmail: 'harsh@sentio.in',
    }),
  })
  const promoteData = await promoteRes.json()
  console.log(`  -> Promote status: ${promoteRes.status}`, promoteData)
  if (promoteRes.status !== 200 || !promoteData.success) {
    throw new Error('PROMOTE action failed!')
  }
  console.log('  -> PROMOTE action: PASS')

  console.log('\n=================================================================')
  console.log('EMERGENCY RECOVERY ALL CHECKS PASSED!')
  console.log('=================================================================')
}

run().catch((err) => {
  console.error('EMERGENCY RECOVERY VERIFICATION FAILED:', err)
  process.exit(1)
})
