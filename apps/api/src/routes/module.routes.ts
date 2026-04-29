import { Router } from "express";
import { moduleController } from "../controllers/module.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import {
  Permission,
  createModuleSchema,
  updateModuleSchema,
  createModuleSessionSchema,
  assignProfessorSchema,
} from "@pfe/shared";

export const modulesRouter = Router();

modulesRouter.use(authenticate);

modulesRouter.get("/", authorize(Permission.MANAGE_MODULES, Permission.VIEW_DASHBOARD), moduleController.getAll);
modulesRouter.get("/my-modules", moduleController.getByProfessor);
modulesRouter.get("/:id", authorize(Permission.MANAGE_MODULES, Permission.VIEW_DASHBOARD), moduleController.getById);
modulesRouter.post("/", authorize(Permission.MANAGE_MODULES), validate(createModuleSchema), moduleController.create);
modulesRouter.patch("/:id", authorize(Permission.MANAGE_MODULES), validate(updateModuleSchema), moduleController.update);
modulesRouter.delete("/:id", authorize(Permission.MANAGE_MODULES), moduleController.delete);

// Sessions
modulesRouter.post("/:id/sessions", authorize(Permission.MANAGE_MODULES), validate(createModuleSessionSchema), moduleController.createSession);
modulesRouter.delete("/sessions/:sessionId", authorize(Permission.MANAGE_MODULES), moduleController.deleteSession);

// Professor assignment
modulesRouter.post("/:id/assign-professor", authorize(Permission.MANAGE_MODULES), validate(assignProfessorSchema), moduleController.assignProfessor);
modulesRouter.delete("/:id/professors/:userId", authorize(Permission.MANAGE_MODULES), moduleController.removeProfessor);
