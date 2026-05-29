# Raspberry Pi enrollment — setup checklist

Your network (update if DHCP changes):

| Device | Hostname | IP |
|--------|----------|-----|
| Mac (API) | MacBookPro | `192.168.1.5` (check with `ipconfig getifaddr en0` — DHCP may change) |
| Raspberry Pi | raspberrypi | `192.168.1.10` |

Pi SSH: `ssh admin@192.168.1.10` (password set in Raspberry Pi Imager)

---

## Part 1 — Mac (admin laptop)

### 1. Root `.env`

Copy and edit if needed:

```bash
cd /Users/macbook/Documents/GitHub/pfe-attendance-system
cp .env.example .env
```

Ensure these match `raspberry-pi/.env`:

```env
API_PORT=4000
ENROLLMENT_DEVICE_SECRET=change-me-in-production
```

### 2. Start API + dashboard

```bash
pnpm install
pnpm dev
```

### 3. Open enrollment in browser

- URL: `http://localhost:3000` (or port shown in terminal)
- Log in with enrollment permission
- Go to **Enrollment** → **step 1** (RFID Card UID field visible)

### 4. Confirm API from Mac

```bash
curl http://localhost:4000/api/health
```

---

## Part 2 — Copy project to Pi (once)

On **Mac**:

```bash
scp -r /Users/macbook/Documents/GitHub/pfe-attendance-system admin@192.168.1.10:~/
```

---

## Part 3 — Pi software setup (once)

### 1. SSH into Pi

On **Mac**:

```bash
ssh admin@192.168.1.10
```

### 2. Enable SPI (RC522)

```bash
sudo raspi-config
```

**Interface Options → SPI → Enable** → Finish → reboot:

```bash
sudo reboot
```

SSH again, verify:

```bash
ls /dev/spidev*
```

### 3. Python environment

```bash
cd ~/pfe-attendance-system/raspberry-pi
python3 -m venv env
source env/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Environment file

`.env` is already configured for `API_BASE_URL=http://192.168.1.7:4000/api`.

If your Mac IP changes, on Mac run:

```bash
ipconfig getifaddr en0
```

Update on Pi:

```bash
nano ~/pfe-attendance-system/raspberry-pi/.env
```

Ensure `ENROLLMENT_DEVICE_SECRET` matches the Mac root `.env`.

---

## Part 4 — Connectivity tests (Pi)

```bash
cd ~/pfe-attendance-system/raspberry-pi
source env/bin/activate

curl http://192.168.1.7:4000/api/health
python enrollment_rfid_sender.py --test-connectivity
python enrollment_rfid_sender.py --send-test TEST123456
```

**Expected:** Dashboard RFID field shows `TEST123456` within ~1 second.

---

## Part 5 — Hardware + live scans

Wire RC522 (3.3V only) — see [README.md](./README.md) section A.

```bash
source env/bin/activate
python enrollment_rfid_sender.py
```

Tap card → UID appears on dashboard Enrollment step 1.

---

## Raspberry Pi 5 (RC522)

Pi 5 requires **`python3-rpi-lgpio`** from apt (not `pip install RPi.GPIO`):

```bash
sudo apt update
sudo apt install -y python3-rpi-lgpio
cd ~/raspberry-pi
rm -rf env
python3 -m venv --system-site-packages env
source env/bin/activate
pip install -r requirements.txt
pip uninstall RPi.GPIO -y
python enrollment_rfid_sender.py
```

If cards are not detected, set in `.env`: `SPI_BUS=10` and `SPI_DEVICE=0`.

---

## Daily use

| Where | Command |
|-------|---------|
| Mac | `pnpm dev` + open Enrollment step 1 |
| Pi | `ssh admin@192.168.1.10` → `cd ~/pfe-attendance-system/raspberry-pi` → `source env/bin/activate` → `python enrollment_rfid_sender.py` |

---

## If IPs change

Router DHCP may assign new IPs after reboot. Check `http://192.168.1.1` → DHCP Clients, then update:

- Pi `.env` → `API_BASE_URL` (Mac IP)
- SSH → `ssh admin@NEW_PI_IP`

---

## Router shows `raspberrypi` but ping fails (100% loss)

The D-Link DHCP list can keep a **stale lease** for up to 24 hours after the Pi was last online.

| Symptom | Likely cause |
|---------|----------------|
| Router lists `raspberrypi` @ `.10`, **ping 100% loss** | Pi is **off / asleep / not on Wi‑Fi**; lease is old |
| **Ping OK**, `ssh` **Connection refused** | Pi is online; **SSH disabled** or not started |
| **Ping OK**, `ssh` works | Normal — use `scp` |

**Prove stale lease:** Power **off** Pi → router **Refresh** → if `raspberrypi` **disappears**, the listing was real but Pi is off now. Power on → wait 5 min → Refresh → ping the **new** lease time / same IP.

**Fix:**

1. Pi on **5V 2A+ charger** (not laptop USB only).  
2. Wait **5 minutes** after green LED.  
3. Router **Refresh** → confirm `raspberrypi` **Expires In** countdown is updating.  
4. `ping -c 3 192.168.1.10` → need replies before `ssh`/`scp`.  
5. `ssh admin@192.168.1.10` → if refused but ping OK: re-flash Imager with **Enable SSH: Yes**.

## SSH: `Connection refused` (ping works)

1. Re-flash SD with Imager **Enable SSH: Yes**, or on Pi with monitor:  
   `sudo apt install -y openssh-server && sudo systemctl enable --now ssh`  
2. Retry: `ssh admin@192.168.1.10`

## SSH / scp still blocked

Copy via **USB stick** to `~/pfe-attendance-system` on the Pi, or fix SSH first.

---

## Dashboard: no "Start Scan" button

This is normal. The Pi script sends UIDs to the API; the Enrollment page **polls automatically** every second. Run on the Pi:

```bash
python enrollment_rfid_sender.py --send-test TEST123456
```

The UID field fills in; then click **Next** (bottom right, enabled when UID is not empty).
