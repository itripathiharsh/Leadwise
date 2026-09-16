/**
 * Disaster Recovery Script: Restore Leadwise CRM Database from Excel (.xlsx) Backup
 *
 * Usage:
 *   npx tsx scripts/restore-from-backup.ts <path-to-leadwise_backup.xlsx>
 *
 * Example:
 *   npx tsx scripts/restore-from-backup.ts ./leadwise_backup_2026-09-11_2031.xlsx
 */

import fs from 'node:fs'
import path from 'node:path'
import { prisma } from '../src/lib/db'
import { executeSafeRestore, validateAndPreviewRestore } from '../src/server/services/restore'

async function main() {
  const args = process.argv.slice(2)
  const filePath = args.find((a) => !a.startsWith('--'))
  const isDryRun = args.includes('--dry-run')
  const isExactOverwrite = args.includes('--mode=exact_overwrite') || args.includes('--overwrite')
  const noPreBackup = args.includes('--no-pre-backup')

  if (!filePath) {
    console.error('❌ Error: Please provide the path to a leadwise backup .xlsx file.')
    console.error('Usage: npx tsx scripts/restore-from-backup.ts <path-to-leadwise_backup.xlsx> [--mode=missing_only|exact_overwrite] [--dry-run] [--no-pre-backup]')
    process.exit(1)
  }

  const resolvedPath = path.resolve(process.cwd(), filePath)
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ Error: Backup file not found at: ${resolvedPath}`)
    process.exit(1)
  }

  console.log(`📦 Reading backup archive: ${resolvedPath}`)
  const buffer = fs.readFileSync(resolvedPath)

  console.log('🔍 Validating relational integrity & previewing sheets...')
  const preview = await validateAndPreviewRestore(buffer)

  if (!preview.valid) {
    console.error('❌ Validation Failed:')
    preview.errors.forEach((e) => console.error(`  - ${e}`))
    process.exit(1)
  }

  console.log('✓ Backup file structure is valid.')
  console.log('  Found sheets:', preview.foundSheets.join(', '))
  console.log('  Record counts in file:', preview.counts)
  console.log(`  New records: ${preview.newRecordsCount}, Existing in DB: ${preview.existingRecordsCount}, Orphans: ${preview.foreignKeyOrphansCount}`)

  if (isDryRun) {
    console.log('\n🔎 [DRY RUN MODE] Validation complete. Zero changes written to database.')
    return
  }

  const mode = isExactOverwrite ? 'EXACT_OVERWRITE' : 'MISSING_ONLY'
  console.log(`\n🚀 Executing safe restoration in ${mode} mode...`)
  const result = await executeSafeRestore(null, buffer, {
    mode,
    preBackup: !noPreBackup,
  })

  console.log('\n🎉 SUCCESS! Restore complete!')
  if (result.preRestoreBackupFile) {
    console.log(`  Pre-restore safety snapshot: ${result.preRestoreBackupFile}`)
  }
  console.log('  Restored records summary:', result.restored)
  console.log(`  Skipped existing records: ${result.skippedExisting}`)
}

main()
  .catch((err) => {
    console.error('❌ Restore failed with error:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
