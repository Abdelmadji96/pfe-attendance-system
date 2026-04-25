import { Request, Response, NextFunction } from "express";
import { rfidService } from "../services/rfid.service";

export const rfidController = {
  async scan(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await rfidService.scan(req.body.uid);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async assign(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await rfidService.assign(req.body.uid, req.body.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async getUserByUid(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await rfidService.getUserByUid(req.params.uid);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },
};
