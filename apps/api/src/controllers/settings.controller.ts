import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";

export const settingsController = {
  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await prisma.setting.findMany({ orderBy: { key: "asc" } });
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { settings } = req.body;

      await prisma.$transaction(
        settings.map((s: { key: string; value: string }) =>
          prisma.setting.upsert({
            where: { key: s.key },
            update: { value: s.value },
            create: { key: s.key, value: s.value },
          })
        )
      );

      const all = await prisma.setting.findMany({ orderBy: { key: "asc" } });
      res.json({ success: true, data: all });
    } catch (error) {
      next(error);
    }
  },
};
