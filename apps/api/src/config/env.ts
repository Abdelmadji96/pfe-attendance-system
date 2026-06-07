import dotenv from "dotenv";
import path from "path";

const apiDir = path.resolve(__dirname, "../..");
const repoRoot = path.resolve(apiDir, "../..");

dotenv.config({ path: path.join(apiDir, ".env") });
dotenv.config({ path: path.join(repoRoot, ".env") });

const defaultEvaluationResultsDir = path.join(
  repoRoot,
  "raspberry-pi/evaluation/results"
);

function resolveEvaluationResultsDir(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) {
    return defaultEvaluationResultsDir;
  }
  return path.isAbsolute(value) ? value : path.join(repoRoot, value);
}

export const env = {
  PORT: parseInt(process.env.API_PORT || "4000", 10),
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  ENROLLMENT_DEVICE_SECRET:
    process.env.ENROLLMENT_DEVICE_SECRET || "change-me-in-production",
  VERIFICATION_DEVICE_SECRET:
    process.env.VERIFICATION_DEVICE_SECRET || "change-me-in-production",
  FACE_EMBED_SERVICE_URL: process.env.FACE_EMBED_SERVICE_URL || "",
  SIMILARITY_THRESHOLD: parseFloat(process.env.SIMILARITY_THRESHOLD || "0.6"),
  EMBEDDING_DIMENSION: parseInt(process.env.EMBEDDING_DIMENSION || "512", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  EVALUATION_RESULTS_DIR: resolveEvaluationResultsDir(
    process.env.EVALUATION_RESULTS_DIR
  ),
} as const;
