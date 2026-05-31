import type { Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "./api-error";

function isStudentEnumError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("RoleName") && message.includes("STUDENT");
}

/** Raw SQL path when Prisma Client enum lags behind the database (common after migrate). */
async function ensureStudentRoleViaSql(): Promise<Role> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM roles WHERE name = 'STUDENT' LIMIT 1
  `;

  if (rows[0]?.id) {
    const role = await prisma.$queryRaw<Role[]>`
      SELECT id, name, permissions, "createdAt", "updatedAt"
      FROM roles WHERE id = ${rows[0].id} LIMIT 1
    `;
    if (role[0]) return role[0];
  }

  await prisma.$executeRaw`
    INSERT INTO roles (id, name, permissions, "createdAt", "updatedAt")
    VALUES ('role_student_enrollment', 'STUDENT', '[]'::jsonb, NOW(), NOW())
    ON CONFLICT (name) DO NOTHING
  `;

  const created = await prisma.$queryRaw<Role[]>`
    SELECT id, name, permissions, "createdAt", "updatedAt"
    FROM roles WHERE name = 'STUDENT' LIMIT 1
  `;

  if (!created[0]) {
    throw ApiError.internal("Could not create STUDENT role in database");
  }

  return created[0];
}

/** Ensures STUDENT role exists (needed after enrollment schema update). */
export async function ensureStudentRole(): Promise<Role> {
  try {
    const existing = await prisma.role.findFirst({ where: { name: "STUDENT" } });
    if (existing) return existing;

    return await prisma.role.create({
      data: { name: "STUDENT", permissions: [] },
    });
  } catch (error) {
    if (isStudentEnumError(error)) {
      return ensureStudentRoleViaSql();
    }
    throw error;
  }
}

export async function isStudentRoleReady(): Promise<boolean> {
  try {
    const role = await prisma.role.findFirst({ where: { name: "STUDENT" } });
    return Boolean(role);
  } catch (error) {
    if (!isStudentEnumError(error)) throw error;
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM roles WHERE name = 'STUDENT' LIMIT 1
    `;
    return rows.length > 0;
  }
}
