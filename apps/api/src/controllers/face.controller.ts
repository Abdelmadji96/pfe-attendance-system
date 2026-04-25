import { Request, Response, NextFunction } from "express";
import { faceService } from "../services/face.service";
import { ApiError } from "../utils/api-error";
import { MIN_FACE_IMAGES } from "@pfe/shared";

export const faceController = {
  async enroll(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        throw ApiError.badRequest("No images uploaded");
      }

      const result = await faceService.enroll(req.params.userId, files);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async getTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const templates = await faceService.getTemplates(req.params.userId);
      res.json({ success: true, data: templates });
    } catch (error) {
      next(error);
    }
  },

  async deleteTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      await faceService.deleteTemplate(req.params.templateId);
      res.json({ success: true, message: "Template deleted" });
    } catch (error) {
      next(error);
    }
  },
};
