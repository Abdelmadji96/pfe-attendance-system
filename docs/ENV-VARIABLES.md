# Environment Variables Reference

All environment variables by component: **API (VPS)**, **Dashboard (Vercel)**, **Raspberry Pi**, and **routes**.

---

## Secret sync (must match)

| Secret | Must be identical in |
|--------|----------------------|
| `ENROLLMENT_DEVICE_SECRET` | VPS `apps/api/.env` ↔ Admin Pi `raspberry-pi/.env` |
| `VERIFICATION_DEVICE_SECRET` | VPS `apps/api/.env` ↔ Gate Pi `raspberry-pi/.env` |
| Postgres password | VPS `docker-compose.yml` ↔ VPS `DATABASE_URL` |

After changes: `pm2 restart pfe-api` (VPS) and `sudo systemctl restart pfe-admin` or `pfe-gate` (Pi).

---

## 1. API — VPS (`apps/api/.env`)

**File path on server:** `/opt/pfe-attendance-system/apps/api/.env`

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `postgresql://postgres:PASSWORD@localhost:5432/pfe_attendance?schema=public` | PostgreSQL connection |
| `JWT_SECRET` | Yes | long random string | Signs login JWT tokens |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiry |
| `API_PORT` | No | `4000` | HTTP listen port |
| `ENROLLMENT_DEVICE_SECRET` | Yes | random hex | Admin Pi RFID authentication |
| `VERIFICATION_DEVICE_SECRET` | Yes | random hex | Gate Pi attendance authentication |
| `FACE_EMBED_SERVICE_URL` | For face enroll | `http://100.x.x.x:5055/embed` | Admin Pi FaceNet embed server |
| `SIMILARITY_THRESHOLD` | No | `0.6` | Face match threshold (0–1) |
| `EMBEDDING_DIMENSION` | No | `512` | Must be 512 for FaceNet Pi |
| `NODE_ENV` | No | `production` | Production mode |

**Docker (`docker-compose.yml` on VPS):**

| Variable | Description |
|----------|-------------|
| `POSTGRES_DB` | `pfe_attendance` |
| `POSTGRES_USER` | `postgres` |
| `POSTGRES_PASSWORD` | Must match `DATABASE_URL` password |

---

## 2. Dashboard — Vercel

### Environment variable (Vercel UI)

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `https://pfe-attendance-system-dashboard.vercel.app` |

Do **not** add `/api` at the end.

### Routes — `apps/dashboard/vercel.json`

These are **not** env vars; they proxy browser requests to the VPS.

| Vercel path | Proxied to |
|-------------|------------|
| `/api/:path*` | `http://187.77.171.204:4000/api/:path*` |
| `/uploads/:path*` | `http://187.77.171.204:4000/uploads/:path*` |

If VPS IP changes → edit `vercel.json` → redeploy Vercel.

---

## 3. Raspberry Pi — `raspberry-pi/.env`

One file per Pi. **Admin** and **Gate** can use the same template; each runs a different script.

### API & device identity

| Variable | Admin Pi | Gate Pi | Example |
|----------|:--------:|:-------:|---------|
| `API_BASE_URL` | ✅ | ✅ | `http://187.77.171.204:4000/api` |
| `DEVICE_ID` | ✅ | — | `pi-admin-enrollment-01` |
| `ENROLLMENT_DEVICE_SECRET` | ✅ | — | same as VPS |
| `GATE_DEVICE_ID` | — | ✅ | `pi-gate-01` |
| `VERIFICATION_DEVICE_SECRET` | — | ✅ | same as VPS |
| `SCAN_DEBOUNCE_SECONDS` | ✅ | ✅ | `3` |
| `REQUEST_TIMEOUT_SECONDS` | ✅ | ✅ | `10` |

### RFID (RC522)

| Variable | Default | Notes |
|----------|---------|-------|
| `SPI_BUS` | `0` | Pi 5: often `10` |
| `SPI_DEVICE` | `0` | |

### Gate camera & face

| Variable | Gate only | Default | Notes |
|----------|:---------:|---------|-------|
| `CAMERA_INDEX` | ✅ | `0` | USB camera index |
| `CAMERA_DISPLAY_PREVIEW` | ✅ | `false` | `false` for production |
| `FACE_DETECTION_METHOD` | ✅ | `haar` | `haar` or `mtcnn` |
| `SIMILARITY_THRESHOLD` | ✅ | `0.6` | |
| `ANTI_SPOOF_ENABLED` | ✅ | `true` | Liveness check |
| `ANTI_SPOOF_DURATION_SECONDS` | ✅ | `0.3` | |

### Buzzer & LEDs (BCM GPIO)

| Variable | Default |
|----------|---------|
| `FEEDBACK_ENABLED` | `true` |
| `GREEN_LED_GPIO` | `17` |
| `RED_LED_GPIO` | `27` |
| `BUZZER_GPIO` | `22` |
| `BUZZER_SHORT_MS` | `200` |
| `BUZZER_LONG_MS` | `800` |
| `LED_HOLD_MS` | `1500` |
| `BUZZER_PASSIVE` | `true` |
| `FEEDBACK_ACTIVE_HIGH` | `true` |
| `SUCCESS_BEEP_COUNT` | `1` |
| `DENY_BEEP_COUNT` | `3` |
| `DENY_BLINK_COUNT` | `3` |
| `FEEDBACK_PULSE_GAP_MS` | `250` |

### LCD 1602 I2C

| Variable | Default | Notes |
|----------|---------|-------|
| `LCD_ENABLED` | `true` | |
| `LCD_I2C_BUS` | `1` | |
| `LCD_I2C_ADDRESS` | `39` | `63` if blank screen (0x3F) |
| `LCD_IDLE_LINE1` | `Scan RFID card` | |
| `LCD_IDLE_LINE2` | `Ready` | |
| `LCD_SUCCESS_LINE1` | `Welcome!` | Gate success |
| `LCD_ENROLL_SUCCESS_LINE1` | `Card scanned` | Admin success |
| `LCD_ENROLL_FAIL_LINE1` | `Scan failed` | Admin failure |
| `LCD_MESSAGE_HOLD_MS` | `3000` | |
| `LCD_I2C_MAPPING` | `standard` | `type2` if garbled |

---

## 4. What does NOT change when Pi moves room

| Item | Value | Changes? |
|------|-------|----------|
| VPS API URL | `http://187.77.171.204:4000/api` | No |
| Dashboard URL | Vercel `.vercel.app` | No |
| Device secrets | same strings | No |
| **Pi LAN IP** | e.g. `192.168.1.10` | **Yes** — SSH & Mac sync only |

---

## 5. Template — production Pi `.env`

```env
API_BASE_URL=http://187.77.171.204:4000/api

DEVICE_ID=pi-admin-enrollment-01
ENROLLMENT_DEVICE_SECRET=your-enrollment-secret

GATE_DEVICE_ID=pi-gate-01
VERIFICATION_DEVICE_SECRET=your-verification-secret

SCAN_DEBOUNCE_SECONDS=3
REQUEST_TIMEOUT_SECONDS=10

CAMERA_INDEX=0
CAMERA_DISPLAY_PREVIEW=false
ANTI_SPOOF_ENABLED=true

FEEDBACK_ENABLED=true
GREEN_LED_GPIO=17
RED_LED_GPIO=27
BUZZER_GPIO=22
BUZZER_PASSIVE=true
FEEDBACK_ACTIVE_HIGH=true

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
