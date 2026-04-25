import { Request, Response, NextFunction } from "express";
import { userService } from "../services/user.service";
import { Permission, RoleName } from "@pfe/shared";

export const userController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userRole = req.user!.role.name;

      if (userRole === RoleName.PROFESSOR) {
        const result = await userService.getByProfessorScope(req.user!.id, {
          page: parseInt(req.query.page as string) || 1,
          limit: parseInt(req.query.limit as string) || 20,
          search: req.query.search as string,
        });
        return res.json({ success: true, ...result });
      }

      const result = await userService.getAll({
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        search: req.query.search as string,
        classGroupId: req.query.classGroupId as string,
        specialityId: req.query.specialityId as string,
        departmentId: req.query.departmentId as string,
        facultyId: req.query.facultyId as string,
        universityId: req.query.universityId as string,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.getById(req.params.id);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.create(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.update(req.params.id, req.body);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await userService.delete(req.params.id);
      res.json({ success: true, message: "User deleted" });
    } catch (error) {
      next(error);
    }
  },

  async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.updateRole(req.params.id, req.body.roleId);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  },
};
