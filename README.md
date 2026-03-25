# Holiday Membership App

A full-stack membership management platform for holiday/travel clubs. Members can browse packages, make bookings, manage vouchers, and track special days. Operations staff manage bookings and members, while admins get full control and BI analytics.

---

## Tech Stack

**Backend**
- Node.js + Express (TypeScript, ESM)
- PostgreSQL via Drizzle ORM
- JWT authentication (access token in memory + refresh token in httpOnly cookie)
- node-cron background worker

**Frontend**
- React 18 + TypeScript
- Vite
- React Router v7
- Axios

**Infrastructure**
- Deployed on Railway (Nixpacks build)
- Express serves the React build in production (single-origin, no CORS needed)

---

## Project Structure

```
├── client/               # React frontend
│   └── src/
│       ├── pages/
│       │   ├── member/   # Member-facing pages
│       │   ├── ops/      # Operations staff pages
│       │   └── admin/    # Admin pages
│       ├── context/      # AuthContext (JWT + session management)
│       ├── layouts/      # Role-based layouts
│       └── lib/          # API client, formatters
├── server/               # Express backend
│   └── src/
│       ├── db/           # Drizzle schema, migrations, seed
│       ├── middleware/   # requireAuth
│       ├── modules/      # Feature modules (auth, booking, voucher, etc.)
│       └── worker/       # alertWorker (cron job)
├── .env.example
├── Procfile
└── railway.toml
```

---

## Roles

| Role | Access |
|------|--------|
| `member` | Browse packages, make bookings, manage voucher wallet, wishlist, special days, profile |
| `operations` | Manage members, review/update bookings, assign vouchers, view lookahead & wishlist dashboard |
| `admin` | All ops permissions + manage packages, voucher templates, ops users, BI dashboard |

---

## Features

**Authentication**
- Email/password login with bcrypt
- Short-lived access token (15m) + long-lived refresh token (7d, httpOnly cookie)
- Silent token refresh on page load
- No user enumeration on login failure

**Membership**
- Tiered membership (discount multipliers per tier)
- Membership expiry tracking with "expiring soon" flag (≤60 days)
- Ops can onboard members with auto-generated temporary passwords

**Bookings**
- Package bookings (from catalogue) and custom bookings (member-specified destination/hotel)
- Status flow: `new_request` → `in_review` → `confirmed` / `cancelled`
- Voucher application at booking time
- Threaded comments between members and ops on each booking

**Vouchers**
- Templates with types: `cashback`, `seasonal`, `tier_locked`, `free_night`, `fixed_amount`
- Flash vouchers with configurable expiry window
- Tier-restricted vouchers
- Ops can assign individually or bulk-assign by tier
- Members view their wallet with status tracking (`issued`, `pending`, `redeemed`, `expired`)

**Wishlist**
- Members save packages to a wishlist
- Ops see an aggregated wishlist dashboard to spot demand trends

**Special Days**
- Members register personal events (birthdays, anniversaries, etc.)
- Background worker scans daily at 2 AM and auto-issues a gift voucher 30 days before each event

**BI Dashboard (Admin)**
- Confirmed bookings by month and year
- Members with expiring memberships (next 60 days)
- Top 10 most wishlisted packages
- Voucher redemption rates by type

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/holiday_membership
JWT_ACCESS_SECRET=your-access-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
PORT=3000
NODE_ENV=development
```

### Install Dependencies

```bash
npm install
```

### Database Setup

```bash
# Run migrations
npm run db:migrate --workspace=server

# Seed initial data (tiers, admin user)
npm run db:seed --workspace=server
```

### Development

Run the server and client in separate terminals:

```bash
# Terminal 1 — API server (port 3000)
npm run dev:server

# Terminal 2 — Vite dev server (port 5173)
npm run dev:client
```

The client proxies `/api` requests to the server via Vite config.

### Production Build

```bash
npm run build
npm start
```

In production, Express serves the React build statically — no separate client server needed.

---

## API Overview

All routes are prefixed with `/api`.

| Prefix | Description |
|--------|-------------|
| `POST /api/auth/login` | Login, returns access token + sets refresh cookie |
| `POST /api/auth/refresh` | Refresh access token using cookie |
| `POST /api/auth/logout` | Clear refresh cookie |
| `GET/POST /api/members` | Member management (ops/admin) |
| `GET/POST /api/packages` | Package catalogue |
| `GET/POST /api/bookings` | Package bookings |
| `GET/POST /api/bookings/custom` | Custom bookings |
| `GET/POST /api/bookings/:id/comments` | Booking comments |
| `GET/POST /api/voucher-templates` | Voucher template management |
| `POST /api/vouchers/assign` | Assign voucher to member |
| `POST /api/vouchers/bulk-assign` | Bulk assign by tier |
| `GET /api/vouchers/me` | Member's voucher wallet |
| `GET/POST /api/wishlist` | Member wishlist |
| `GET /api/dashboard/lookahead` | Ops: upcoming special days |
| `GET /api/dashboard/wishlist` | Ops: wishlist demand view |
| `GET /api/dashboard/bi` | Admin: BI metrics |
| `GET /health` | Health check |

---

## Database Schema

Core tables: `users`, `tiers`, `packages`, `bookings`, `custom_bookings`, `booking_comments`, `voucher_templates`, `vouchers`, `wishlist`, `special_days`, `worker_logs`

Migrations are managed with Drizzle Kit:

```bash
npm run db:generate --workspace=server   # generate migration from schema changes
npm run db:migrate --workspace=server    # apply migrations
npm run db:studio --workspace=server     # open Drizzle Studio
```

---

## Testing

```bash
npm test
```

Uses Vitest. Tests live in `server/src`.

---

## Deployment

The app is configured for Railway deployment via `railway.toml`:

- Build: `npm install && npm run build`
- Start: `node server/dist/index.js`
- Health check: `GET /health`
- Restart policy: on failure

Set all environment variables from `.env.example` in your Railway project settings.
