import { Router } from "express";
import { faceController } from "../controllers/face.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { uploadFaceImages } from "../middlewares/upload";
import { Permission } from "@pfe/shared";

export const faceRouter = Router();

faceRouter.use(authenticate);

faceRouter.post(
  "/enroll/:userId",
  authorize(Permission.ACCESS_ENROLLMENT),
  uploadFaceImages.array("images", 20),
  faceController.enroll
);
faceRouter.get("/templates/:userId", faceController.getTemplates);
faceRouter.delete(
  "/templates/:templateId",
  authorize(Permission.ACCESS_ENROLLMENT),
  faceController.deleteTemplate
);
