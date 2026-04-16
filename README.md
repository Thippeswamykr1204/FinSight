# 💰 FinSight – Personal Finance Tracker

A production-ready personal finance tracker built with **Next.js 14**, **PostgreSQL**, **Redis**, **Prisma**, and **Recharts**.

---

## ✨ Features

- **Dashboard** — Monthly spending overview, KPI cards, bar chart trend, category pie chart, budget alerts
- **Transactions** — Add / edit / delete with Zod validation, pagination, category filter, search
- **Budgets** — Set per-category monthly budgets, progress bars, over-budget alerts
- **Caching** — Redis cache on all GET APIs with automatic invalidation on writes
- **Dark UI** — Polished dark theme with Tailwind CSS

---

## 🛠 Tech Stack

| Layer       | Technology                          |
|-------------|--------------------------------------|
| Framework   | Next.js 14 (App Router)             |
| Styling     | Tailwind CSS + tailwindcss-animate  |
| Components  | Custom UI (shadcn-inspired)          |
| Charts      | Recharts                             |
| ORM         | Prisma 5                             |
| Database    | PostgreSQL                           |
| Cache       | Redis (ioredis)                      |
| Validation  | Zod                                  |
| Language    | TypeScript (strict)                  |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env`:
```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/finsight"
REDIS_URL="redis://localhost:6379"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Set up the database
```bash
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run migrations (creates tables)
npm run db:seed        # Seed with 6 months of sample data
```

### 4. Start development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## 📜 Available Scripts

| Command             | Description                         |
|---------------------|--------------------------------------|
| `npm run dev`       | Start dev server                     |
| `npm run build`     | Production build                     |
| `npm run start`     | Start production server              |
| `npm run db:generate` | Regenerate Prisma client           |
| `npm run db:migrate`  | Apply database migrations           |
| `npm run db:seed`     | Seed with sample data               |
| `npm run db:studio`   | Open Prisma Studio (DB GUI)         |

---

## 🗂 Project Structure

```
finsight/
├── prisma/
│   ├── schema.prisma          # DB schema
│   └── seed.ts                # Sample data seeder
├── src/
│   ├── app/
│   │   ├── api/               # REST API routes
│   │   │   ├── transactions/  # CRUD + pagination
│   │   │   ├── budgets/       # CRUD + upsert
│   │   │   └── dashboard/     # Aggregated stats
│   │   ├── dashboard/         # Dashboard page (Server Component)
│   │   ├── transactions/      # Transactions page (Client Component)
│   │   ├── budgets/           # Budgets page (Client Component)
│   │   └── error.tsx / not-found.tsx
│   ├── components/
│   │   ├── ui/                # Reusable UI primitives
│   │   ├── forms/             # Transaction & Budget forms
│   │   ├── charts/            # Recharts wrappers
│   │   └── layout/            # Sidebar & Header
│   ├── hooks/                 # useDashboard, useTransactions, useBudgets
│   ├── lib/
│   │   ├── prisma.ts          # DB singleton
│   │   ├── redis.ts           # Cache singleton + helpers
│   │   ├── validations.ts     # Zod schemas
│   │   └── utils.ts           # Formatters & helpers
│   └── types/index.ts         # TypeScript interfaces
```

---

## 🌐 API Reference

### Transactions
| Method | Endpoint                    | Description               |
|--------|-----------------------------|---------------------------|
| GET    | `/api/transactions`         | List (paginated, filtered)|
| POST   | `/api/transactions`         | Create transaction         |
| GET    | `/api/transactions/:id`     | Get one                   |
| PATCH  | `/api/transactions/:id`     | Update                    |
| DELETE | `/api/transactions/:id`     | Delete                    |

### Budgets
| Method | Endpoint        | Description                         |
|--------|-----------------|--------------------------------------|
| GET    | `/api/budgets`  | List with spent amounts              |
| POST   | `/api/budgets`  | Create or update budget (upsert)     |
| DELETE | `/api/budgets?id=` | Delete budget                   |

### Dashboard
| Method | Endpoint          | Description                          |
|--------|-------------------|---------------------------------------|
| GET    | `/api/dashboard`  | Aggregated stats, trends, alerts      |

---

## 🏗 Architecture Decisions

- **Redis as L2 cache** — All GET routes check Redis first. TTL: 30s (transactions), 60s (dashboard), 120s (budgets). Mutations call `invalidateCache()` with glob patterns.
- **Prisma upsert for budgets** — One API call handles both create and update for the same category+month+year.
- **Parallel DB queries** — Dashboard uses `Promise.all()` for 4 concurrent queries.
- **Server Components for dashboard** — Uses `fetch` with `next: { revalidate: 60 }` for ISR.
- **Client Components for CRUD** — Transaction and budget pages are client-side for instant UI feedback.
- **Zod double validation** — Client-side for UX, server-side for security.

---

## 📝 License

MIT
