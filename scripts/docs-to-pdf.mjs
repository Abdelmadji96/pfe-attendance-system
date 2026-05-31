#!/usr/bin/env node
/**
 * Convert docs/*.md → docs/pdf/*.pdf
 * Uses system Google Chrome on macOS to avoid Chromium download issues.
 */
import { mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mdToPdf } from "md-to-pdf";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DOCS = join(ROOT, "docs");
const OUT = join(DOCS, "pdf");

const FILES = [
  "README.md",
  "OPERATIONS.md",
  "ENV-VARIABLES.md",
  "ADMIN-PI.md",
  "GATE-PI.md",
  "ROOM-CHANGE.md",
];

const CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
];

function findChrome() {
  for (const p of CHROME_PATHS) {
    if (existsSync(p)) return p;
  }
  return null;
}

const chrome = findChrome();
const launchOptions = chrome
  ? { executablePath: chrome, args: ["--no-sandbox", "--disable-setuid-sandbox"] }
  : { args: ["--no-sandbox", "--disable-setuid-sandbox"] };

if (chrome) {
  console.log(`Using browser: ${chrome}`);
} else {
  console.log("No system Chrome found — md-to-pdf will use bundled Chromium (first run may be slow).");
}

mkdirSync(OUT, { recursive: true });

let failed = 0;

for (const file of FILES) {
  const src = join(DOCS, file);
  const dest = join(OUT, file.replace(/\.md$/i, ".pdf"));

  if (!existsSync(src)) {
    console.warn(`Skip missing: ${file}`);
    continue;
  }

  process.stdout.write(`  ${file} → pdf/${file.replace(/\.md$/i, ".pdf")} ... `);

  try {
    await mdToPdf({ path: src }, { dest, launch_options: launchOptions });
    console.log("OK");
  } catch (err) {
    failed += 1;
    console.log("FAILED");
    console.error(err instanceof Error ? err.message : err);
  }
}

console.log(failed === 0 ? `\nDone. PDFs in docs/pdf/` : `\n${failed} file(s) failed.`);
process.exit(failed > 0 ? 1 : 0);
