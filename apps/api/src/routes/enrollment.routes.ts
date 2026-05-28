import { Router } from "express";
import { enrollmentController } from "../controllers/enrollment.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { enrollmentDeviceAuth } from "../middlewares/enrollment-device-auth";
import {
  enrollmentRfidScanSchema,
  enrollmentCompleteSchema,
  Permission,
} from "@pfe/shared";

export const enrollmentRouter = Router();

enrollmentRouter.post(
  "/rfid-scan",
  enrollmentDeviceAuth,
  validate(enrollmentRfidScanSchema),
  enrollmentController.rfidScan
);

enrollmentRouter.use(authenticate);

enrollmentRouter.get(
  "/rfid-latest",
  authorize(Permission.ACCESS_ENROLLMENT),
  enrollmentController.rfidLatest
);

enrollmentRouter.post(
  "/rfid-clear",
  authorize(Permission.ACCESS_ENROLLMENT),
  enrollmentController.rfidClear
);

enrollmentRouter.post(
  "/complete",
  authorize(Permission.ACCESS_ENROLLMENT),
  validate(enrollmentCompleteSchema),
  enrollmentController.complete
);
