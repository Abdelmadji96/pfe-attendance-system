/* eslint-disable @typescript-eslint/no-empty-interface */
import { Permission, RoleName } from "@pfe/shared";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: {
          id: string;
          name: RoleName;
          permissions: Permission[];
        };
        universityId: string | null;
        facultyId: string | null;
        departmentId: string | null;
      };
    }
  }
}

export {};
