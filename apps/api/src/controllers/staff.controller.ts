import { Request, Response, NextFunction } from "express";
import { staffService } from "../services/staff.service";

export const staffController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await staffService.list(req.user!, {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        search: req.query.search as string,
        role: req.query.role as string,
        universityId: req.query.universityId as string,
        facultyId: req.query.facultyId as string,
        departmentId: req.query.departmentId as string,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const staff = await staffService.create(req.user!, req.body);
      res.status(201).json({ success: true, data: staff });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const staff = await staffService.update(req.user!, req.params.id, req.body);
      res.json({ success: true, data: staff });
    } catch (error) {
      next(error);
    }
  },

  async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const staff = await staffService.deactivate(req.user!, req.params.id);
      res.json({ success: true, data: staff });
    } catch (error) {
      next(error);
    }
  },
};
