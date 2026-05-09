# FinSight

FinSight is a full-stack personal finance productivity app built with Next.js, TypeScript, Prisma, and PostgreSQL. It helps users track income and expenses, monitor budgets, import transactions in bulk, review cash-flow insights, and export monthly reports from a clean dashboard-driven workflow.

## Highlights

- Income and expense tracking with category-based analysis
- Monthly dashboard with cash flow, trends, category charts, and recent activity
- Separate insights page for financial health score, reminders, watchlist items, and setup progress
- Transaction search, filters, edit/delete flows, and recurring monthly entries
- CSV import with preview and duplicate detection
- Budget planning with alerts for categories nearing or exceeding limits
- Password-protected access for single-user deployment
- Report export for monthly summaries

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis with graceful fallback
- Tailwind CSS
- Recharts
- Zod

## Screens and Core Flows

### Dashboard
- Monthly income, expenses, and net cash flow
- Spending trend chart and category breakdown
- Budget alerts and recent transactions

### Insights
- Financial health score with recommendations
- Spending watchlist for unusual transactions
- Setup checklist and usage reminders

### Transactions
- Create, edit, delete, and search transactions
- Filter by category, type, and date range
- Mark transactions as recurring
- Import transactions from CSV with preview support

### Budgets
- Set monthly category budgets
- Track spend vs budget
- Review over-budget and near-budget states

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis optional

### Install

```bash
npm install
```

### Configure environment

Create a `.env` file from `.env.example` and set:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/finsight"
REDIS_URL="redis://localhost:6379"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
APP_PASSWORD="change-this-password"
AUTH_SECRET="change-this-secret"
```

### Set up the database

```bash
npm run db:generate
npx prisma migrate deploy
npm run db:seed
```

### Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` starts the local development server
- `npm run build` creates a production build
- `npm run start` starts the production server
- `npm run db:generate` regenerates the Prisma client
- `npm run db:migrate` runs local development migrations
- `npm run db:seed` seeds demo data
- `npm run db:studio` opens Prisma Studio

## Deployment

Recommended deployment stack:

- Vercel for the Next.js app
- Neon, Supabase, Railway, or Vercel Postgres for PostgreSQL
- Upstash Redis optional

### Required production environment variables

```env
DATABASE_URL="your-production-postgres-url"
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
APP_PASSWORD="your-login-password"
AUTH_SECRET="your-long-random-secret"
REDIS_URL="your-redis-url-optional"
```

### Recommended build command

```bash
npx prisma generate && npx prisma migrate deploy && npm run build
```

## Architecture Notes

- Prisma is used for all persistent finance data
- Redis is used as a cache layer, but the app continues to work if Redis is unavailable
- The dashboard and insights pages share aggregated finance data through server-side helpers
- CSV import validates rows before insert and can skip duplicates
- Recurring transaction generation is modeled explicitly in the transaction layer

## Summary

FinSight demonstrates full-stack product engineering across application architecture, backend data modeling, dashboard analytics, CSV ingestion, authentication, caching, and polished frontend workflows.

Description:

> Built a full-stack personal finance productivity app with Next.js, TypeScript, Prisma, and PostgreSQL featuring recurring transactions, CSV import with duplicate detection, budgeting, dashboard analytics, and password-protected deployment.
