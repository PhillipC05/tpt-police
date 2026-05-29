@AGENTS.md

# TPT Police — National Law Enforcement Management Platform

## Project Overview
Multi-tenant national police department management platform serving a 4-tier hierarchy: **Nation → Province → City → Precinct**.

## Stack
- **Framework**: Next.js 14+ (App Router, RSC + Server Actions)
- **Language**: TypeScript
- **UI**: shadcn/ui + Tailwind CSS v4
- **Auth**: NextAuth.js v5 (beta) with JWT sessions
- **ORM**: Prisma 6 + PostgreSQL
- **File Storage**: Cloudflare R2 + Wasabi (abstracted via `StorageService`)
- **Validation**: Zod on all API routes and forms
- **Deployment**: Docker-ready (Vercel / Government Cloud / self-hosted)

## Project Structure
```
src/
├── app/
│   ├── (auth)/           # Login, register, MFA pages
│   ├── (platform)/       # All authenticated app routes
│   │   ├── dashboard/
│   │   ├── cases/
│   │   ├── hr/
│   │   ├── erp/
│   │   ├── dispatch/
│   │   └── admin/
│   └── (public)/         # Public portal (crime map, FOIA)
├── components/
│   ├── ui/               # shadcn/ui primitives
│   └── ...               # Feature components
├── lib/
│   ├── auth.ts           # NextAuth config
│   ├── prisma.ts         # Prisma client singleton
│   ├── storage.ts        # StorageService (R2 + Wasabi abstraction)
│   └── dispatch.ts       # DispatchService API adapter
└── middleware.ts          # Route protection + tenant resolution
prisma/
├── schema.prisma
└── migrations/
```

## Roles (RBAC)
| Role | Scope |
|---|---|
| `SUPER_ADMIN` | Full national platform |
| `PROVINCE_ADMIN` | All cities/precincts in province |
| `CITY_ADMIN` | All precincts in city |
| `PRECINCT_ADMIN` | Own precinct only |
| `DETECTIVE` | Assigned cases and evidence |
| `OFFICER` | Field ops, shifts, incidents |
| `DISPATCHER` | Dispatch and incident response |
| `PUBLIC` | Crime map, tips, FOIA requests |

## Multi-Tenancy
- All DB data scoped by `tenantId`
- Tenant type enum: `NATION | PROVINCE | CITY | PRECINCT`
- Middleware resolves tenant context from JWT session on every request
- Cross-tier read access granted by role hierarchy

## Key Conventions
- Server Actions for mutations (not API routes unless external consumption needed)
- All forms validated with Zod + React Hook Form + `@hookform/resolvers/zod`
- All file uploads go through `lib/storage.ts` — never call R2/Wasabi directly
- Audit log written on every data mutation (use `lib/audit.ts`)
- Keep components in `src/components/`, colocate page-specific components in page folder

## Environment Variables
See `.env.example` for all required variables.

## Running Locally
```bash
cp .env.example .env.local
docker-compose up -d   # starts PostgreSQL
npx prisma migrate dev
npm run dev
```

## TODO Tracking
See `TODO.md` for full phase-by-phase task list.
