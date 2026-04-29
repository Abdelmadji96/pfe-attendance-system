import { Request, Response, NextFunction } from "express";
import { moduleService } from "../services/module.service";
import { RoleName } from "@pfe/shared";

export const moduleController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const role = req.user!.role.name;
      const params: { classGroupId?: string; universityId?: string; departmentId?: string } = {};
      if (req.query.classGroupId) params.classGroupId = req.query.classGroupId as string;
      if (role === RoleName.HR_ADMIN) {
        params.departmentId = req.user!.departmentId ?? undefined;
      } else if (role === RoleName.SUPER_HR_ADMIN) {
        params.universityId = req.user!.universityId ?? undefined;
      }
      const data = await moduleService.getAll(params);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await moduleService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async getByProfessor(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await moduleService.getByProfessor(req.user!.id);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await moduleService.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await moduleService.update(req.params.id, req.body);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await moduleService.delete(req.params.id);
      res.json({ success: true, message: "Deleted" });
    } catch (e) { next(e); }
  },

  async createSession(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await moduleService.createSession({ ...req.body, moduleId: req.params.id });
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  },

  async deleteSession(req: Request, res: Response, next: NextFunction) {
    try {
      await moduleService.deleteSession(req.params.sessionId);
      res.json({ success: true, message: "Deleted" });
    } catch (e) { next(e); }
  },

  async assignProfessor(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await moduleService.assignProfessor(req.params.id, req.body.userId);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  },

  async removeProfessor(req: Request, res: Response, next: NextFunction) {
    try {
      await moduleService.removeProfessor(req.params.id, req.params.userId);
      res.json({ success: true, message: "Removed" });
    } catch (e) { next(e); }
  },
};
