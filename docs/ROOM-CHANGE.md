# Moving Pi to a New Room / New Wi‑Fi

When you relocate hardware, the **Pi LAN IP usually changes**. The **VPS and dashboard URLs do not**.

---

## What changes vs what stays the same

| Item | Example | Changes when moving room? |
|------|---------|---------------------------|
| VPS API | `http://187.77.171.204:4000/api` | **No** |
| Dashboard | `https://pfe-attendance-system-dashboard.vercel.app` | **No** |
| Pi `API_BASE_URL` in `.env` | VPS URL above | **No** (keep VPS IP) |
| Device secrets | `ENROLLMENT_*`, `VERIFICATION_*` | **No** |
| **Pi LAN IP** | `192.168.1.10` → `192.168.1.25` | **Yes** |
| Mac SSH / sync | `admin@192.168.1.10` | **Yes — use new IP** |

---

## Step 1 — Find the new Pi IP

You **cannot** SSH to the old IP after a network change. Use one of these:

### A. Keyboard + monitor on the Pi

```bash
hostname -I
```

First address is usually the LAN IP (e.g. `192.168.1.25`).

### B. From Mac (same Wi‑Fi)

```bash
ping raspberrypi.local
ping -c 1 raspberrypi.local | grep PING
```

### C. Router admin page

Look at **DHCP clients** / connected devices → find `raspberrypi`.

### D. Network scan (Mac)

```bash
arp -a
# Look for Raspberry Pi MAC prefix: b8:27:eb, dc:a6:32, e4:5f:01
```

---

## Step 2 — Verify SSH with new IP

```bash
ssh admin@NEW_PI_IP
```

If user is `pi`:

```bash
ssh pi@NEW_PI_IP
```

---

## Step 3 — Pi `.env` — usually NO change

Keep:

```env
API_BASE_URL=http://187.77.171.204:4000/api
```

The Pi talks to the **VPS over the internet**, not your Mac.

Only change secrets if you rotated them on the VPS.

---

## Step 4 — Re-test on Pi

**Admin Pi:**

```bash
cd ~/raspberry-pi
source gate-env/bin/activate
python admin_enrollment.py --test-connectivity
python admin_enrollment.py --test-lcd
python admin_enrollment.py --test-feedback
sudo systemctl restart pfe-admin
sudo systemctl status pfe-admin
```

**Gate Pi:**

```bash
cd ~/raspberry-pi
source gate-env/bin/activate
python gate_attendance.py --test-connectivity
python gate_attendance.py --test-lcd
python gate_attendance.py --test-feedback
sudo systemctl restart pfe-gate
sudo systemctl status pfe-gate
```

---

## Step 5 — Update Mac sync command

Always pass the **new IP** when syncing:

```bash
cd /Users/macbook/Documents/GitHub/pfe-attendance-system/raspberry-pi
./sync-to-pi.sh NEW_PI_IP
```

Or set default for one session:

```bash
PI_HOST=192.168.1.25 ./sync-to-pi.sh
```

Optional — edit `sync-to-pi.sh` default line:

```bash
PI_HOST="${PI_HOST:-192.168.1.25}"
```

---

## Step 6 — Cloud still OK (from Mac)

```bash
curl http://187.77.171.204:4000/api/health
curl https://pfe-attendance-system-dashboard.vercel.app/api/health
```

Both should return `{"status":"ok",...}`.

---

## Step 7 — Dashboard (optional)

If you track **rooms** in Master Data:

- Update module **room** assignment for the new classroom
- Ensure **module session** times match the new schedule

---

## New gate Pi in another room (second device)

1. Setup second Pi (sync + venv + models)
2. Use unique gate ID in `.env`:
   ```env
   GATE_DEVICE_ID=pi-gate-room-B
   ```
3. Same `VERIFICATION_DEVICE_SECRET` as VPS (OK to share)
4. `./install-systemd.sh gate --enable --start`
5. Note new IP for Mac sync: `./sync-to-pi.sh GATE_B_IP`

---

## Face enrollment after Pi move

If VPS `FACE_EMBED_SERVICE_URL` used Pi **LAN IP** (`192.168.x.x`), VPS cannot reach it after move.

**Fix:** Use **Tailscale** on VPS + admin Pi, or update VPS:

```bash
# On VPS
nano /opt/pfe-attendance-system/apps/api/.env
# FACE_EMBED_SERVICE_URL=http://NEW_PI_IP:5055/embed  (only if VPS can reach LAN — rare)
# Better: Tailscale IP http://100.x.x.x:5055/embed
pm2 restart pfe-api
```

---

## Printable checklist

```
[ ] Pi on new Wi‑Fi, powered on
[ ] hostname -I → write NEW_PI_IP = _______________
[ ] ssh admin@NEW_PI_IP works
[ ] API_BASE_URL still http://187.77.171.204:4000/api
[ ] --test-connectivity → OK
[ ] --test-lcd → OK
[ ] --test-feedback → OK
[ ] systemctl restart + status OK
[ ] Mac: ./sync-to-pi.sh NEW_PI_IP
[ ] Dashboard module session active now
[ ] One test scan works
```
