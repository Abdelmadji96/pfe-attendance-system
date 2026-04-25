import { Router } from "express";
import { rolesController } from "../controllers/roles.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { Permission } from "@pfe/shared";

export const rolesRouter = Router();

rolesRouter.use(authenticate);

rolesRouter.get("/", authorize(Permission.MANAGE_ROLES), rolesController.getAll);
