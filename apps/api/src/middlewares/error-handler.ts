import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/api-error";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const fields = (err.meta?.target as string[] | undefined)?.join(", ") || "record";
      res.status(409).json({
        success: false,
        message: `Already exists (${fields}). Use another email, student ID, or RFID card.`,
      });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ success: false, message: "Related record not found" });
      return;
    }
  }

  const prismaMsg = err.message || "";
  if (prismaMsg.includes("RoleName") && prismaMsg.includes("STUDENT")) {
    res.status(500).json({
      success: false,
      message:
        "Database needs migration for STUDENT role. On VPS: cd apps/api && pnpm exec prisma migrate deploy && pm2 restart pfe-api",
    });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
}
