"use client";

import { createContext, useContext } from "react";
import type { AuthUser } from "@pfe/shared";
import { Permission, ROLE_PERMISSIONS, RoleName } from "@pfe/shared";

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function usePermission(permission: Permission | null | undefined): boolean {
  const { user } = useAuth();
  if (!user || !permission) return false;
  const roleName = user.role.name as RoleName;
  const permissions = ROLE_PERMISSIONS[roleName] || [];
  return permissions.includes(permission);
}

export function useHasAnyPermission(permissions: Permission[]): boolean {
  const { user } = useAuth();
  if (!user) return false;
  const roleName = user.role.name as RoleName;
  const userPermissions = ROLE_PERMISSIONS[roleName] || [];
  return permissions.some((p) => userPermissions.includes(p));
}
