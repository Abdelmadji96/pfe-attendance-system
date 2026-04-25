import { Router } from "express";
import { settingsController } from "../controllers/settings.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { updateSettingsSchema, Permission } from "@pfe/shared";

export const settingsRouter = Router();

settingsRouter.use(authenticate);

settingsRouter.get("/", authorize(Permission.MANAGE_SETTINGS), settingsController.getAll);
settingsRouter.patch(
  "/",
  authorize(Permission.MANAGE_SETTINGS),
  validate(updateSettingsSchema),
  settingsController.update
);
