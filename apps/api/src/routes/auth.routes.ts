import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/authenticate";
import { loginSchema, registerAdminSchema } from "@pfe/shared";

export const authRouter = Router();

authRouter.post("/login", validate(loginSchema), authController.login);
authRouter.post("/register-admin", validate(registerAdminSchema), authController.registerAdmin);
authRouter.get("/me", authenticate, authController.getMe);
