import { Request, Response, NextFunction } from "express";
import { moduleService } from "../services/module.service";

export const moduleController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await moduleService.getAll(req.query.classGroupId as string | undefined);
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
