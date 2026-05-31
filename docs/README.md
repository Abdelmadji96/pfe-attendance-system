# PFE Attendance — Documentation Index

All guides for deployment, environment variables, Raspberry Pi, and daily operations.

| Document | Format | Description |
|----------|--------|-------------|
| [SYSTEM-TECHNICAL-SPECIFICATION.md](./SYSTEM-TECHNICAL-SPECIFICATION.md) | MD | **Complete technical spec** — all hardware, wiring, pins, technologies, versions |
| [OPERATIONS.md](./OPERATIONS.md) | MD | **Full guide** — architecture, checklists, troubleshooting |
| [SINGLE-PI-MOBILE-DEPLOYMENT.md](./SINGLE-PI-MOBILE-DEPLOYMENT.md) | MD | **Single Pi setup** — SSH access, switching locations, enrollment/gate modes |
| [ENV-VARIABLES.md](./ENV-VARIABLES.md) | MD | Every env var: API, Dashboard, Raspberry Pi, routes |
| [ADMIN-PI.md](./ADMIN-PI.md) | MD | **Step 1** — enrollment desk Pi setup & tests |
| [GATE-PI.md](./GATE-PI.md) | MD | **Step 2** — classroom gate Pi setup & tests |
| [ROOM-CHANGE.md](./ROOM-CHANGE.md) | MD | Moving Pi to new room / new Wi‑Fi / new IP |
| [pdf/](./pdf/) | PDF | PDF copies (generate with `pnpm docs:pdf`) |

## Quick links

| What | URL |
|------|-----|
| Dashboard | https://pfe-attendance-system-dashboard.vercel.app |
| API | http://187.77.171.204:4000/api |
| API health | http://187.77.171.204:4000/api/health |
| VPS SSH | `ssh root@187.77.171.204` |
| Pi SSH | `ssh admin@<PI_LAN_IP>` |

## Generate PDFs

From repo root:

```bash
pnpm install          # installs md-to-pdf once
pnpm docs:pdf         # writes docs/pdf/*.pdf
```

Uses **Google Chrome** on macOS (avoids Chromium download issues).

**If `pnpm docs:pdf` fails:**

1. Install dependencies: `pnpm install`
2. Ensure Chrome is installed, or run:
   ```bash
   node scripts/docs-to-pdf.mjs
   ```
3. **Manual fallback:** open any `.md` in Cursor → **File → Print → Save as PDF**

PDF output folder: `docs/pdf/`
