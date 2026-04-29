import { Request, Response, NextFunction } from "express";
import { masterDataService } from "../services/master-data.service";
import { prisma } from "../config/prisma";

const LEVELS_SETTING_KEY = "academic_levels";
const DEFAULT_LEVELS = ["L1", "L2", "L3", "M1", "M2"];

export const masterDataController = {
  async getLevels(_req: Request, res: Response, next: NextFunction) {
    try {
      const setting = await prisma.setting.findUnique({ where: { key: LEVELS_SETTING_KEY } });
      const levels: string[] = setting ? JSON.parse(setting.value) : DEFAULT_LEVELS;
      res.json({ success: true, data: levels });
    } catch (e) { next(e); }
  },
  async addLevel(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.body;
      if (!name || typeof name !== "string") {
        return res.status(400).json({ success: false, message: "Level name is required" });
      }
      const setting = await prisma.setting.findUnique({ where: { key: LEVELS_SETTING_KEY } });
      const levels: string[] = setting ? JSON.parse(setting.value) : DEFAULT_LEVELS;
      if (levels.includes(name.trim())) {
        return res.status(409).json({ success: false, message: "Level already exists" });
      }
      levels.push(name.trim());
      await prisma.setting.upsert({
        where: { key: LEVELS_SETTING_KEY },
        update: { value: JSON.stringify(levels) },
        create: { key: LEVELS_SETTING_KEY, value: JSON.stringify(levels) },
      });
      res.status(201).json({ success: true, data: levels });
    } catch (e) { next(e); }
  },
  async deleteLevel(req: Request, res: Response, next: NextFunction) {
    try {
      const levelName = req.params.name;
      const setting = await prisma.setting.findUnique({ where: { key: LEVELS_SETTING_KEY } });
      const levels: string[] = setting ? JSON.parse(setting.value) : DEFAULT_LEVELS;
      const filtered = levels.filter((l) => l !== levelName);
      await prisma.setting.upsert({
        where: { key: LEVELS_SETTING_KEY },
        update: { value: JSON.stringify(filtered) },
        create: { key: LEVELS_SETTING_KEY, value: JSON.stringify(filtered) },
      });
      res.json({ success: true, data: filtered });
    } catch (e) { next(e); }
  },

  async getUniversities(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await masterDataService.getUniversities();
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
  async createUniversity(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await masterDataService.createUniversity(req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  },
  async deleteUniversity(req: Request, res: Response, next: NextFunction) {
    try {
      await masterDataService.deleteUniversity(req.params.id);
      res.json({ success: true, message: "Deleted" });
    } catch (e) { next(e); }
  },

  async getFaculties(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await masterDataService.getFaculties(req.query.universityId as string | undefined);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
  async createFaculty(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await masterDataService.createFaculty(req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  },
  async deleteFaculty(req: Request, res: Response, next: NextFunction) {
    try {
      await masterDataService.deleteFaculty(req.params.id);
      res.json({ success: true, message: "Deleted" });
    } catch (e) { next(e); }
  },

  async getDepartments(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await masterDataService.getDepartments(req.query.facultyId as string | undefined);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
  async createDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await masterDataService.createDepartment(req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  },
  async deleteDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      await masterDataService.deleteDepartment(req.params.id);
      res.json({ success: true, message: "Deleted" });
    } catch (e) { next(e); }
  },

  async getSpecialities(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await masterDataService.getSpecialities(req.query.departmentId as string | undefined);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
  async createSpeciality(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await masterDataService.createSpeciality(req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  },
  async deleteSpeciality(req: Request, res: Response, next: NextFunction) {
    try {
      await masterDataService.deleteSpeciality(req.params.id);
      res.json({ success: true, message: "Deleted" });
    } catch (e) { next(e); }
  },

  async getClassGroups(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await masterDataService.getClassGroups(req.query.specialityId as string | undefined);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
  async createClassGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await masterDataService.createClassGroup(req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  },
  async deleteClassGroup(req: Request, res: Response, next: NextFunction) {
    try {
      await masterDataService.deleteClassGroup(req.params.id);
      res.json({ success: true, message: "Deleted" });
    } catch (e) { next(e); }
  },

  async getRooms(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await masterDataService.getRooms(req.query.universityId as string | undefined);
      res.json({ success: true, data });
    } catch (e) { next(e); }
  },
  async createRoom(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await masterDataService.createRoom(req.body);
      res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
  },
  async deleteRoom(req: Request, res: Response, next: NextFunction) {
    try {
      await masterDataService.deleteRoom(req.params.id);
      res.json({ success: true, message: "Deleted" });
    } catch (e) { next(e); }
  },

  async importCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await masterDataService.importCsv(req.body);
      res.json({ success: true, data: result });
    } catch (e) { next(e); }
  },
};
