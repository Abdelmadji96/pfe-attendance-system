# PFE Attendance System

A production-ready RFID + Face Recognition Entry & Attendance System built as a monorepo with **Express.js** backend, **Next.js** dashboard, and **PostgreSQL** database.

## Architecture

```
pfe-attendance-system/
├── apps/
│   ├── api/           → Express.js REST API (TypeScript, Prisma, JWT)
│   └── dashboard/     → Next.js 14 Dashboard (App Router, Tailwind, shadcn/ui)
├── packages/
│   └── shared/        → Shared types, Zod schemas, enums, constants
├── docker-compose.yml → PostgreSQL 16
└── turbo.json         → Turborepo build orchestration
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, React Hook Form, Zod, TanStack Query, Recharts |
| Backend | Express.js, TypeScript, Prisma ORM, JWT, bcrypt, multer |
| Database | PostgreSQL 16 |
| Monorepo | pnpm workspaces + Turborepo |

## Features

- **Attendance Management** — Filterable table, date range, CSV export, charts
- **User Enrollment** — 5-step wizard with RFID scan + face image capture/upload
- **RFID Verification** — Simulate tap → face verify → access decision flow
- **RBAC** — 3 roles (Super Admin, Viewer, Enrollment Admin) with permission-gated routes
- **Charts** — Check-ins per day, peak hours, department/class breakdown, success rate
- **Dual Context** — Company (employees) and Campus (students) support

## Prerequisites

- Node.js 18+
- pnpm 9+
- Docker & Docker Compose (for PostgreSQL)

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/Abdelmadji96/pfe-attendance-system.git
cd pfe-attendance-system
pnpm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. Configure environment

```bash
cp .env.example apps/api/.env
```

### 4. Set up the database

```bash
pnpm db:push
pnpm db:seed
```

### 5. Start development servers

```bash
pnpm dev
```

- **Dashboard**: http://localhost:3000
- **API**: http://localhost:4000
- **API Health**: http://localhost:4000/api/health

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@system.com | password123 |
| Viewer | viewer@system.com | password123 |
| Enrollment Admin | enrollment@system.com | password123 |

## API Endpoints

| Group | Endpoints |
|-------|-----------|
| Auth | `POST /api/auth/login`, `POST /api/auth/register-admin`, `GET /api/auth/me` |
| Users | `GET/POST /api/users`, `GET/PATCH/DELETE /api/users/:id`, `PATCH /api/users/:id/role` |
| RFID | `POST /api/rfid/scan`, `POST /api/rfid/assign`, `GET /api/rfid/:uid/user` |
| Face | `POST /api/face/enroll/:userId`, `GET /api/face/templates/:userId`, `DELETE /api/face/templates/:id` |
| Verification | `POST /api/verification/verify`, `POST /api/verification/mock-entry` |
| Attendance | `GET /api/attendance`, `GET /api/attendance/stats`, `GET /api/attendance/charts/*`, `POST /api/attendance/check-in`, `POST /api/attendance/check-out` |
| Roles | `GET /api/roles` |
| Settings | `GET /api/settings`, `PATCH /api/settings` |

## Database Schema

9 models: User, Role, EmployeeProfile, StudentProfile, RFIDCard, FaceTemplate, AttendanceLog, AccessLog, Setting

View the full schema: [`apps/api/prisma/schema.prisma`](apps/api/prisma/schema.prisma)

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all packages and apps |
| `pnpm db:push` | Push Prisma schema to database |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:seed` | Seed database with demo data |
| `pnpm db:studio` | Open Prisma Studio |

## Integration Points

The system is designed for easy integration with real hardware and AI:

- **RFID Reader** — Replace manual UID input with WebSocket/Serial connection to RFID hardware
- **Face Recognition Model** — Swap `FaceVerificationService` mock with a Python microservice (FaceNet/ArcFace) via gRPC or HTTP
- **Camera** — Replace `react-webcam` simulation with real camera feed
- **Hardware Feedback** — Connect LED, buzzer, and door relay via GPIO/serial interface

## License

MIT
