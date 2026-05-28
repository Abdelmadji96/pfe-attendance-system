import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";
import { ApiError } from "../utils/api-error";

export function enrollmentDeviceAuth(req: Request, _res: Response, next: NextFunction) {
  const secret = env.ENROLLMENT_DEVICE_SECRET;
  if (!secret) {
    next(ApiError.internal("Enrollment device secret is not configured"));
    return;
  }

  const provided = req.headers["x-enrollment-device-secret"];
  if (!provided || provided !== secret) {
    next(ApiError.unauthorized("Invalid enrollment device secret"));
    return;
  }

  next();
}
