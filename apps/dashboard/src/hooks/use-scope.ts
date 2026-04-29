"use client";

import { useAuth } from "./use-auth";
import { RoleName } from "@pfe/shared";

export function useUserScope() {
  const { user } = useAuth();
  const roleName = (user?.role?.name ?? "") as string;

  const isScoped =
    roleName === RoleName.SUPER_HR_ADMIN || roleName === RoleName.HR_ADMIN;

  return {
    isScoped,
    isSuperAdmin: roleName === RoleName.SUPER_ADMIN,
    isSuperHrAdmin: roleName === RoleName.SUPER_HR_ADMIN,
    isHrAdmin: roleName === RoleName.HR_ADMIN,
    universityId: user?.universityId ?? null,
    facultyId: user?.facultyId ?? null,
    departmentId: user?.departmentId ?? null,
  };
}
