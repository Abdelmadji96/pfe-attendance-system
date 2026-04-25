import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const env = {
  PORT: parseInt(process.env.API_PORT || "4000", 10),
  DATABASE_URL: process.env.DATABASE_URL || "",
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  SIMILARITY_THRESHOLD: parseFloat(process.env.SIMILARITY_THRESHOLD || "0.85"),
  EMBEDDING_DIMENSION: parseInt(process.env.EMBEDDING_DIMENSION || "128", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
} as const;
