# Vicsmall Tradefair App

This repository contains:

- Next.js frontend (App Router) for public and admin tradefair UI.
- Standalone Express + TypeScript backend for tradefair APIs.

Use `pnpm` only.

## Local Commands

```bash
pnpm dev
pnpm build
pnpm start
```

```bash
pnpm backend:dev
pnpm backend:build
pnpm backend:start
```

```bash
pnpm seed:tradefair
pnpm seed:admin
pnpm test:backend
```

## API Roots

- Public + payments: `/api/tradefair`
- Admin auth: `/api/admin/auth`
- Admin tradefair: `/api/admin/tradefair`
- Health check: `/health`

## Production Deployment Topology

- Frontend: Vercel (Next.js)
- Backend: Render Web Service (Express app from `src/backend/server.ts`)
- Database: MongoDB Atlas (replica-set capable)

## Render Setup (Backend)

- Build command: `pnpm backend:build`
- Start command: `pnpm backend:start`
- Health check path: `/health`
- Port: Render injects `PORT`; backend binds `process.env.PORT`

Required Render env vars:

- `NODE_ENV=production`
- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `JWT_SECRET`
- `FRONTEND_URL` (your Vercel URL)
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_WEBHOOK_SECRET`
- `TRADEFAIR_HOLD_MINUTES`
- `TRADEFAIR_EVENT_SLUG`
- `TRADEFAIR_FRONTEND_URL`
- `TRADEFAIR_CONFIRMATION_URL`
- `TRADEFAIR_CALLBACK_URL`
- `WHATSAPP_SUPPORT_NUMBER`
- `ADMIN_EMAIL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

Create the first admin after deploy:

```bash
pnpm seed:admin
```

## Vercel Setup (Frontend)

Required Vercel env vars:

- `NEXT_PUBLIC_API_BASE_URL` (Render backend base URL, e.g. `https://your-backend.onrender.com`)
- `NEXT_PUBLIC_TRADEFAIR_EVENT_SLUG`
- `NEXT_PUBLIC_TRADEFAIR_HOLD_MINUTES`
- `NEXT_PUBLIC_TRADEFAIR_FRONTEND_URL`
- `NEXT_PUBLIC_TRADEFAIR_CONFIRMATION_URL`
- `NEXT_PUBLIC_TRADEFAIR_CALLBACK_URL`
- `NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER`

## Admin Auth Flow

- Login endpoint: `POST /api/admin/auth/login`
- Session check: `GET /api/admin/auth/me`
- Logout endpoint: `POST /api/admin/auth/logout`
- Admin JWT is issued by backend and stored in secure HTTP-only cookie (`vicsmall_admin_token`) on frontend domain.
- Backend middleware protects all `/api/admin/tradefair/*` routes.
- Frontend middleware protects `/admin/*` routes and redirects unauthenticated users to `/admin/login`.

## MongoDB Transaction Requirement

Tradefair hold/payment flows use MongoDB transactions.  
Use a replica-set capable MongoDB deployment for local and production.

## Collections You Should See In Atlas / Compass

- `adminusers`
- `events`
- `standzones`
- `stands`
- `standslots`
- `vendors`
- `registrations`
- `payments`
- `auditlogs`
- `categories`
- `termsversions`
- `layouts`
- `layoutversions`
