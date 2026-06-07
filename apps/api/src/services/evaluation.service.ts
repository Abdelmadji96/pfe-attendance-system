import fs from "fs";
import path from "path";
import { env } from "../config/env";
import type { EvaluationResultDto, EvaluationSummaryDto } from "@pfe/shared";

const FACE_FILE = "face_metrics.json";
const ANTI_SPOOF_FILE = "anti_spoof_metrics.json";

function readJsonFile(filePath: string): EvaluationResultDto | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as EvaluationResultDto;
  } catch {
    return null;
  }
}

function latestMtime(dir: string, files: string[]): Date | null {
  let latest: Date | null = null;

  for (const file of files) {
    const full = path.join(dir, file);
    if (!fs.existsSync(full)) continue;
    const mtime = fs.statSync(full).mtime;
    if (!latest || mtime > latest) {
      latest = mtime;
    }
  }

  return latest;
}

export const evaluationService = {
  getSummary(): EvaluationSummaryDto {
    const resultsDir = path.resolve(env.EVALUATION_RESULTS_DIR);
    const facePath = path.join(resultsDir, FACE_FILE);
    const antiSpoofPath = path.join(resultsDir, ANTI_SPOOF_FILE);
    const latest = latestMtime(resultsDir, [FACE_FILE, ANTI_SPOOF_FILE]);

    return {
      faceRecognition: readJsonFile(facePath),
      antiSpoof: readJsonFile(antiSpoofPath),
      resultsDir,
      updatedAt: latest ? latest.toISOString() : null,
    };
  },
};
