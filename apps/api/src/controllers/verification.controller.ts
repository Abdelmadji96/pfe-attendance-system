import { Request, Response, NextFunction } from "express";
import { verificationService } from "../services/verification.service";

export const verificationController = {
  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await verificationService.verify(
        req.body.rfidUid,
        req.body.liveImageBase64
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async mockEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await verificationService.mockEntry(
        req.body.rfidUid,
        req.body.simulateMatch
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },
};
