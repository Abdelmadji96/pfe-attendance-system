import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";

const moduleIncludes = {
  classGroup: {
    include: {
      speciality: {
        include: { department: { include: { faculty: { include: { university: true } } } } },
      },
    },
  },
  room: true,
  sessions: true,
  professors: { include: { user: true } },
} satisfies Prisma.ModuleInclude;

export const moduleRepository = {
  findAll(classGroupId?: string) {
    return prisma.module.findMany({
      where: classGroupId ? { classGroupId } : undefined,
      include: moduleIncludes,
      orderBy: { name: "asc" },
    });
  },

  findById(id: string) {
    return prisma.module.findUnique({
      where: { id },
      include: moduleIncludes,
    });
  },

  findByProfessor(userId: string) {
    return prisma.module.findMany({
      where: { professors: { some: { userId } } },
      include: moduleIncludes,
      orderBy: { name: "asc" },
    });
  },

  create(data: Prisma.ModuleCreateInput) {
    return prisma.module.create({ data, include: moduleIncludes });
  },

  update(id: string, data: Prisma.ModuleUpdateInput) {
    return prisma.module.update({ where: { id }, data, include: moduleIncludes });
  },

  delete(id: string) {
    return prisma.module.delete({ where: { id } });
  },

  // Sessions
  createSession(data: { moduleId: string; dayOfWeek: number; startTime: string; endTime: string }) {
    return prisma.moduleSession.create({ data });
  },

  deleteSession(id: string) {
    return prisma.moduleSession.delete({ where: { id } });
  },

  findActiveSession(classGroupId: string, dayOfWeek: number, currentTime: string) {
    return prisma.moduleSession.findFirst({
      where: {
        module: {
          classGroupId,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
        dayOfWeek,
        startTime: { lte: currentTime },
        endTime: { gte: currentTime },
      },
      include: {
        module: { include: { room: true, classGroup: true } },
      },
    });
  },

  // Professor assignment
  assignProfessor(moduleId: string, userId: string) {
    return prisma.professorModule.create({
      data: { moduleId, userId },
      include: { user: true, module: true },
    });
  },

  removeProfessor(moduleId: string, userId: string) {
    return prisma.professorModule.delete({
      where: { userId_moduleId: { userId, moduleId } },
    });
  },

  findProfessorModuleIds(userId: string) {
    return prisma.professorModule.findMany({
      where: { userId },
      select: { moduleId: true },
    });
  },
};
