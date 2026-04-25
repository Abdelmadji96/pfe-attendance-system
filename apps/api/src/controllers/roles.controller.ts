import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";

export const rolesController = {
  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const roles = await prisma.role.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { users: true } } },
      });

      const data = roles.map((r) => ({
        id: r.id,
        name: r.name,
        permissions: r.permissions,
        userCount: r._count.users,
        createdAt: r.createdAt.toISOString(),
      }));

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};
