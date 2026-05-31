# Single Pi — Mobile Deployment

**1 Pi · 1 RFID · 2 modes** — move between rooms; SSH and VPS URLs stay the same.

| | URL |
|--|-----|
| **Dashboard** | https://pfe-attendance-system-dashboard.vercel.app |
| **API (VPS)** | `http://187.77.171.204:4000/api` |

---

## Connect

```bash
ssh admin@raspberrypi.local    # password: Admin123
cd ~/raspberry-pi
source gate-env/bin/activate
```

First time only: `./setup-gate-env.sh`

Sync code from Mac when needed:

```bash
cd /Users/macbook/Documents/GitHub/pfe-attendance-system/raspberry-pi
./sync-to-pi.sh raspberrypi.local
```

---

## `.env` (set once on Pi)

```env
API_BASE_URL=http://187.77.171.204:4000/api
DEVICE_ID=pi-admin-enrollment-01
GATE_DEVICE_ID=pi-gate-01
ENROLLMENT_DEVICE_SECRET=<same as VPS>
VERIFICATION_DEVICE_SECRET=<same as VPS>
SPI_BUS=0
SPI_DEVICE=0
```

Never point `API_BASE_URL` at your Mac. SPI bus is auto-probed — use `0` on most Pi 5 boards.

---

## Test everything (run before enrollment or gate)

```bash
cd ~/raspberry-pi && source gate-env/bin/activate

python3 admin_enrollment.py --test-rfid          # RFID — must show version 0x91 + Card detected
python3 gate_attendance.py --test-feedback       # green beep → red blink
python3 gate_attendance.py --test-lcd            # cycles messages
python3 gate_attendance.py --test-connectivity   # OK: 200
```

| Test | Pass |
|------|------|
| **RFID** | `version 0x91` and `Card detected: …` |
| **Feedback** | Green + beep, then red ×3 |
| **LCD** | Text cycles on display |
| **API** | `OK: 200` |

**RFID fails?** Check wiring (3.3V, not 5V), `ls /dev/spidev*`, set `SPI_BUS=0` in `.env`. Buzzer fails? `sudo apt install python3-rpi-lgpio` + `./setup-gate-env.sh` + reboot.

---

## Step 1 — Enrollment (admin desk)

**Browser:** [Dashboard → Enrollment](https://pfe-attendance-system-dashboard.vercel.app/) → step 1 (RFID field visible).

**Pi:**

```bash
cd ~/raspberry-pi && source gate-env/bin/activate
./start-enrollment.sh
```

Tap card → terminal shows `Card detected` + `SUCCESS: 200` → dashboard UID auto-fills.

**Ctrl+C** to stop.

> **Trixie (Python 3.13):** RFID-only (no face embed). Face photos need Pi OS Bookworm.

---

## Step 2 — Gate (classroom)

**Pi:**

```bash
cd ~/raspberry-pi && source gate-env/bin/activate
./start-gate.sh
```

Student taps RFID → camera + face verify → attendance on VPS.

**Ctrl+C** to stop.

> **Trixie:** full gate needs Bookworm + FaceNet. On Trixie use `./start-gate.sh --test-feedback` etc. until ML stack is available.

---

## After moving room / Wi‑Fi

Keep `.env` as-is. Reconnect Pi to Wi‑Fi, SSH in, run `--test-connectivity`. If `OK: 200` → run Step 1 or Step 2.

---

## Quick reference

| Task | Command |
|------|---------|
| SSH | `ssh admin@raspberrypi.local` |
| Activate | `cd ~/raspberry-pi && source gate-env/bin/activate` |
| Test RFID | `python3 admin_enrollment.py --test-rfid` |
| **Enrollment** | `./start-enrollment.sh` |
| **Gate** | `./start-gate.sh` |
| Sync from Mac | `./sync-to-pi.sh raspberrypi.local` |

**Related:** [SYSTEM-TECHNICAL-SPECIFICATION.md](./SYSTEM-TECHNICAL-SPECIFICATION.md) · [OPERATIONS.md](./OPERATIONS.md)
