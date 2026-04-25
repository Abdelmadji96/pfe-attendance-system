import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";

const userIncludes = {
  role: true,
  classGroup: {
    include: {
      speciality: {
        include: { department: { include: { faculty: { include: { university: true } } } } },
      },
    },
  },
  rfidCard: true,
  professorModules: { include: { module: true } },
} satisfies Prisma.UserInclude;

export const userRepository = {
  findById(id: string) {
    return prisma.user.findUnique({ where: { id }, include: userIncludes });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, include: userIncludes });
  },

  findByStudentId(studentId: string) {
    return prisma.user.findUnique({ where: { studentId }, include: userIncludes });
  },

  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    classGroupId?: string;
    specialityId?: string;
    departmentId?: string;
    facultyId?: string;
    universityId?: string;
  }) {
    const where: Prisma.UserWhereInput = {};

    if (params.classGroupId) {
      where.classGroupId = params.classGroupId;
    } else if (params.specialityId) {
      where.classGroup = { specialityId: params.specialityId };
    } else if (params.departmentId) {
      where.classGroup = { speciality: { departmentId: params.departmentId } };
    } else if (params.facultyId) {
      where.classGroup = { speciality: { department: { facultyId: params.facultyId } } };
    } else if (params.universityId) {
      where.classGroup = {
        speciality: { department: { faculty: { universityId: params.universityId } } },
      };
    }

    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: "insensitive" } },
        { lastName: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
        { studentId: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: userIncludes,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    return { data, total };
  },

  async findByProfessorScope(professorId: string, params: { page: number; limit: number; search?: string }) {
    const profModules = await prisma.professorModule.findMany({
      where: { userId: professorId },
      select: { module: { select: { classGroupId: true } } },
    });
    const classGroupIds = [...new Set(profModules.map((pm) => pm.module.classGroupId))];

    if (classGroupIds.length === 0) return { data: [], total: 0 };

    const where: Prisma.UserWhereInput = {
      classGroupId: { in: classGroupIds },
      studentId: { not: null },
    };

    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: "insensitive" } },
        { lastName: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
        { studentId: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: userIncludes,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { lastName: "asc" },
      }),
      prisma.user.count({ where }),
    ]);

    return { data, total };
  },

  create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data, include: userIncludes });
  },

  update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data, include: userIncludes });
  },

  delete(id: string) {
    return prisma.user.delete({ where: { id } });
  },

  updateRole(id: string, roleId: string) {
    return prisma.user.update({ where: { id }, data: { roleId }, include: userIncludes });
  },

  count() {
    return prisma.user.count();
  },
};
