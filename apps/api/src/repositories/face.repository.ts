import { prisma } from "../config/prisma";

export const faceRepository = {
  findByUserId(userId: string) {
    return prisma.faceTemplate.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: string) {
    return prisma.faceTemplate.findUnique({ where: { id } });
  },

  create(data: {
    userId: string;
    embedding: number[];
    imagePath: string;
    qualityScore: number;
  }) {
    return prisma.faceTemplate.create({ data });
  },

  createMany(
    templates: {
      userId: string;
      embedding: number[];
      imagePath: string;
      qualityScore: number;
    }[]
  ) {
    return prisma.faceTemplate.createMany({ data: templates });
  },

  delete(id: string) {
    return prisma.faceTemplate.delete({ where: { id } });
  },

  deleteByUserId(userId: string) {
    return prisma.faceTemplate.deleteMany({ where: { userId } });
  },

  countByUserId(userId: string) {
    return prisma.faceTemplate.count({ where: { userId } });
  },
};
