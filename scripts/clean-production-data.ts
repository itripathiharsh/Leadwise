import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Purging all demo and seeded outreach data for production...')

  // Delete all relational activity & outreach data in proper foreign key order
  const delActivities = await prisma.activity.deleteMany()
  console.log(`- Deleted ${delActivities.count} activities`)

  const delFollowUps = await prisma.followUp.deleteMany()
  console.log(`- Deleted ${delFollowUps.count} follow-ups`)

  const delContactTags = await prisma.contactTag.deleteMany()
  console.log(`- Deleted ${delContactTags.count} contact tags`)

  const delOrgTags = await prisma.organisationTag.deleteMany()
  console.log(`- Deleted ${delOrgTags.count} organisation tags`)

  const delReassignments = await prisma.reassignmentRequest.deleteMany()
  console.log(`- Deleted ${delReassignments.count} reassignment requests`)

  const delComments = await prisma.comment.deleteMany()
  console.log(`- Deleted ${delComments.count} comments`)

  const delAttachments = await prisma.attachment.deleteMany()
  console.log(`- Deleted ${delAttachments.count} attachments`)

  const delContacts = await prisma.contact.deleteMany()
  console.log(`- Deleted ${delContacts.count} contacts`)

  const delOrgs = await prisma.organisation.deleteMany()
  console.log(`- Deleted ${delOrgs.count} organisations`)

  const delEod = await prisma.eodReport.deleteMany()
  console.log(`- Deleted ${delEod.count} EOD reports`)

  const delNotifications = await prisma.notification.deleteMany()
  console.log(`- Deleted ${delNotifications.count} notifications`)

  const delAuditLogs = await prisma.auditLog.deleteMany()
  console.log(`- Deleted ${delAuditLogs.count} audit logs`)

  const delImportBatches = await prisma.importBatch.deleteMany()
  console.log(`- Deleted ${delImportBatches.count} import batches`)

  const delBackups = await prisma.backupRecord.deleteMany()
  console.log(`- Deleted ${delBackups.count} backup records`)

  const delSavedViews = await prisma.savedView.deleteMany()
  console.log(`- Deleted ${delSavedViews.count} saved views`)

  const delTags = await prisma.tag.deleteMany()
  console.log(`- Deleted ${delTags.count} tags`)

  console.log('✅ All seeded demo data has been completely removed!')
}

main()
  .catch((err) => {
    console.error('❌ Error cleaning production data:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
