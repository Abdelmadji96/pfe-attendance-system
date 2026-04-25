import { Router } from "express";
import { verificationController } from "../controllers/verification.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { verifySchema, mockEntrySchema, Permission } from "@pfe/shared";

export const verificationRouter = Router();

verificationRouter.use(authenticate);

verificationRouter.post(
  "/verify",
  authorize(Permission.ACCESS_VERIFICATION),
  validate(verifySchema),
  verificationController.verify
);

verificationRouter.post(
  "/mock-entry",
  authorize(Permission.ACCESS_VERIFICATION),
  validate(mockEntrySchema),
  verificationController.mockEntry
);
