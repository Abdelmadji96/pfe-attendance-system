import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";
import { hashPassword } from "../utils/password";
import { mapUserToDto } from "./user.service";
import type { CreateStaffInput, UpdateStaffInput } from "@pfe/shared";
import { Prisma } from "@prisma/client";

const ROLE_RANK: Record<string, number> = {
  MINISTER: 0,
  SUPER_ADMIN: 1,
  SUPER_HR_ADMIN: 2,
  HR_ADMIN: 3,
  PROFESSOR: 4,
};

const CREATABLE_ROLES: Record<string, string[]> = {
  SUPER_ADMIN: ["MINISTER", "SUPER_HR_ADMIN"],
  SUPER_HR_ADMIN: ["HR_ADMIN", "PROFESSOR"],
  HR_ADMIN: ["PROFESSOR"],
};

const staffIncludes = {
  role: true,
  university: true,
  faculty: true,
  department: true,
  classGroup: {
    include: {
      speciality: {
        include: { department: { include: { faculty: { include: { university: true } } } } },
      },
    },
  },
  rfidCard: true,
  professorModules: { include: { module: true } },
  professorDepartments: {
    include: { department: { include: { faculty: true } } },
  },
} satisfies Prisma.UserInclude;

interface StaffListParams {
  page: number;
  limit: number;
  search?: string;
  role?: string;
  universityId?: string;
  facultyId?: string;
  departmentId?: string;
}

interface AuthUserContext {
  id: string;
  role: { name: string };
  universityId: string | null;
  facultyId: string | null;
  departmentId: string | null;
}

export const staffService = {
  async list(actor: AuthUserContext, params: StaffListParams) {
    const where: Prisma.UserWhereInput = {
      role: {
        name: { in: ["MINISTER", "SUPER_HR_ADMIN", "HR_ADMIN", "PROFESSOR"] },
      },
    };

    if (actor.role.name === "SUPER_HR_ADMIN") {
      where.universityId = actor.universityId;
      where.role = { name: { in: ["HR_ADMIN", "PROFESSOR"] } };
      if (params.role && ["HR_ADMIN", "PROFESSOR"].includes(params.role)) {
        where.role = { name: params.role as any };
      }
      if (params.facultyId) where.facultyId = params.facultyId;
    } else if (actor.role.name === "HR_ADMIN") {
      where.universityId = actor.universityId;
      where.facultyId = actor.facultyId;
      where.role = { name: "PROFESSOR" };
    } else {
      if (params.role) {
        where.role = { name: params.role as any };
      }
      if (params.universityId && actor.role.name === "SUPER_ADMIN") {
        where.universityId = params.universityId;
      }
      if (params.facultyId) where.facultyId = params.facultyId;
    }

    if (params.departmentId) {
      where.OR = [
        { departmentId: params.departmentId },
        { professorDepartments: { some: { departmentId: params.departmentId } } },
      ];
      delete (where as any).departmentId;
    }

    if (params.search) {
      const searchFilter = [
        { firstName: { contains: params.search, mode: "insensitive" as const } },
        { lastName: { contains: params.search, mode: "insensitive" as const } },
        { email: { contains: params.search, mode: "insensitive" as const } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchFilter }];
        delete where.OR;
      } else {
        where.OR = searchFilter;
      }
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: staffIncludes,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: data.map(mapUserToDto),
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  },

  async create(actor: AuthUserContext, input: CreateStaffInput) {
    const allowedRoles = CREATABLE_ROLES[actor.role.name];
    if (!allowedRoles || !allowedRoles.includes(input.role)) {
      throw ApiError.forbidden(`You cannot create users with role ${input.role}`);
    }

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw ApiError.conflict("Email already registered");

    const targetRole = input.role as string;

    if (targetRole === "SUPER_HR_ADMIN") {
      if (!input.universityId) throw ApiError.badRequest("University is required for Super HR Admin");
      const uni = await prisma.university.findUnique({ where: { id: input.universityId } });
      if (!uni) throw ApiError.notFound("University not found");
    }

    if (targetRole === "HR_ADMIN") {
      if (!input.universityId) throw ApiError.badRequest("University is required for HR Admin");
      if (!input.facultyId) throw ApiError.badRequest("Faculty is required for HR Admin");
      if (!input.departmentId) throw ApiError.badRequest("Department is required for HR Admin");

      if (actor.role.name === "SUPER_HR_ADMIN" && actor.universityId !== input.universityId) {
        throw ApiError.forbidden("Cannot assign a university outside your scope");
      }

      const faculty = await prisma.faculty.findUnique({ where: { id: input.facultyId } });
      if (!faculty || faculty.universityId !== input.universityId) {
        throw ApiError.badRequest("Faculty does not belong to the selected university");
      }

      const dept = await prisma.department.findUnique({ where: { id: input.departmentId } });
      if (!dept || dept.facultyId !== input.facultyId) {
        throw ApiError.badRequest("Department does not belong to the selected faculty");
      }
    }

    if (targetRole === "PROFESSOR") {
      if (actor.role.name === "SUPER_HR_ADMIN") {
        if (!input.universityId) input.universityId = actor.universityId ?? undefined;
        if (input.universityId !== actor.universityId) {
          throw ApiError.forbidden("Cannot assign professors outside your university");
        }
      } else if (actor.role.name === "HR_ADMIN") {
        input.universityId = actor.universityId ?? undefined;
      }
    }

    const role = await prisma.role.findUnique({ where: { name: input.role as any } });
    if (!role) throw ApiError.internal("Role not found in database");

    const passwordHash = await hashPassword(input.password);

    const departmentIds = (input as any).departmentIds as string[] | undefined;

    if (targetRole === "PROFESSOR" && departmentIds?.length) {
      const departments = await prisma.department.findMany({
        where: { id: { in: departmentIds } },
        include: { faculty: true },
      });
      if (departments.length !== departmentIds.length) {
        throw ApiError.badRequest("One or more departments not found");
      }
      if (actor.role.name === "SUPER_HR_ADMIN") {
        const invalidDept = departments.find((d) => d.faculty.universityId !== actor.universityId);
        if (invalidDept) {
          throw ApiError.forbidden("Cannot assign departments outside your university");
        }
      }
    }

    const createData: Prisma.UserUncheckedCreateInput = {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      passwordHash,
      phone: input.phone,
      roleId: role.id,
      universityId: input.universityId ?? null,
      facultyId: null,
      departmentId: null,
      createdById: actor.id,
    };

    if (targetRole !== "PROFESSOR") {
      createData.facultyId = input.facultyId ?? null;
      createData.departmentId = input.departmentId ?? null;
    }

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: createData,
      });

      if (targetRole === "PROFESSOR" && departmentIds?.length) {
        await tx.professorDepartment.createMany({
          data: departmentIds.map((deptId) => ({
            userId: created.id,
            departmentId: deptId,
          })),
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: created.id },
        include: staffIncludes,
      });
    });

    return mapUserToDto(user);
  },

  async update(actor: AuthUserContext, staffId: string, input: UpdateStaffInput) {
    const target = await prisma.user.findUnique({ where: { id: staffId }, include: { role: true } });
    if (!target) throw ApiError.notFound("Staff member not found");

    const targetRank = ROLE_RANK[target.role.name] ?? 99;
    const actorRank = ROLE_RANK[actor.role.name] ?? 99;
    if (targetRank <= actorRank) {
      throw ApiError.forbidden("You cannot modify a user with equal or higher rank");
    }

    if (actor.role.name === "SUPER_HR_ADMIN" && target.universityId !== actor.universityId) {
      throw ApiError.forbidden("This user is outside your scope");
    }
    if (actor.role.name === "HR_ADMIN") {
      if (target.facultyId !== actor.facultyId || target.departmentId !== actor.departmentId) {
        throw ApiError.forbidden("This user is outside your scope");
      }
    }

    const updateData: Prisma.UserUpdateInput = {};
    if (input.firstName) updateData.firstName = input.firstName;
    if (input.lastName) updateData.lastName = input.lastName;
    if (input.email) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;

    const user = await prisma.user.update({
      where: { id: staffId },
      data: updateData,
      include: staffIncludes,
    });

    return mapUserToDto(user);
  },

  async deactivate(actor: AuthUserContext, staffId: string) {
    const target = await prisma.user.findUnique({ where: { id: staffId }, include: { role: true } });
    if (!target) throw ApiError.notFound("Staff member not found");

    const targetRank = ROLE_RANK[target.role.name] ?? 99;
    const actorRank = ROLE_RANK[actor.role.name] ?? 99;
    if (targetRank <= actorRank) {
      throw ApiError.forbidden("You cannot deactivate a user with equal or higher rank");
    }

    if (actor.role.name === "SUPER_HR_ADMIN" && target.universityId !== actor.universityId) {
      throw ApiError.forbidden("This user is outside your scope");
    }
    if (actor.role.name === "HR_ADMIN") {
      if (target.facultyId !== actor.facultyId || target.departmentId !== actor.departmentId) {
        throw ApiError.forbidden("This user is outside your scope");
      }
    }

    const user = await prisma.user.update({
      where: { id: staffId },
      data: { isActive: !target.isActive },
      include: staffIncludes,
    });

    return mapUserToDto(user);
  },
};
