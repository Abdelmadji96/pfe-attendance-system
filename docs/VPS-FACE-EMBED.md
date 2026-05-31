# VPS — Face embed service (Option A)

Run FaceNet on the **same VPS** as the production API (`187.77.171.204`) so dashboard enrollment can compute face embeddings.

---

## 1. Clone the project on the VPS

In your Hostingervps browser terminal (or SSH as `root`):

```bash
apt-get update && apt-get install -y git
mkdir -p /opt && cd /opt
git clone https://github.com/Abdelmadji96/pfe-attendance-system.git
cd pfe-attendance-system/raspberry-pi
chmod +x setup-vps-embed.sh install-vps-embed-systemd.sh
```

---

## 2. Install Python + FaceNet

```bash
./setup-vps-embed.sh
```

This creates `embed-env/` and installs TensorFlow (x86) + `keras-facenet`.  
First run may take **5–15 minutes** (large downloads).

---

## 3. Run as a systemd service (recommended)

```bash
./install-vps-embed-systemd.sh --enable --start
curl -s http://127.0.0.1:5055/health
```

Expected: `{"status": "ok", "model": "keras-facenet"}`

---

## 4. Point the API at the embed service

Find where the API `.env` lives:

```bash
ss -tlnp | grep 4000
# or
find /opt /root /home -name '.env' 2>/dev/null | xargs grep -l FACE_EMBED 2>/dev/null
```

Edit that file and set:

```env
FACE_EMBED_SERVICE_URL=http://127.0.0.1:5055/embed
```

Restart the API after changing `.env`:

```bash
cd /opt/pfe-attendance-system
./scripts/vps-rebuild-api.sh
```

Or manually:

```bash
pnpm install
pnpm --filter @pfe/shared run build
pnpm --filter api run build
pm2 delete pfe-api 2>/dev/null || true
pm2 start apps/api/ecosystem.config.cjs
pm2 save
```

If PM2 logs show `Cannot find module .../packages/shared/src/enums`, the shared package was not built — run the rebuild script above.

Verify from the VPS:

```bash
curl -s http://127.0.0.1:5055/health
curl -s http://127.0.0.1:4000/api/health
```

After redeploying the API, `/api/health` includes `faceEmbedReachable`. It must be `true` for dashboard enrollment to work.

**Common mistake:** `curl http://127.0.0.1:5055/health` works in SSH, but enrollment still fails because the **API process** still has the old `FACE_EMBED_SERVICE_URL` (e.g. `http://192.168.1.10:5055/embed`) and was not restarted. Five images × ~11s timeout ≈ **55 seconds** then `fetch failed`.

If the API runs in **Docker**, `127.0.0.1` inside the container is not the host embed server — use `http://host.docker.internal:5055/embed` or the host’s LAN IP instead.

---

## 5. Retry dashboard enrollment

Open the enrollment page, complete steps 1–5, and submit again.

If a user was created earlier without face templates, delete that user in the dashboard or re-upload faces for their user ID.

---

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| `cd raspberry-pi: No such file` | Clone repo to `/opt/pfe-attendance-system` (step 1) |
| `embed-env not found` | Run `./setup-vps-embed.sh` |
| `curl 127.0.0.1:5055/health` fails | `journalctl -u pfe-face-embed -n 50 --no-pager` |
| Still `fetch failed` on enroll | API not restarted, or `.env` still has `192.168.x.x` |
| TensorFlow install error on Python 3.13 | Use 3.12: `apt install python3.12 python3.12-venv` and edit `setup-vps-embed.sh` to prefer 3.12 |

---

## Security note

The embed service binds to **127.0.0.1** only (not public internet). Only the API on the same machine should call it.
