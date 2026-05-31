# Step 2 — Gate Pi (Classroom Attendance)

RFID + USB camera + FaceNet at the classroom door. Records attendance via VPS API.

---

## Hardware role

| Item | Purpose |
|------|---------|
| RC522 RFID | Student taps card |
| USB camera | Face capture + anti-spoof |
| Green/Red LED + Buzzer | Access granted / denied |
| LCD 1602 I2C | Welcome or denial reason |

**Script:** `gate_attendance.py`  
**Systemd service:** `pfe-gate`

---

## Required `.env` (minimum)

```env
API_BASE_URL=http://187.77.171.204:4000/api
GATE_DEVICE_ID=pi-gate-01
VERIFICATION_DEVICE_SECRET=<same as VPS apps/api/.env>
CAMERA_DISPLAY_PREVIEW=false
```

Full list: [ENV-VARIABLES.md](./ENV-VARIABLES.md)

---

## One-time setup

### On Mac — copy code + models

```bash
cd /Users/macbook/Documents/GitHub/pfe-attendance-system/raspberry-pi

# First time:
./sync-to-pi.sh --with-models <GATE_PI_LAN_IP>

# Later:
./sync-to-pi.sh <GATE_PI_LAN_IP>
```

### On Pi — Python environment

```bash
sudo apt update
sudo apt install -y python3.10 python3.10-venv python3-rpi-lgpio i2c-tools

cd ~/raspberry-pi
python3.10 -m venv --system-site-packages gate-env
source gate-env/bin/activate
pip install --upgrade pip
pip install -r requirements-gate.txt

nano .env   # set API_BASE_URL and VERIFICATION_DEVICE_SECRET
```

Plug in **USB camera** before starting.

### Auto-start on boot

```bash
cd ~/raspberry-pi
chmod +x install-systemd.sh
./install-systemd.sh gate --enable --start
```

---

## Dashboard requirements (before gate works)

- [ ] Student **enrolled** (RFID + face photos on dashboard)
- [ ] **Module** created for their class group
- [ ] **Session** for **today** with **current time** inside start–end window

Example: session `08:00–10:00` → gate only works between 08:00 and 10:00.

---

## Before each class — test commands

Run on the **Gate Pi**:

```bash
ssh admin@<GATE_PI_LAN_IP>
cd ~/raspberry-pi
source gate-env/bin/activate
```

| # | Command | Expected |
|---|---------|----------|
| 1 | `python gate_attendance.py --test-connectivity` | OK 200 |
| 2 | `python gate_attendance.py --test-lcd` | LCD test messages |
| 3 | `python gate_attendance.py --test-feedback` | Green then red test |
| 4 | `python gate_attendance.py --keyboard --no-preview` | Type enrolled UID manually |

**Service check:**

```bash
sudo systemctl status pfe-gate
journalctl -u pfe-gate -f
```

---

## Start / stop / restart

```bash
# Manual (production — no camera window)
source gate-env/bin/activate
python gate_attendance.py --no-preview

# Systemd
sudo systemctl start pfe-gate
sudo systemctl stop pfe-gate
sudo systemctl restart pfe-gate
sudo systemctl status pfe-gate
```

---

## Gate flow (what happens on scan)

1. Student taps RFID
2. Anti-spoof + camera capture
3. FaceNet 512-d embedding on Pi
4. `POST /api/verification/gate-verify` → VPS
5. **Success:** green LED, beep, LCD `Welcome! / Name`
6. **Denied:** red LED, 3 beeps, LCD reason

---

## LCD messages

| LCD line 1 | LCD line 2 | Meaning |
|------------|------------|---------|
| Scan RFID card | Ready | Waiting |
| Welcome! | Student name | Check-in OK |
| Access Denied | Face not matched | Face ≠ enrolled |
| Access Denied | ID not matched | Unknown RFID |
| Access Denied | No module now | No active session |
| Access Denied | Already checked in | Duplicate today |

---

## Success indicators

- Green LED + 1 beep
- LCD shows student name
- Dashboard → **Attendance** → new record

---

## Common errors

| Error | Fix |
|-------|-----|
| `401 Unauthorized` | `VERIFICATION_DEVICE_SECRET` mismatch |
| `No module now` | Create module session for current time |
| `Face not matched` | Re-enroll student with clear face photos |
| `ID not matched` | Student not enrolled or wrong card |
| Camera fails | Try `CAMERA_INDEX=1`, check `ls /dev/video*` |

---

## Debug flags

```bash
python gate_attendance.py --no-preview          # normal production
python gate_attendance.py --keyboard            # no RFID hardware
python gate_attendance.py --no-anti-spoof       # skip liveness
python gate_attendance.py --no-lcd              # disable LCD
python gate_attendance.py --no-feedback         # disable LED/buzzer
```

---

## After code update from Mac

```bash
# Mac
./sync-to-pi.sh <GATE_PI_LAN_IP>

# Pi
sudo systemctl restart pfe-gate
```

**Do not run `pfe-gate` and `pfe-admin` on the same Pi at the same time** (shared RFID reader).
