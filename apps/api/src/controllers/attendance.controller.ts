import { Request, Response, NextFunction } from "express";
import { attendanceService } from "../services/attendance.service";
import { RoleName } from "@pfe/shared";

function getScopeFromUser(req: Request) {
  const role = req.user!.role.name;
  const isProfessor = role === RoleName.PROFESSOR;
  const isHrAdmin = role === RoleName.HR_ADMIN;
  const isScopedAdmin =
    role === RoleName.SUPER_HR_ADMIN || isHrAdmin;
  return {
    isProfessor,
    professorUserId: isProfessor ? req.user!.id : undefined,
    universityId: isScopedAdmin ? req.user!.universityId ?? undefined : undefined,
    facultyId: isHrAdmin ? req.user!.facultyId ?? undefined : undefined,
    departmentId: isHrAdmin ? req.user!.departmentId ?? undefined : undefined,
  };
}

export const attendanceController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const scope = getScopeFromUser(req);
      const result = await attendanceService.getAll({
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        status: req.query.status as string,
        verificationResult: req.query.verificationResult as string,
        search: req.query.search as string,
        classGroupId: req.query.classGroupId as string,
        specialityId: req.query.specialityId as string,
        departmentId: scope.departmentId || (req.query.departmentId as string),
        facultyId: scope.facultyId || (req.query.facultyId as string),
        universityId: scope.universityId || (req.query.universityId as string),
        moduleId: req.query.moduleId as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        date: req.query.date as string,
        professorUserId: scope.professorUserId,
      });
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  },

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const scope = getScopeFromUser(req);
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;
      const data = await attendanceService.getStats(scope.professorUserId, scope.universityId, scope.departmentId, dateFrom, dateTo);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const scope = getScopeFromUser(req);
      const data = await attendanceService.getDashboardStats(
        scope.professorUserId,
        scope.universityId || (req.query.universityId as string),
        scope.departmentId || (req.query.departmentId as string),
      );
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async getCheckInsPerDay(req: Request, res: Response, next: NextFunction) {
    try {
      const scope = getScopeFromUser(req);
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;
      const data = await attendanceService.getCheckInsPerDay(scope.professorUserId, scope.universityId, scope.departmentId, dateFrom, dateTo);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async getPeakHours(req: Request, res: Response, next: NextFunction) {
    try {
      const scope = getScopeFromUser(req);
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;
      const data = await attendanceService.getPeakHours(scope.professorUserId, scope.universityId, scope.departmentId, dateFrom, dateTo);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },

  async getByGroupData(req: Request, res: Response, next: NextFunction) {
    try {
      const scope = getScopeFromUser(req);
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;
      const data = await attendanceService.getByGroupData(scope.professorUserId, scope.universityId, scope.departmentId, dateFrom, dateTo);
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
