# Raspberry Pi RFID Enrollment Sender

This folder contains a standalone Python script that reads RFID card UIDs from an **RC522** module on a Raspberry Pi and sends them to the attendance system API. When an admin has the dashboard **Enrollment** page open (`/enrollment`, step 1 — RFID Card UID), the scanned UID appears automatically in the input field within about one second.

## How it works

1. Pi reads a card UID via SPI (RC522).
2. Pi sends `POST /api/enrollment/rfid-scan` with `uid` and `deviceId`.
3. API stores the latest scan in memory.
4. Dashboard polls `GET /api/enrollment/rfid-latest` every second and fills the RFID field.

---

## A. Hardware wiring (RC522 → Raspberry Pi)

| RC522 pin | Raspberry Pi |
|-----------|----------------|
| SDA / SS  | GPIO 8  (physical pin 24) |
| SCK       | GPIO 11 (physical pin 23) |
| MOSI      | GPIO 10 (physical pin 19) |
| MISO      | GPIO 9  (physical pin 21) |
| IRQ       | *not connected* |
| GND       | GND (physical pin 6) |
| RST       | GPIO 25 (physical pin 22) |
| 3.3V      | 3.3V (physical pin 1) |

**Warning:** Do **not** connect the RC522 to **5V**. Use **3.3V only**. Connecting to 5V can damage the module or the Pi.

---

## B. Enable SPI

```bash
sudo raspi-config
```

Go to **Interface Options → SPI → Enable**, then reboot:

```bash
sudo reboot
```

After reboot, verify SPI devices exist:

```bash
ls /dev/spidev*
```

Expected output:

```
/dev/spidev0.0
/dev/spidev0.1
```

---

## C. Setup Python environment

From the repo root:

```bash
cd raspberry-pi
python3 -m venv env
source env/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

---

## D. Configure environment

```bash
cp .env.example .env
nano .env
```

Example `.env`:

```env
API_BASE_URL=http://192.168.1.50:4000/api
DEVICE_ID=pi-admin-enrollment-01
ENROLLMENT_DEVICE_SECRET=change-me-in-production
SCAN_DEBOUNCE_SECONDS=3
REQUEST_TIMEOUT_SECONDS=5
```

### Important settings

- **`API_BASE_URL`** — Use your **admin laptop’s LAN IP**, not `localhost`. On the Pi, `localhost` means the Raspberry Pi itself, not your laptop.
- **`ENROLLMENT_DEVICE_SECRET`** — Must be **exactly the same** as `ENROLLMENT_DEVICE_SECRET` in the API server `.env` (repo root or `apps/api`). The Pi sends it in the `X-Enrollment-Device-Secret` header. If they differ, scans return HTTP 401.

---

## E. Find admin laptop IP

**Windows:**

```cmd
ipconfig
```

Look for **IPv4 Address** on your Wi‑Fi or Ethernet adapter (e.g. `192.168.1.50`).

**Linux / macOS:**

```bash
ip addr
```

or:

```bash
ifconfig
```

---

## F. Make backend reachable from Raspberry Pi

On the **admin laptop**:

1. Start the API (e.g. `pnpm dev` from the monorepo root).
2. Ensure the API listens on all interfaces — Node’s default `app.listen(port)` usually accepts LAN connections. If the Pi still cannot connect, bind explicitly to `0.0.0.0` in the API server.
3. Allow **port 4000** through the laptop firewall.
4. Put the Pi and laptop on the **same Wi‑Fi / network**.

Set in Pi `.env`:

```env
API_BASE_URL=http://ADMIN_LAPTOP_IP:4000/api
```

---

## G. Connectivity tests

Run these **on the Raspberry Pi** (with venv activated).

### 1. curl health check

```bash
curl http://ADMIN_LAPTOP_IP:4000/api/health
```

Expected: JSON like `{"status":"ok","timestamp":"..."}`.

### 2. Script connectivity test

```bash
python enrollment_rfid_sender.py --test-connectivity
```

Expected: `API is reachable`.

### 3. Fake RFID scan (no hardware)

Open the dashboard **Enrollment** page on the laptop (step 1 — RFID Card UID), logged in as a user with enrollment access.

On the Pi:

```bash
python enrollment_rfid_sender.py --send-test TEST123456
```

**Expected:** Within ~1 second, the **RFID Card UID** field on the dashboard shows `TEST123456`.

### 4. Real RFID scan

```bash
python enrollment_rfid_sender.py
```

Expected logs:

```
Waiting for RFID card...
Card detected: <UID>
Request URL: http://...
SUCCESS: 200 OK
Sent successfully.
```

---

## H. Run in production

Always activate the venv first:

```bash
cd raspberry-pi
source env/bin/activate
python enrollment_rfid_sender.py
```

Optional: run at boot with `systemd` (not included here).

---

## I. Troubleshooting

### Connection refused

- API not running on the laptop.
- Wrong `API_BASE_URL` (typo or wrong IP).
- API only bound to `127.0.0.1` — use `0.0.0.0`.
- Firewall blocking port 4000.

### Timeout

- Pi and laptop on different networks.
- Wrong laptop IP.
- Laptop asleep or Wi‑Fi isolation enabled.

### No `/dev/spidev*`

- Enable SPI in `raspi-config` and reboot.

### ModuleNotFoundError (mfrc522, spidev, rpi-lgpio)

- Activate venv: `source env/bin/activate`
- Install: `pip install -r requirements.txt`
- Run on actual Raspberry Pi OS (not a Mac/PC without GPIO).
- **Pi 5:** use `rpi-lgpio` (included in requirements.txt), not `RPi.GPIO`
- **Pi 4:** if needed: `pip install RPi.GPIO` instead of `rpi-lgpio`

### Permission denied (GPIO / SPI)

Try:

```bash
sudo env/bin/python enrollment_rfid_sender.py
```

Or add your user to groups and reboot:

```bash
sudo usermod -aG gpio,spi $USER
sudo reboot
```

### HTTP 401 Unauthorized

- `ENROLLMENT_DEVICE_SECRET` in `raspberry-pi/.env` does not match the API `.env`.
- Restart the API after changing the secret.

### Raspberry Pi 5: `Cannot determine SOC peripheral base address`

Pi 5 does **not** support `pip install RPi.GPIO`. Use the system package instead:

```bash
sudo apt update
sudo apt install -y python3-rpi-lgpio
sudo apt remove python3-rpi.gpio -y   # optional, removes broken system GPIO

cd ~/raspberry-pi
deactivate 2>/dev/null || true
rm -rf env
python3 -m venv --system-site-packages env
source env/bin/activate
pip install -r requirements.txt
pip uninstall RPi.GPIO -y               # must not use pip RPi.GPIO in venv

python enrollment_rfid_sender.py
```

If `pip install rpi-lgpio` fails with **swig not found**:

```bash
sudo apt install -y swig python3-rpi-lgpio
```

Use **`apt install python3-rpi-lgpio`**, not pip, when possible.

If the reader initializes but never detects cards, add to `.env`:

```env
SPI_BUS=10
SPI_DEVICE=0
```

### RFID does not read

- Check wiring (especially **3.3V**, GND, SDA, RST).
- SPI enabled and `/dev/spidev0.0` exists.
- Hold card flat and close to the antenna (1–3 cm).
- Avoid metal surfaces under the reader.

### Dashboard field does not update

- Enrollment page open on **step 1** (RFID scan step).
- Logged in with enrollment permission.
- `--send-test` succeeds (200) from the Pi.
- API and dashboard both running; same API the Pi targets.

---

## CLI reference

| Command | Description |
|---------|-------------|
| `python enrollment_rfid_sender.py` | Read cards and send UIDs |
| `python enrollment_rfid_sender.py --test-connectivity` | Test `GET /api/health` |
| `python enrollment_rfid_sender.py --send-test TEST123456` | Send fake UID |

From the monorepo root (optional):

```bash
pnpm pi:rfid:test
pnpm pi:rfid:send-test
```
