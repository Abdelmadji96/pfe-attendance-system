import { Request, Response, NextFunction } from "express";
import { enrollmentService } from "../services/enrollment.service";

export const enrollmentController = {
  async rfidScan(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await enrollmentService.recordRfidScan(req.body.uid, req.body.deviceId);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  async rfidLatest(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = enrollmentService.getLatestRfidScan();
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  async rfidClear(_req: Request, res: Response, next: NextFunction) {
    try {
      enrollmentService.clearLatestRfidScan();
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },

  async complete(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await enrollmentService.complete(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },
};
