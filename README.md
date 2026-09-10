# Leadwise

**Leadwise** is an executive-grade Partnership Outreach Command Center engineered for high-velocity BD, institutional outreach, healthcare/clinical partnerships, and relationship lifecycle tracking.

---

## Architecture Overview (₹0/Month Production Stack)

```
GitHub (Leadwise)
      │
      ▼
Vercel (Production Monolith)
├── Frontend (Next.js 15 App Router, React 19, Tailwind CSS)
└── Backend & API Routes (Server Actions, Edge & Serverless Handlers)
      │
      ▼
Supabase PostgreSQL (Pooled runtime via DATABASE_URL / Direct via DIRECT_URL)
      │
      ▼
Google Drive Disaster Recovery (Automated monthly & weekly hierarchical backups)
```

---

## Core Capabilities

- **Pipeline & Kanban**: Multi-stage outreach pipeline tracking organisations across 7 standardized stages:
  `Assigned` → `Contacted` → `Responded` → `Meeting Scheduled` → `Warm / Interested` → `Partnership Signed` → `Disqualified / Cold`.
- **Dynamic Daily Recommendations**: "Who Should I Contact Today?" priority scoring mapped directly to account assignees.
- **Smart Duplicate Prevention**: Real-time debounced duplicate organisation detection by normalized name and domain.
- **Activity & Channel Logging**: Complete tracking of calls, emails, LinkedIn touchpoints, scheduled meetings, and follow-ups.
- **User Onboarding & Approval Flow**:
  - Open user registration via `/signup`.
  - Self-registered accounts are set to `PENDING` status with no CRM access.
  - Dedicated `/awaiting-approval` status screen.
  - Team Leads and Owners review, approve (default role `Employee`), or reject accounts server-side.
- **Disaster Recovery & Google Drive Backups**:
  - Automatic full relational Excel backups with multi-sheet validation (Organisations, Contacts, Activities, Follow-ups, Users, Tags, Templates, Audit Logs).
  - Strict hierarchical directory structure in Google Drive: `Leadwise Backups/` → `YYYY/` → `Month/`.
  - Dated filenames (e.g. `leadwise_backup_2026-09-10_1350.xlsx`) guarantee previous backups are never overwritten.
  - Minimum 12-month historical retention policy.

---

## Security & Access Control (RBAC)

- **OWNER**: Full administrative control across all records, settings, backups, audits, and user approvals.
- **TEAM_LEAD (TL)**: CRM management, team lead assignment, and pending user approval/rejection.
- **EMPLOYEE**: Standard outreach access to assigned accounts, contacts, and daily activities.
- **PENDING / REJECTED**: Access blocked server-side; redirected to status notification.

---

## Getting Started Locally

### 1. Prerequisites
- Node.js 18+
- PostgreSQL database (Local or Supabase)

### 2. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your `DATABASE_URL`, `DIRECT_URL`, and `AUTH_SECRET`.

### 3. Setup & Database Migration
```bash
npm install
npm run db:generate
npm run db:deploy
```

To seed the initial administrative accounts (`admin@sentio.in` and `Harsh@sentio.in`):
```bash
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access Leadwise.

---

## Production Deployment to Vercel & Supabase

1. **Database**: Create a project in [Supabase](https://supabase.com). Copy the Transaction Pooler connection string (`DATABASE_URL`) and Direct Session connection string (`DIRECT_URL`).
2. **Run Migrations**: Deploy schema migrations using `npm run db:deploy`.
3. **Deploy on Vercel**: Connect your GitHub repository (`Leadwise`) to Vercel.
4. **Configure Environment Variables**: Enter the variables defined in `.env.example` into Vercel Project Settings.
5. **Build Command**: Vercel will run `prisma generate && next build`.

---

## Verification Commands

```bash
npm run typecheck   # TypeScript validation (0 errors)
npm test            # Run Vitest test suite
npm run build       # Verify production build
```
