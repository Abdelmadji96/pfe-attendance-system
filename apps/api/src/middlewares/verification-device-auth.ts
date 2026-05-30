import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { ApiError } from "../utils/api-error";

export function verificationDeviceAuth(req: Request, _res: Response, next: NextFunction) {
  const secret = env.VERIFICATION_DEVICE_SECRET;
  if (!secret) {
    next(ApiError.internal("Verification device secret is not configured"));
    return;
  }

  const provided = req.headers["x-verification-device-secret"];
  if (!provided || provided !== secret) {
    next(ApiError.unauthorized("Invalid verification device secret"));
    return;
  }

  next();
}
