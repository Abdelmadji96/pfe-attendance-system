import { Router } from "express";
import { evaluationController } from "../controllers/evaluation.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { Permission } from "@pfe/shared";

export const evaluationRouter = Router();

evaluationRouter.use(authenticate);
evaluationRouter.get(
  "/metrics",
  authorize(Permission.ACCESS_VERIFICATION),
  evaluationController.getMetrics
);
