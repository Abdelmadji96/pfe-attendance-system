import { Request, Response, NextFunction } from "express";
import { evaluationService } from "../services/evaluation.service";

export const evaluationController = {
  async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const data = evaluationService.getSummary();
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },
};
