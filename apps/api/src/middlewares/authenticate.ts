import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";
import { Permission } from "@pfe/shared";

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Missing or invalid authorization header");
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw ApiError.unauthorized("User not found or deactivated");
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: {
        id: user.role.id,
        name: user.role.name as any,
        permissions: user.role.permissions as Permission[],
      },
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(ApiError.unauthorized("Invalid or expired token"));
    }
  }
}
