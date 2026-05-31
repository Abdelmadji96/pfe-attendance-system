# Step 1 — Admin Pi (Enrollment Desk)

RFID scan auto-fills the dashboard Enrollment page. Optional: FaceNet embed server for face photos.

---

## Hardware role

| Item | Purpose |
|------|---------|
| RC522 RFID | Read card UID → send to API |
| Green/Red LED + Buzzer | Success / error feedback |
| LCD 1602 I2C | Show scanned UID |
| (Optional) FaceNet embed | Port `5055` for dashboard face enrollment |

**Script:** `admin_enrollment.py`  
**Systemd service:** `pfe-admin`

---

## Required `.env` (minimum)

```env
API_BASE_URL=http://187.77.171.204:4000/api
DEVICE_ID=pi-admin-enrollment-01
ENROLLMENT_DEVICE_SECRET=<same as VPS apps/api/.env>
```

Full list: [ENV-VARIABLES.md](./ENV-VARIABLES.md)

---

## One-time setup

### On Mac — copy code to Pi

```bash
cd /Users/macbook/Documents/GitHub/pfe-attendance-system/raspberry-pi

# First time (includes ML models):
./sync-to-pi.sh --with-models <PI_LAN_IP>

# Later updates:
./sync-to-pi.sh <PI_LAN_IP>
```

Example: `./sync-to-pi.sh 192.168.1.10`

### On Pi — Python environment

```bash
sudo apt update
sudo apt install -y python3.10 python3.10-venv python3-rpi-lgpio i2c-tools

cd ~/raspberry-pi
python3.10 -m venv --system-site-packages gate-env
source gate-env/bin/activate
pip install --upgrade pip
pip install -r requirements-gate.txt

cp .env.example .env
nano .env   # set API_BASE_URL and ENROLLMENT_DEVICE_SECRET
```

### Enable SPI + I2C

```bash
sudo raspi-config
# Interface Options → SPI → Enable
# Interface Options → I2C → Enable
sudo reboot
```

### Auto-start on boot

```bash
cd ~/raspberry-pi
chmod +x install-systemd.sh
./install-systemd.sh admin --enable --start
```

---

## Before each enrollment session — test commands

Run on the **Admin Pi**:

```bash
ssh admin@<PI_LAN_IP>
cd ~/raspberry-pi
source gate-env/bin/activate
```

| # | Command | Expected |
|---|---------|----------|
| 1 | `python admin_enrollment.py --test-connectivity` | `API is reachable` / OK 200 |
| 2 | `python admin_enrollment.py --test-lcd` | LCD cycles test messages |
| 3 | `python admin_enrollment.py --test-feedback` | Green beep, then red blinks |
| 4 | `python admin_enrollment.py --send-test TEST123456` | SUCCESS 200 |

**Dashboard test:** Open Enrollment → Step 1 → field shows `TEST123456` within ~1 second.

**Service check:**

```bash
sudo systemctl status pfe-admin
journalctl -u pfe-admin -f
```

---

## Start / stop / restart

```bash
# Manual run
source gate-env/bin/activate
python admin_enrollment.py

# Systemd
sudo systemctl start pfe-admin
sudo systemctl stop pfe-admin
sudo systemctl restart pfe-admin
sudo systemctl status pfe-admin
```

---

## Success indicators

| Signal | Meaning |
|--------|---------|
| Terminal: `SUCCESS: 200 OK` | UID sent to VPS |
| Green LED + 1 beep | Hardware success |
| LCD line 1: `Card scanned` | |
| LCD line 2: RFID UID | e.g. `803464938133` |
| Dashboard RFID field filled | Enrollment step 1 OK |

---

## Common errors

| Error | Fix |
|-------|-----|
| `401 Unauthorized` | `ENROLLMENT_DEVICE_SECRET` mismatch → sync with VPS, `pm2 restart pfe-api` |
| `Connection refused` | Wrong `API_BASE_URL` → use VPS IP `187.77.171.204:4000` |
| RFID not detected (Pi 5) | Add `SPI_BUS=10` to `.env` |
| LCD blank | Try `LCD_I2C_ADDRESS=63` |

---

## After code update from Mac

```bash
# Mac
./sync-to-pi.sh <PI_LAN_IP>

# Pi
sudo systemctl restart pfe-admin
```
