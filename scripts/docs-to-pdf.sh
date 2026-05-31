#!/usr/bin/env bash
# Generate PDF copies of docs/*.md → docs/pdf/
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is required." >&2
  exit 1
fi

echo "Generating PDFs in docs/pdf/ ..."
node scripts/docs-to-pdf.mjs
