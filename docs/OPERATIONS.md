# PFE Attendance System — Operations Guide

Complete reference for deployment, environment variables, pre-start checks, Raspberry Pi setup, and moving to a new room/area.

---

## 1. Architecture

```
┌─────────────────────┐     HTTPS      ┌──────────────────────────────┐
│  Dashboard (Vercel) │ ─────────────► │  VPS API + PostgreSQL        │
│  .vercel.app        │   proxy /api   │  187.77.171.204:4000         │
└─────────────────────┘                └──────────────┬───────────────┘
                                                      │
                         HTTP (internet)              │
              ┌───────────────────────────────────────┼───────────────────────┐
              │                                       │                       │
     ┌────────▼────────┐                    ┌─────────▼────────┐              │
     │ Admin Pi        │                    │ Gate Pi          │              │
     │ admin_enrollment│                    │ gate_attendance  │              │
     │ RFID + embed    │                    │ RFID + camera    │              │
     │ (desk)          │                    │ (classroom)      │              │
     └─────────────────┘                    └──────────────────┘              │
              Campus / room Wi‑Fi                                               │
```

| Component | Host | Role |
|-----------|------|------|
| Dashboard | Vercel | Web UI for admins |
| API + DB | Hostinger VPS | REST API, PostgreSQL, file uploads |
| Admin Pi | Raspberry Pi (desk) | RFID scan → enrollment form + FaceNet embed server |
| Gate Pi | Raspberry Pi (door) | RFID + camera → attendance check-in |

---

## 2. URLs & IPs (your production setup)

Fill in **Pi LAN IP** when you know it (`hostname -I` on the Pi).

| What | Value |
|------|--------|
| **VPS public IP** | `187.77.171.204` |
| **API direct URL** | `http://187.77.171.204:4000/api` |
| **API health** | `http://187.77.171.204:4000/api/health` |
| **Dashboard** | `https://pfe-attendance-system-dashboard.vercel.app` |
| **Dashboard API proxy** | `https://pfe-attendance-system-dashboard.vercel.app/api/health` |
| **Admin Pi LAN IP** | `192.168.1.10` (example — verify on Pi) |
| **Gate Pi LAN IP** | `192.168.1.11` (example — if separate device) |
| **Pi SSH** | `ssh admin@192.168.1.10` |
| **VPS SSH** | `ssh root@187.77.171.204` |
| **Face embed (admin Pi)** | `http://<PI_LAN_IP>:5055/embed` |

---

## 3. Environment files — where they live

| File | Machine | Purpose |
|------|---------|---------|
| `apps/api/.env` | **VPS** | API server config (DB, secrets, embed URL) |
| `docker-compose.yml` | **VPS** | Postgres password (must match `DATABASE_URL`) |
| `apps/dashboard/vercel.json` | Git → Vercel | Proxy `/api` and `/uploads` to VPS |
| Vercel env `NEXT_PUBLIC_API_URL` | **Vercel** | Dashboard → API base URL |
| `raspberry-pi/.env` | **Each Pi** | Pi → VPS API, device secrets, GPIO/LCD |
| `.env.example` / `apps/api/.env.example` | Repo templates | Copy when setting up new machine |

**Never commit real `.env` files to git.**

---

## 4. Secret sync rules (critical)

These three values must be **identical** wherever listed:

| Secret | Must match between |
|--------|-------------------|
| `ENROLLMENT_DEVICE_SECRET` | VPS `apps/api/.env` ↔ Admin Pi `raspberry-pi/.env` |
| `VERIFICATION_DEVICE_SECRET` | VPS `apps/api/.env` ↔ Gate Pi `raspberry-pi/.env` |
| Postgres password | VPS `docker-compose.yml` ↔ VPS `DATABASE_URL` in `apps/api/.env` |

After changing secrets on VPS: `pm2 restart pfe-api`  
After changing Pi `.env`: `sudo systemctl restart pfe-admin` or `pfe-gate`

---

## 5. VPS — `apps/api/.env`

**Path on server:** `/opt/pfe-attendance-system/apps/api/.env`

```env
DATABASE_URL="postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/pfe_attendance?schema=public"
JWT_SECRET="your-long-random-secret"
JWT_EXPIRES_IN="7d"
API_PORT=4000

# Must match admin Pi raspberry-pi/.env
ENROLLMENT_DEVICE_SECRET=your-enrollment-secret

# Must match gate Pi raspberry-pi/.env
VERIFICATION_DEVICE_SECRET=your-verification-secret

# Admin Pi FaceNet embed (see section 8 — Tailscale or LAN for production)
FACE_EMBED_SERVICE_URL=http://100.x.x.x:5055/embed

SIMILARITY_THRESHOLD=0.6
EMBEDDING_DIMENSION=512
NODE_ENV=production
```

### Variable reference — API

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Signs login tokens — use a long random string |
| `JWT_EXPIRES_IN` | No | Token lifetime (default `7d`) |
| `API_PORT` | No | Listen port (default `4000`) |
| `ENROLLMENT_DEVICE_SECRET` | Yes | Authenticates admin Pi RFID scans |
| `VERIFICATION_DEVICE_SECRET` | Yes | Authenticates gate Pi attendance posts |
| `FACE_EMBED_SERVICE_URL` | For face enrollment | Pi embed server URL ending in `/embed` |
| `SIMILARITY_THRESHOLD` | No | Face match threshold `0.0–1.0` (default `0.6`) |
| `EMBEDDING_DIMENSION` | No | Must be `512` for FaceNet Pi |
| `NODE_ENV` | No | Set `production` on VPS |

---

## 6. Vercel — dashboard

### Environment variable

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://pfe-attendance-system-dashboard.vercel.app` |

Do **not** add trailing `/api` — the app adds `/api/...` to paths automatically.

### `apps/dashboard/vercel.json`

Update VPS IP if it changes:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "http://187.77.171.204:4000/api/:path*" },
    { "source": "/uploads/:path*", "destination": "http://187.77.171.204:4000/uploads/:path*" }
  ]
}
```

Redeploy Vercel after changing this file.

---

## 7. Raspberry Pi — `raspberry-pi/.env`

One `.env` per Pi. **Admin desk** and **gate** use different scripts but can share the same file template.

### Production template (both Pis need API URL + secrets)

```env
# ── API (always VPS in production) ──
API_BASE_URL=http://187.77.171.204:4000/api

# ── Admin enrollment (admin_enrollment.py) ──
DEVICE_ID=pi-admin-enrollment-01
ENROLLMENT_DEVICE_SECRET=same-as-vps-api

# ── Gate attendance (gate_attendance.py) ──
GATE_DEVICE_ID=pi-gate-01
VERIFICATION_DEVICE_SECRET=same-as-vps-api

SCAN_DEBOUNCE_SECONDS=3
REQUEST_TIMEOUT_SECONDS=10

# ── Pi 5 RFID (uncomment if reads fail) ──
# SPI_BUS=10
# SPI_DEVICE=0

# ── Gate camera ──
CAMERA_INDEX=0
CAMERA_DISPLAY_PREVIEW=false
FACE_DETECTION_METHOD=haar
SIMILARITY_THRESHOLD=0.6
ANTI_SPOOF_ENABLED=true

# ── Buzzer + LEDs (BCM GPIO) ──
FEEDBACK_ENABLED=true
GREEN_LED_GPIO=17
RED_LED_GPIO=27
BUZZER_GPIO=22
BUZZER_SHORT_MS=200
BUZZER_LONG_MS=800
LED_HOLD_MS=1500
BUZZER_PASSIVE=true
FEEDBACK_ACTIVE_HIGH=true
SUCCESS_BEEP_COUNT=1
DENY_BEEP_COUNT=3
DENY_BLINK_COUNT=3
FEEDBACK_PULSE_GAP_MS=250

# ── LCD 1602 I2C ──
LCD_ENABLED=true
LCD_I2C_BUS=1
LCD_I2C_ADDRESS=39
LCD_IDLE_LINE1=Scan RFID card
LCD_IDLE_LINE2=Ready
LCD_SUCCESS_LINE1=Welcome!
LCD_ENROLL_SUCCESS_LINE1=Card scanned
LCD_ENROLL_FAIL_LINE1=Scan failed
LCD_MESSAGE_HOLD_MS=3000
LCD_I2C_MAPPING=standard
```

### Variable reference — Raspberry Pi

| Variable | Used by | Description |
|----------|---------|-------------|
| `API_BASE_URL` | Both | VPS API base, e.g. `http://187.77.171.204:4000/api` |
| `DEVICE_ID` | Admin | Enrollment device id sent to API |
| `ENROLLMENT_DEVICE_SECRET` | Admin | Must match VPS |
| `GATE_DEVICE_ID` | Gate | Gate device id sent to API |
| `VERIFICATION_DEVICE_SECRET` | Gate | Must match VPS |
| `SCAN_DEBOUNCE_SECONDS` | Both | Ignore duplicate RFID reads (seconds) |
| `REQUEST_TIMEOUT_SECONDS` | Both | HTTP timeout to VPS |
| `SPI_BUS` / `SPI_DEVICE` | Both | RC522 SPI (Pi 5 often `SPI_BUS=10`) |
| `CAMERA_INDEX` | Gate | USB camera index (`0` or `1`) |
| `CAMERA_DISPLAY_PREVIEW` | Gate | `false` for headless/production |
| `FACE_DETECTION_METHOD` | Gate | `haar` or `mtcnn` |
| `SIMILARITY_THRESHOLD` | Gate | Local face match hint (API also checks) |
| `ANTI_SPOOF_ENABLED` | Gate | Liveness check before capture |
| `ANTI_SPOOF_DURATION_SECONDS` | Gate | Liveness window (default `0.3`) |
| `FEEDBACK_ENABLED` | Both | Enable LED + buzzer |
| `GREEN_LED_GPIO` | Both | BCM pin (default `17`) |
| `RED_LED_GPIO` | Both | BCM pin (default `27`) |
| `BUZZER_GPIO` | Both | BCM pin (default `22`) |
| `BUZZER_PASSIVE` | Both | `true` for passive buzzer + PWM |
| `FEEDBACK_ACTIVE_HIGH` | Both | `false` if active-low modules |
| `LCD_ENABLED` | Both | Enable I2C LCD |
| `LCD_I2C_BUS` | Both | Usually `1` on Pi |
| `LCD_I2C_ADDRESS` | Both | `39` = 0x27, `63` = 0x3F |
| `LCD_I2C_MAPPING` | Both | `standard` or `type2` if garbled text |
| `LCD_*_LINE*` | Both | Custom LCD messages |
| `LCD_MESSAGE_HOLD_MS` | Both | How long to show result before idle |

---

## 8. Face enrollment — `FACE_EMBED_SERVICE_URL`

| Scenario | Who calls embed | URL |
|----------|-----------------|-----|
| Dashboard face photos | **VPS API** → admin Pi | Tailscale IP recommended |
| Gate attendance | **Gate Pi locally** | No embed URL needed |

**Production:** VPS cannot reach `192.168.x.x`. Options:

1. **Tailscale** (recommended): install on VPS + admin Pi → use `http://100.x.x.x:5055/embed`
2. **Skip for now:** enrollment works for RFID; face upload fails until embed is reachable

On admin Pi, `admin_enrollment.py` prints the embed URL at startup.

---

## 9. Before first start — full system checklist

### VPS (one-time)

- [ ] Docker Postgres running: `docker compose up -d`
- [ ] `apps/api/.env` configured
- [ ] `pnpm turbo build --filter=@pfe/shared --filter=api`
- [ ] `pnpm exec prisma migrate deploy`
- [ ] `pnpm exec prisma db seed` (optional demo data)
- [ ] `pm2 start dist/index.js --name pfe-api`
- [ ] `pm2 save && pm2 startup`
- [ ] Firewall: allow `22`, `80`, `443`, `4000`
- [ ] Hostinger panel: allow TCP `4000`

### Vercel (one-time)

- [ ] Project linked to GitHub, root `apps/dashboard`
- [ ] `NEXT_PUBLIC_API_URL` set
- [ ] `vercel.json` points to correct VPS IP
- [ ] Deploy succeeds, login works

### Each Raspberry Pi (one-time)

- [ ] SPI enabled: `sudo raspi-config` → SPI
- [ ] I2C enabled (LCD): `sudo raspi-config` → I2C
- [ ] `python3.10 -m venv --system-site-packages gate-env`
- [ ] `pip install -r requirements-gate.txt`
- [ ] `models/` copied (first time: `./sync-to-pi.sh --with-models`)
- [ ] `raspberry-pi/.env` configured
- [ ] `./install-systemd.sh admin` or `gate --enable --start`

---

## 10. Before each session / day — quick checklist

### Cloud (2 minutes)

```bash
# From your Mac or any machine:
curl http://187.77.171.204:4000/api/health
curl https://pfe-attendance-system-dashboard.vercel.app/api/health
```

- [ ] Both return `{"status":"ok",...}`
- [ ] Dashboard login works
- [ ] **Module + session** exists for today and **current time** (Dashboard → Modules)

### Admin Pi (enrollment desk)

```bash
ssh admin@192.168.1.10
cd ~/raspberry-pi && source gate-env/bin/activate

python admin_enrollment.py --test-connectivity
python admin_enrollment.py --test-lcd
python admin_enrollment.py --test-feedback
sudo systemctl status pfe-admin
```

- [ ] API connectivity OK
- [ ] LCD / buzzer / LED OK
- [ ] Service `active (running)` OR start manually

### Gate Pi (classroom door)

```bash
ssh admin@192.168.1.11   # gate Pi IP

cd ~/raspberry-pi && source gate-env/bin/activate

python gate_attendance.py --test-connectivity
python gate_attendance.py --test-lcd
python gate_attendance.py --test-feedback
sudo systemctl status pfe-gate
```

- [ ] API connectivity OK
- [ ] USB camera plugged in
- [ ] Service `active (running)`

### End-to-end smoke test

1. Enroll test student (RFID + 1 face photo) on dashboard
2. Ensure module session is **active now**
3. Tap same RFID at gate → green LED, LCD shows name
4. Check Dashboard → Attendance → record appears

---

## 11. All test commands

### VPS

```bash
curl http://localhost:4000/api/health
pm2 status
pm2 logs pfe-api --lines 30
docker ps
```

### Dashboard (from Mac)

```bash
curl https://pfe-attendance-system-dashboard.vercel.app/api/health

curl -X POST https://pfe-attendance-system-dashboard.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@system.com","password":"password123"}'
```

### Admin Pi

| Command | Purpose |
|---------|---------|
| `python admin_enrollment.py --test-connectivity` | VPS API reachable |
| `python admin_enrollment.py --test-lcd` | LCD test messages |
| `python admin_enrollment.py --test-feedback` | Buzzer + LEDs |
| `python admin_enrollment.py --send-test TEST123` | Fake RFID to API (no hardware) |
| `python admin_enrollment.py` | Run enrollment (manual) |
| `sudo systemctl status pfe-admin` | Systemd status |
| `journalctl -u pfe-admin -f` | Live logs |

### Gate Pi

| Command | Purpose |
|---------|---------|
| `python gate_attendance.py --test-connectivity` | VPS API reachable |
| `python gate_attendance.py --test-lcd` | LCD test messages |
| `python gate_attendance.py --test-feedback` | Buzzer + LEDs |
| `python gate_attendance.py --keyboard --no-preview` | Manual UID, no RFID |
| `python gate_attendance.py --no-preview` | Full gate loop |
| `python gate_attendance.py --no-anti-spoof` | Skip liveness (debug) |
| `sudo systemctl status pfe-gate` | Systemd status |
| `journalctl -u pfe-gate -f` | Live logs |

### Sync code from Mac to Pi

```bash
cd raspberry-pi
./sync-to-pi.sh 192.168.1.10              # code only
./sync-to-pi.sh --with-models 192.168.1.10  # include ML models
```

Then on Pi: `sudo systemctl restart pfe-admin` or `pfe-gate`

---

## 12. Moving to a new room or area

Use this when you relocate hardware or change network.

### A. Pi moved to new Wi‑Fi (same campus)

Usually **only Pi LAN IP changes**. VPS and Vercel stay the same.

1. **Find new Pi IP** (on Pi): `hostname -I`
2. **Update Mac sync script default** (optional): `PI_HOST=new.ip ./sync-to-pi.sh`
3. **Pi `.env`** — usually **no change** if `API_BASE_URL` still points to VPS:
   ```env
   API_BASE_URL=http://187.77.171.204:4000/api
   ```
4. **Re-test from Pi:**
   ```bash
   python admin_enrollment.py --test-connectivity
   # or
   python gate_attendance.py --test-connectivity
   ```
5. **Restart service:** `sudo systemctl restart pfe-admin` or `pfe-gate`
6. **Dashboard:** update **module room** if you track rooms in Master Data

### B. New gate Pi in another classroom

1. Copy/setup second Pi (sync + venv + models)
2. Use **unique** `GATE_DEVICE_ID`:
   ```env
   GATE_DEVICE_ID=pi-gate-room-B
   ```
3. Same `VERIFICATION_DEVICE_SECRET` as VPS (can share across gates)
4. `./install-systemd.sh gate --enable --start`
5. Create / assign **module** for that class group + room in dashboard

### C. VPS IP changes (rare)

Update **all** of:

| Location | What to change |
|----------|----------------|
| `apps/dashboard/vercel.json` | VPS IP in rewrites → redeploy Vercel |
| Each Pi `raspberry-pi/.env` | `API_BASE_URL` |
| Mac tests | curl URLs |

### D. Face enrollment after Pi move

If admin Pi IP changed and you use embed without Tailscale:

1. Update VPS `FACE_EMBED_SERVICE_URL` to new Pi IP (or Tailscale IP)
2. `pm2 restart pfe-api` on VPS
3. Restart `pfe-admin` on Pi

### E. Room change checklist (printable)

```
[ ] Pi powered, on Wi‑Fi
[ ] hostname -I → note new IP
[ ] curl http://187.77.171.204:4000/api/health from Pi network
[ ] --test-connectivity OK
[ ] --test-lcd OK
[ ] --test-feedback OK
[ ] Module session active for NOW
[ ] Test student enrolled with face
[ ] One gate scan → attendance recorded
[ ] systemd service enabled
```

---

## 13. systemd services

| Service | Pi | Command |
|---------|-----|---------|
| `pfe-admin` | Admin desk | `./install-systemd.sh admin --enable --start` |
| `pfe-gate` | Classroom | `./install-systemd.sh gate --enable --start` |

**Do not run both on the same Pi** (shared RFID reader).

```bash
sudo systemctl restart pfe-gate
sudo systemctl stop pfe-gate
journalctl -u pfe-gate -f
```

---

## 14. Demo login (change before real use)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@system.com` | `password123` |
| Viewer | `viewer@system.com` | `password123` |
| Enrollment Admin | `enrollment@system.com` | `password123` |

---

## 15. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Pi `401 Unauthorized` | Secret mismatch | Sync `ENROLLMENT_*` or `VERIFICATION_*` with VPS `.env`, restart API + Pi |
| Pi `Connection refused` | Wrong `API_BASE_URL` or firewall | Use VPS IP `:4000`, open port on Hostinger |
| Dashboard login fails | Vercel proxy / env | Check `NEXT_PUBLIC_API_URL`, `vercel.json` IP |
| `/api/api/...` error | Double `/api` | `NEXT_PUBLIC_API_URL` without trailing `/api` |
| RFID not read (Pi 5) | SPI bus | Set `SPI_BUS=10` in `.env` |
| Gate always denied "No module" | No active session | Add module session matching **today + current time** |
| Gate "Face not matched" | No/bad face templates | Re-enroll student with clear photos |
| Face enroll fails on dashboard | Embed unreachable | Set `FACE_EMBED_SERVICE_URL`, run `admin_enrollment.py` |
| LCD blank | Wrong address | Try `LCD_I2C_ADDRESS=63`, run `sudo i2cdetect -y 1` |
| LCD garbled text | Wrong mapping | `LCD_I2C_MAPPING=type2` |

---

## 16. Quick command cheat sheet

```bash
# ── Mac → sync Pi ──
cd raspberry-pi && ./sync-to-pi.sh 192.168.1.10

# ── VPS ──
ssh root@187.77.171.204
pm2 restart pfe-api
curl http://localhost:4000/api/health

# ── Admin Pi ──
ssh admin@192.168.1.10
sudo systemctl restart pfe-admin
journalctl -u pfe-admin -f

# ── Gate Pi ──
ssh admin@192.168.1.11
sudo systemctl restart pfe-gate
journalctl -u pfe-gate -f

# ── Health from Mac ──
curl http://187.77.171.204:4000/api/health
curl https://pfe-attendance-system-dashboard.vercel.app/api/health
```

---

## 17. File locations summary

```
VPS  /opt/pfe-attendance-system/
     ├── apps/api/.env
     ├── docker-compose.yml
     └── apps/api/uploads/          ← backups important

Vercel  Environment: NEXT_PUBLIC_API_URL
        apps/dashboard/vercel.json

Pi   ~/raspberry-pi/
     ├── .env                        ← never overwritten by sync
     ├── gate-env/                   ← Python venv
     ├── models/                     ← FaceNet + anti-spoof
     ├── sync-to-pi.sh               ← run on Mac
     └── install-systemd.sh          ← run on Pi
```
