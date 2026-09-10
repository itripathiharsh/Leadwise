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
  const filePath = process.argv[2]
  if (!filePath) {
    console.error('❌ Error: Please provide the path to a leadwise backup .xlsx file.')
    console.error('Usage: npx tsx scripts/restore-from-backup.ts <path-to-leadwise_backup.xlsx>')
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
    preview.errors.forEach(e => console.error(`  - ${e}`))
    process.exit(1)
  }

  console.log('✓ Backup file is valid.')
  console.log('  Found sheets:', preview.foundSheets.join(', '))
  console.log('  Record counts in file:', preview.counts)

  console.log('\n🚀 Executing safe restoration into database...')
  const result = await executeSafeRestore(null, buffer)

  console.log('\n🎉 SUCCESS! Restore complete!')
  console.log('Restored records summary:', result.restored)
}

main()
  .catch((err) => {
    console.error('❌ Restore failed with error:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
