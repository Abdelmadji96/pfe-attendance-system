import { Router } from "express";
import { userController } from "../controllers/user.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { createUserSchema, updateUserSchema, updateUserRoleSchema, Permission } from "@pfe/shared";

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get("/", authorize(Permission.VIEW_USERS, Permission.VIEW_OWN_STUDENTS), userController.getAll);
usersRouter.get("/:id", authorize(Permission.VIEW_USERS, Permission.VIEW_OWN_STUDENTS), userController.getById);
usersRouter.post("/", authorize(Permission.MANAGE_USERS), validate(createUserSchema), userController.create);
usersRouter.patch("/:id", authorize(Permission.MANAGE_USERS), validate(updateUserSchema), userController.update);
usersRouter.delete("/:id", authorize(Permission.MANAGE_USERS), userController.delete);
usersRouter.patch("/:id/role", authorize(Permission.MANAGE_ROLES), validate(updateUserRoleSchema), userController.updateRole);
