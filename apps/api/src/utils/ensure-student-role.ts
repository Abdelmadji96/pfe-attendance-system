import { prisma } from "../config/prisma";
import { ApiError } from "./api-error";

/** Ensures STUDENT role exists (needed after enrollment schema update). */
export async function ensureStudentRole() {
  const existing = await prisma.role.findFirst({ where: { name: "STUDENT" } });
  if (existing) return existing;

  try {
    return await prisma.role.create({
      data: { name: "STUDENT", permissions: [] },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("RoleName") || message.includes("STUDENT")) {
      throw ApiError.internal(
        "STUDENT role is missing in the database. On the VPS run: cd apps/api && pnpm exec prisma migrate deploy"
      );
    }
    throw error;
  }
}
