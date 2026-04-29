import { attendanceRepository } from "../repositories/attendance.repository";
import { moduleRepository } from "../repositories/module.repository";
import { ApiError } from "../utils/api-error";
import { mapUserToDto } from "./user.service";
import { AttendanceStatus, VerificationResult } from "@prisma/client";

function mapAttendanceToDto(log: any) {
  return {
    id: log.id,
    userId: log.userId,
    user: log.user ? mapUserToDto(log.user) : null,
    rfidUid: log.rfidUid,
    checkInAt: log.checkInAt.toISOString(),
    checkOutAt: log.checkOutAt?.toISOString() || null,
    status: log.status,
    verificationResult: log.verificationResult,
    similarityScore: log.similarityScore,
    moduleId: log.moduleId,
    module: log.module
      ? { id: log.module.id, name: log.module.name, code: log.module.code, room: log.module.room }
      : null,
    moduleSessionId: log.moduleSessionId,
    moduleSession: log.moduleSession
      ? {
          id: log.moduleSession.id,
          moduleId: log.moduleSession.moduleId,
          dayOfWeek: log.moduleSession.dayOfWeek,
          startTime: log.moduleSession.startTime,
          endTime: log.moduleSession.endTime,
        }
      : null,
    createdAt: log.createdAt.toISOString(),
  };
}

async function getProfessorModuleIds(userId: string): Promise<string[]> {
  const pms = await moduleRepository.findProfessorModuleIds(userId);
  return pms.map((pm) => pm.moduleId);
}

export const attendanceService = {
  async getAll(params: {
    page: number;
    limit: number;
    status?: string;
    verificationResult?: string;
    search?: string;
    classGroupId?: string;
    specialityId?: string;
    departmentId?: string;
    facultyId?: string;
    universityId?: string;
    moduleId?: string;
    dateFrom?: string;
    dateTo?: string;
    date?: string;
    professorUserId?: string;
  }) {
    let professorModuleIds: string[] | undefined;
    if (params.professorUserId) {
      professorModuleIds = await getProfessorModuleIds(params.professorUserId);
      if (professorModuleIds.length === 0) {
        return { data: [], pagination: { page: params.page, limit: params.limit, total: 0, totalPages: 0 } };
      }
    }

    const { data, total } = await attendanceRepository.findAll({
      ...params,
      status: params.status as AttendanceStatus | undefined,
      verificationResult: params.verificationResult as VerificationResult | undefined,
      professorModuleIds,
    });

    return {
      data: data.map(mapAttendanceToDto),
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  },

  async getStats(professorUserId?: string, universityId?: string, departmentId?: string, dateFrom?: string, dateTo?: string) {
    let professorModuleIds: string[] | undefined;
    if (professorUserId) {
      professorModuleIds = await getProfessorModuleIds(professorUserId);
    }
    return attendanceRepository.getStats(professorModuleIds, universityId, departmentId, dateFrom, dateTo);
  },

  async getDashboardStats(professorUserId?: string, universityId?: string, departmentId?: string) {
    let professorModuleIds: string[] | undefined;
    if (professorUserId) {
      professorModuleIds = await getProfessorModuleIds(professorUserId);
    }
    return attendanceRepository.getDashboardStats(professorModuleIds, universityId, departmentId);
  },

  async getCheckInsPerDay(professorUserId?: string, universityId?: string, departmentId?: string, dateFrom?: string, dateTo?: string) {
    let professorModuleIds: string[] | undefined;
    if (professorUserId) professorModuleIds = await getProfessorModuleIds(professorUserId);
    return attendanceRepository.getCheckInsPerDay(professorModuleIds, universityId, departmentId, dateFrom, dateTo);
  },

  async getPeakHours(professorUserId?: string, universityId?: string, departmentId?: string, dateFrom?: string, dateTo?: string) {
    let professorModuleIds: string[] | undefined;
    if (professorUserId) professorModuleIds = await getProfessorModuleIds(professorUserId);
    return attendanceRepository.getPeakHours(professorModuleIds, universityId, departmentId, dateFrom, dateTo);
  },

  async getByGroupData(professorUserId?: string, universityId?: string, departmentId?: string, dateFrom?: string, dateTo?: string) {
    let professorModuleIds: string[] | undefined;
    if (professorUserId) professorModuleIds = await getProfessorModuleIds(professorUserId);
    return attendanceRepository.getByGroupData(professorModuleIds, universityId, departmentId, dateFrom, dateTo);
  },

  async checkIn(data: {
    userId: string;
    rfidUid: string;
    verificationResult: VerificationResult;
    similarityScore?: number;
    moduleId?: string;
    moduleSessionId?: string;
  }) {
    const log = await attendanceRepository.checkIn(data);
    return mapAttendanceToDto(log);
  },

  async checkOut(attendanceLogId: string) {
    const existing = await attendanceRepository.findById(attendanceLogId);
    if (!existing) throw ApiError.notFound("Attendance log not found");
    if (existing.checkOutAt) throw ApiError.badRequest("Already checked out");
    const log = await attendanceRepository.checkOut(attendanceLogId);
    return mapAttendanceToDto(log);
  },
};
