# Leadwise — Production Disaster Recovery & Operational Runbook

This document is the definitive guide for recovering the Leadwise CRM in the event of an outage, data corruption, cloud provider incident, or team turnover.

---

## 1. System Overview & Source of Truth

```
┌────────────────────────────────┐
│   GitHub (Source of Truth)    │
│  itripathiharsh/Leadwise       │
└───────────────┬────────────────┘
                │ Deploy
                ▼
   ┌─────────────────────────┐
   │     Vercel Production   │
   │  leadwise-red.vercel.app│
   └────────────┬────────────┘
                │ DB Connection
                ▼
   ┌─────────────────────────┐
   │   Supabase PostgreSQL   │
   │  Region: ap-south-1     │
   │  Ref: opiipezwttttnallhegz│
   └────────────┬────────────┘
                │ Scheduled Cron / Manual
                ▼
   ┌─────────────────────────┐
   │   Google Drive Backup   │
   │  Folder ID:             │
   │  1Rg8Gr68cwglbsq_HYZphgh│
   └─────────────────────────┘
```

---

## 2. Production Services & Identifiers

| Component | Provider | Identifier / URL | Purpose |
|---|---|---|---|
| **Git Repository** | GitHub | `itripathiharsh/Leadwise` | Primary source code and migrations |
| **Hosting & Edge** | Vercel | `leadwise-red.vercel.app` | Next.js 15 runtime & API routes |
| **Vercel Project ID**| Vercel | `prj_GyyLEcP7moGCzZgB2oElri0xqrFW` | Project definition |
| **Vercel Team** | Vercel | `Beyond Binary` (`team_2aQBwwmDSkpZPNKvtMffUHdi`) | Organization account |
| **Database** | Supabase | `opiipezwttttnallhegz` (ap-south-1) | PostgreSQL 17 database |
| **Connection Pooler**| Supabase Supavisor | `aws-0-ap-south-1.pooler.supabase.com:6543` | Transaction pooler |
| **Backup Storage** | Google Drive | `1Rg8Gr68cwglbsq_HYZphghMADlafrGCg` | Off-site encrypted Excel backups |

---

## 3. Environment Variables Reference

These variables are configured in the Vercel Dashboard (**Settings → Environment Variables**):

| Variable | Description | Example / Notes |
|---|---|---|
| `DATABASE_URL` | Pooled connection string | `postgresql://postgres.opiipezwttttnallhegz:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | Session pooler / direct port | `postgresql://postgres.opiipezwttttnallhegz:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres` |
| `AUTH_SECRET` | 48-byte cryptographically secure secret | Used to sign & verify JWT session tokens (HS256) |
| `CRON_SECRET` | Secret token for Vercel Cron routes | Protects `/api/cron/*` endpoints from unauthorized invocation |
| `NEXT_PUBLIC_APP_URL`| Canonical production application URL | `https://leadwise-red.vercel.app` |
| `APP_TIMEZONE` | Primary business timezone | `Asia/Kolkata` |
| `SEED_PASSWORD` | Default fallback admin password | Used during clean initial bootstrap |
| `GOOGLE_DRIVE_BACKUP_FOLDER_ID` | Drive folder ID for backup uploads | `1Rg8Gr68cwglbsq_HYZphghMADlafrGCg` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Optional env var for Google Drive | Can also be configured via `/settings/backups` UI |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Optional RSA private key for Drive | Can also be configured via `/settings/backups` UI |

---

## 4. Disaster Recovery Scenarios

### Scenario A: Complete Database Rebuild (Zero Data Loss via Drive Backups)
If the database is destroyed or corrupted:

1. **Provision a new Supabase database** (or wipe the corrupted one).
2. **Apply migrations**:
   ```bash
   npx prisma migrate deploy
   ```
   Or apply `prisma/migrations/0_init/migration.sql` directly using Supabase SQL Editor.
3. **Restore Data from Backup**:
   - Locate the latest `.xlsx` backup file in Google Drive folder `1Rg8Gr68cwglbsq_HYZphghMADlafrGCg`.
   - Log in as `admin@sentio.in` to the production CRM.
   - Navigate to `/settings/backups`.
   - Use the **Restore Database** option and upload the `.xlsx` file.
   - The restore engine validates all foreign keys, recreates organizations, contacts, activities, and follow-ups with exact relational consistency.

### Scenario B: Accidental Admin Account Lockout
If administrative credentials are lost:
1. Open the Supabase SQL Editor for project `opiipezwttttnallhegz`.
2. Generate a bcrypt hash for the new password:
   ```bash
   node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YourNewPassword', 10).then(console.log)"
   ```
3. Update the user record directly:
   ```sql
   UPDATE "User"
   SET "passwordHash" = '<GENERATED_HASH>',
       "status" = 'APPROVED',
       "isActive" = true
   WHERE "email" = 'admin@sentio.in';
   ```

### Scenario C: Vercel Redeployment / Rollback
If a bad code deployment reaches production:
1. Navigate to the Vercel Dashboard → `leadwise` → Deployments.
2. Select the previous stable deployment (e.g., `dpl_5ULFQ1WyWfmcAUXTweKnoSTcCKtY`).
3. Click **Instant Rollback** or promote that deployment.
4. Production traffic immediately shifts with 0 downtime.

### Scenario D: Google Service Account Setup for Automated Backups
To connect Google Drive for automated headless backups:
1. Go to [Google Cloud Console](https://console.cloud.google.com).
2. Create a project or select an existing project.
3. Enable the **Google Drive API**.
4. Navigate to **IAM & Admin → Service Accounts** → Create Service Account.
5. Generate a new JSON key file (contains `client_email` and `private_key`).
6. Go to Google Drive, open folder `1Rg8Gr68cwglbsq_HYZphghMADlafrGCg`, and click **Share**.
7. Share the folder with the `client_email` with **Editor** permissions.
8. In Leadwise, log in as OWNER, navigate to **Settings → Backups** (`/settings/backups`), and paste:
   - Service Account Email
   - RSA Private Key
9. Click **Test Connection** to confirm connectivity.

---

## 5. Automated Backups & Cron Schedule

Vercel Cron automatically triggers:
- **Monthly Backup**: Every 1st of the month at 00:00 UTC (`0 0 1 * *`) via `/api/cron/monthly-backup`.
- **Weekly Backup**: Every Saturday at 19:00 UTC (`0 19 * * 6`) via `/api/cron/weekly-backup`.

All backups produce full relational Excel spreadsheets containing:
- `Organisations`
- `Contacts`
- `Activities`
- `FollowUps`
- `Tags`
- `AuditLog`
