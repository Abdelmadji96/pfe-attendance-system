import { Request, Response, NextFunction } from "express";
import { Permission } from "@pfe/shared";
import { ApiError } from "../utils/api-error";

export function authorize(...requiredPermissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    const userPermissions = req.user.role.permissions as string[];
    const hasPermission = requiredPermissions.some((p) => userPermissions.includes(p));

    if (!hasPermission) {
      return next(ApiError.forbidden("You do not have permission to perform this action"));
    }

    next();
  };
}
