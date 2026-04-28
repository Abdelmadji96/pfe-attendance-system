import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body.email, req.body.password);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async registerAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.registerAdmin(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getMe(req.user!.id);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.updateProfile(req.user!.id, req.body);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },

  async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      const user = await authService.updateAvatar(req.user!.id, avatarUrl);
      res.json({ success: true, data: { user, avatarUrl } });
    } catch (error) {
      next(error);
    }
  },
};
