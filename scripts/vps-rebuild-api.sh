#!/usr/bin/env bash
# Rebuild and restart API on VPS (fixes @pfe/shared module errors).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> pnpm install"
pnpm install

echo "==> build @pfe/shared"
pnpm --filter @pfe/shared run build
test -f packages/shared/dist/index.js || {
  echo "ERROR: packages/shared/dist/index.js missing after build"
  exit 1
}

echo "==> build api"
pnpm --filter api run build
test -f apps/api/dist/index.js || {
  echo "ERROR: apps/api/dist/index.js missing after build"
  exit 1
}

echo "==> restart pm2"
pm2 delete pfe-api 2>/dev/null || true
pm2 start apps/api/ecosystem.config.cjs
pm2 save

sleep 2
pm2 status
echo ""
echo "Health:"
curl -sf http://127.0.0.1:4000/api/health && echo ""
grep FACE_EMBED apps/api/.env || true
