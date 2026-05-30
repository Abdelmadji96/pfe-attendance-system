import { moduleRepository } from "../repositories/module.repository";
import { userRepository } from "../repositories/user.repository";
import { ApiError } from "../utils/api-error";
import { prisma } from "../config/prisma";
import type {
  CreateModuleInput,
  UpdateModuleInput,
  CreateModuleSessionInput,
  UpdateModuleSessionInput,
} from "@pfe/shared";

export const moduleService = {
  async getAll(params?: { classGroupId?: string; universityId?: string; departmentId?: string }) {
    return moduleRepository.findAll(params);
  },

  async getById(id: string) {
    const mod = await moduleRepository.findById(id);
    if (!mod) throw ApiError.notFound("Module not found");
    return mod;
  },

  async getByProfessor(userId: string) {
    return moduleRepository.findByProfessor(userId);
  },

  async create(input: CreateModuleInput) {
    const classGroup = await prisma.classGroup.findUnique({ where: { id: input.classGroupId } });
    if (!classGroup) throw ApiError.notFound("Class group not found");

    const code = input.code || `${input.name.replace(/\s+/g, "-").toUpperCase().slice(0, 10)}-${Date.now().toString(36)}`;

    const now = new Date();
    const defaultStart = new Date(now.getFullYear(), 0, 1);
    const defaultEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    return moduleRepository.create({
      name: input.name,
      code,
      classGroup: { connect: { id: input.classGroupId } },
      room: input.roomId ? { connect: { id: input.roomId } } : undefined,
      startDate: input.startDate ? new Date(input.startDate) : defaultStart,
      endDate: input.endDate ? new Date(input.endDate) : defaultEnd,
    });
  },

  async update(id: string, input: UpdateModuleInput) {
    const existing = await moduleRepository.findById(id);
    if (!existing) throw ApiError.notFound("Module not found");

    return moduleRepository.update(id, {
      ...(input.name && { name: input.name }),
      ...(input.code && { code: input.code }),
      ...(input.roomId !== undefined && {
        room: input.roomId ? { connect: { id: input.roomId } } : { disconnect: true },
      }),
      ...(input.startDate !== undefined && {
        startDate: input.startDate ? new Date(input.startDate) : null,
      }),
      ...(input.endDate !== undefined && {
        endDate: input.endDate ? new Date(input.endDate) : null,
      }),
    });
  },

  async delete(id: string) {
    const existing = await moduleRepository.findById(id);
    if (!existing) throw ApiError.notFound("Module not found");
    await moduleRepository.delete(id);
  },

  async createSession(input: CreateModuleSessionInput & { moduleId: string }) {
    const mod = await moduleRepository.findById(input.moduleId);
    if (!mod) throw ApiError.notFound("Module not found");
    return moduleRepository.createSession({
      moduleId: input.moduleId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
    });
  },

  async deleteSession(sessionId: string) {
    const session = await moduleRepository.findSessionById(sessionId);
    if (!session) throw ApiError.notFound("Session not found");
    await moduleRepository.deleteSession(sessionId);
  },

  async updateSession(sessionId: string, input: UpdateModuleSessionInput) {
    const session = await moduleRepository.findSessionById(sessionId);
    if (!session) throw ApiError.notFound("Session not found");

    const startTime = input.startTime ?? session.startTime;
    const endTime = input.endTime ?? session.endTime;
    if (startTime >= endTime) {
      throw ApiError.badRequest("Start time must be before end time");
    }

    return moduleRepository.updateSession(sessionId, {
      ...(input.dayOfWeek !== undefined && { dayOfWeek: input.dayOfWeek }),
      ...(input.startTime !== undefined && { startTime: input.startTime }),
      ...(input.endTime !== undefined && { endTime: input.endTime }),
    });
  },

  async assignProfessor(moduleId: string, userId: string) {
    const mod = await moduleRepository.findById(moduleId);
    if (!mod) throw ApiError.notFound("Module not found");

    const user = await userRepository.findById(userId);
    if (!user) throw ApiError.notFound("User not found");
    if (user.role.name !== "PROFESSOR") {
      throw ApiError.badRequest("User must have PROFESSOR role");
    }

    return moduleRepository.assignProfessor(moduleId, userId);
  },

  async removeProfessor(moduleId: string, userId: string) {
    await moduleRepository.removeProfessor(moduleId, userId);
  },
};
