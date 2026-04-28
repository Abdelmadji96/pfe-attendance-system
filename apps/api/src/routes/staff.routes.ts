import { Router } from "express";
import { staffController } from "../controllers/staff.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { createStaffSchema, updateStaffSchema, Permission } from "@pfe/shared";

export const staffRouter = Router();

staffRouter.use(authenticate);

staffRouter.get("/", authorize(Permission.MANAGE_STAFF), staffController.list);
staffRouter.post("/", authorize(Permission.MANAGE_STAFF), validate(createStaffSchema), staffController.create);
staffRouter.patch("/:id", authorize(Permission.MANAGE_STAFF), validate(updateStaffSchema), staffController.update);
staffRouter.delete("/:id", authorize(Permission.MANAGE_STAFF), staffController.deactivate);
