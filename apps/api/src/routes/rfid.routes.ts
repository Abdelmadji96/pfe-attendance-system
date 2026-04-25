import { Router } from "express";
import { rfidController } from "../controllers/rfid.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { rfidScanSchema, rfidAssignSchema, Permission } from "@pfe/shared";

export const rfidRouter = Router();

rfidRouter.use(authenticate);

rfidRouter.post("/scan", validate(rfidScanSchema), rfidController.scan);
rfidRouter.post("/assign", authorize(Permission.MANAGE_USERS), validate(rfidAssignSchema), rfidController.assign);
rfidRouter.get("/:uid/user", rfidController.getUserByUid);
