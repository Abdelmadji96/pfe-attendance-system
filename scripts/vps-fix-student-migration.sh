#!/usr/bin/env bash
# Fix P3009 failed migration 20260531130000_add_student_role on VPS.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="${ROOT}/apps/api"

cd "$API_DIR"

echo "==> Mark failed migration as rolled back (if needed)"
pnpm exec prisma migrate resolve --rolled-back 20260531130000_add_student_role 2>/dev/null || true

echo "==> Apply migrations"
pnpm exec prisma migrate deploy

echo "==> Regenerate client"
pnpm exec prisma generate

echo "==> Verify STUDENT role"
pnpm exec prisma db execute --stdin <<'SQL'
SELECT name FROM roles WHERE name = 'STUDENT';
SQL

echo ""
echo "Done. Restart API: pm2 restart pfe-api"
