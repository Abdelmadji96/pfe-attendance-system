import { Request, Response, NextFunction } from "express";
import { attendanceService } from "../services/attendance.service";
import { RoleName } from "@pfe/shared";

export const attendanceController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const isProfessor = req.user!.role.name === RoleName.PROFESSOR;
      const result = await attendanceService.getAll({
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        status: req.query.status as string,
        verificationResult: req.query.verificationResult as string,
        search: req.query.search as string,
        classGroupId: req.query.classGroupId as string,
        specialityId: req.query.specialityId as string,
        departmentId: req.query.departmentId as string,
        facultyId: req.query.facultyId as string,
        universityId: req.query.universityId as string,
        moduleId: req.query.moduleId as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        date: req.query.date as string,
        professorUserId: isProfessor ? req.user!.id : undefined,
      });
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  },

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const isProfessor = req.user!.role.name === RoleName.PROFESSOR;
      const data = await attendanceService.getStats(isProfessor ? req.user!.id : undefined);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async getCheckInsPerDay(req: Request, res: Response, next: NextFunction) {
    try {
      const isProfessor = req.user!.role.name === RoleName.PROFESSOR;
      const data = await attendanceService.getCheckInsPerDay(isProfessor ? req.user!.id : undefined);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async getPeakHours(req: Request, res: Response, next: NextFunction) {
    try {
      const isProfessor = req.user!.role.name === RoleName.PROFESSOR;
      const data = await attendanceService.getPeakHours(isProfessor ? req.user!.id : undefined);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async getByGroupData(req: Request, res: Response, next: NextFunction) {
    try {
      const isProfessor = req.user!.role.name === RoleName.PROFESSOR;
      const data = await attendanceService.getByGroupData(isProfessor ? req.user!.id : undefined);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async checkIn(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await attendanceService.checkIn(req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  },

  async checkOut(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await attendanceService.checkOut(req.body.attendanceLogId);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
};
