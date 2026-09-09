# Leadwise CRM

**Leadwise CRM** is an internal, executive-grade Partnership Outreach & Activity CRM engineered for high-velocity BD, healthcare/clinical partnerships, and institutional outreach.

---

## Key Features

- **Pipeline & Kanban**: Multi-stage outreach pipeline tracking organisations from New to Active Partnership.
- **Dynamic Daily Recommendations**: "Who Should I Contact Today?" priority scoring strictly mapped to account assignees.
- **Smart Duplicate Prevention**: Real-time debounced duplicate organisation detection by name and domain, with immediate 1-click contact association.
- **Activity & Channel Logging**: Track phone calls, emails, LinkedIn touchpoints, meetings, and follow-ups.
- **Role-Based Access Control (RBAC)**: Secure multi-tier permissions for Owner, Team Lead (TL), and Interns.
- **Automated EOD Reports**: Consolidated end-of-day analytics and WhatsApp summaries.
- **Audit Trails & Notifications**: Comprehensive change-tracking, coordination warnings for shared accounts, and real-time alert center.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router, Server Actions, React 19)
- **Database & ORM**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS & Radix UI primitives
- **Icons & UI**: Lucide Icons, Sonner toast notifications, Recharts
- **Testing**: Vitest test suite

---

## Getting Started

### 1. Prerequisites
- Node.js 18+
- PostgreSQL database

### 2. Environment Configuration
Create a `.env.local` file from `.env.example`:
```bash
cp .env.example .env.local
```
Configure your `DATABASE_URL` and `AUTH_SECRET`.

### 3. Setup & Database Migration
```bash
npm install
npx prisma generate
npx prisma db push
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access Leadwise CRM.

---

## Production Build

```bash
npm run build
npm start
```
