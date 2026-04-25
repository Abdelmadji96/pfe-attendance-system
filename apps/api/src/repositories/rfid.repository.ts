import { prisma } from "../config/prisma";

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
  professorModules: true,
};

export const rfidRepository = {
  findByUid(uid: string) {
    return prisma.rFIDCard.findUnique({
      where: { uid },
      include: { user: { include: userIncludes } },
    });
  },

  findByUserId(userId: string) {
    return prisma.rFIDCard.findUnique({
      where: { userId },
    });
  },

  assign(uid: string, userId: string) {
    return prisma.rFIDCard.upsert({
      where: { userId },
      update: { uid, isActive: true, assignedAt: new Date() },
      create: { uid, userId, isActive: true },
      include: { user: { include: userIncludes } },
    });
  },

  deactivate(uid: string) {
    return prisma.rFIDCard.update({
      where: { uid },
      data: { isActive: false },
    });
  },
};
