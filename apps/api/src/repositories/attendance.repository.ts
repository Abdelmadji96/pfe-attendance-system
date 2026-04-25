import { prisma } from "../config/prisma";
import { Prisma, AttendanceStatus, VerificationResult } from "@prisma/client";

const attendanceIncludes = {
  user: {
    include: {
      role: true,
      classGroup: {
        include: {
          speciality: {
            include: { department: { include: { faculty: { include: { university: true } } } } },
          },
        },
      },
      rfidCard: true,
    },
  },
  module: { include: { room: true } },
  moduleSession: true,
} satisfies Prisma.AttendanceLogInclude;

export const attendanceRepository = {
  async findAll(params: {
    page: number;
    limit: number;
    status?: AttendanceStatus;
    verificationResult?: VerificationResult;
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
    professorModuleIds?: string[];
  }) {
    const where: Prisma.AttendanceLogWhereInput = {};

    if (params.status) where.status = params.status;
    if (params.verificationResult) where.verificationResult = params.verificationResult;
    if (params.moduleId) where.moduleId = params.moduleId;

    // Professor scope
    if (params.professorModuleIds) {
      where.moduleId = { in: params.professorModuleIds };
    }

    if (params.date) {
      const d = new Date(params.date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.checkInAt = { gte: d, lt: next };
    } else if (params.dateFrom || params.dateTo) {
      where.checkInAt = {};
      if (params.dateFrom) where.checkInAt.gte = new Date(params.dateFrom);
      if (params.dateTo) {
        const to = new Date(params.dateTo);
        to.setDate(to.getDate() + 1);
        where.checkInAt.lte = to;
      }
    }

    // Academic hierarchy filters
    if (params.classGroupId) {
      where.user = { classGroupId: params.classGroupId };
    } else if (params.specialityId) {
      where.user = { classGroup: { specialityId: params.specialityId } };
    } else if (params.departmentId) {
      where.user = { classGroup: { speciality: { departmentId: params.departmentId } } };
    } else if (params.facultyId) {
      where.user = { classGroup: { speciality: { department: { facultyId: params.facultyId } } } };
    } else if (params.universityId) {
      where.user = {
        classGroup: { speciality: { department: { faculty: { universityId: params.universityId } } } },
      };
    }

    if (params.search) {
      where.OR = [
        { rfidUid: { contains: params.search, mode: "insensitive" } },
        { user: { firstName: { contains: params.search, mode: "insensitive" } } },
        { user: { lastName: { contains: params.search, mode: "insensitive" } } },
        { user: { email: { contains: params.search, mode: "insensitive" } } },
        { user: { studentId: { contains: params.search, mode: "insensitive" } } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.attendanceLog.findMany({
        where,
        include: attendanceIncludes,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { checkInAt: "desc" },
      }),
      prisma.attendanceLog.count({ where }),
    ]);

    return { data, total };
  },

  async getStats(professorModuleIds?: string[]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const moduleFilter = professorModuleIds ? { moduleId: { in: professorModuleIds } } : {};

    const [totalUsers, todayLogs, todayFailed, avgScore] = await Promise.all([
      prisma.user.count({ where: { studentId: { not: null } } }),
      prisma.attendanceLog.count({
        where: { checkInAt: { gte: today, lt: tomorrow }, ...moduleFilter },
      }),
      prisma.attendanceLog.count({
        where: { checkInAt: { gte: today, lt: tomorrow }, status: "FAILED", ...moduleFilter },
      }),
      prisma.attendanceLog.aggregate({
        _avg: { similarityScore: true },
        where: { similarityScore: { not: null }, checkInAt: { gte: today, lt: tomorrow }, ...moduleFilter },
      }),
    ]);

    return {
      totalUsers,
      todayCheckIns: todayLogs,
      todayFailedAttempts: todayFailed,
      averageVerificationScore: Math.round((avgScore._avg.similarityScore || 0) * 100) / 100,
    };
  },

  async getCheckInsPerDay(days = 30, professorModuleIds?: string[]) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const moduleFilter = professorModuleIds ? { moduleId: { in: professorModuleIds } } : {};

    const logs = await prisma.attendanceLog.groupBy({
      by: ["checkInAt"],
      _count: { id: true },
      where: { checkInAt: { gte: since }, ...moduleFilter },
    });

    const dailyMap = new Map<string, number>();
    for (const log of logs) {
      const dateKey = log.checkInAt.toISOString().split("T")[0];
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + log._count.id);
    }

    const result: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      result.push({ date: key, count: dailyMap.get(key) || 0 });
    }
    return result;
  },

  async getPeakHours(professorModuleIds?: string[]) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const moduleFilter = professorModuleIds ? { moduleId: { in: professorModuleIds } } : {};

    const logs = await prisma.attendanceLog.findMany({
      where: { checkInAt: { gte: weekAgo }, ...moduleFilter },
      select: { checkInAt: true },
    });

    const hourCounts = new Array(24).fill(0);
    for (const log of logs) hourCounts[log.checkInAt.getHours()]++;
    return hourCounts.map((count, hour) => ({ hour, count }));
  },

  async getByGroupData(professorModuleIds?: string[]) {
    const moduleFilter = professorModuleIds ? { moduleId: { in: professorModuleIds } } : {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await prisma.attendanceLog.findMany({
      where: {
        userId: { not: null },
        checkInAt: { gte: thirtyDaysAgo },
        ...moduleFilter,
      },
      include: {
        user: { include: { classGroup: true } },
        module: true,
      },
    });

    const groupMap = new Map<string, number>();
    for (const log of logs) {
      const groupName = log.module?.name || log.user?.classGroup?.name || "Unknown";
      groupMap.set(groupName, (groupMap.get(groupName) || 0) + 1);
    }

    return Array.from(groupMap.entries())
      .map(([group, count]) => ({ group, count }))
      .sort((a, b) => b.count - a.count);
  },

  findById(id: string) {
    return prisma.attendanceLog.findUnique({ where: { id }, include: attendanceIncludes });
  },

  checkIn(data: {
    userId: string;
    rfidUid: string;
    verificationResult: VerificationResult;
    similarityScore?: number;
    moduleId?: string;
    moduleSessionId?: string;
  }) {
    return prisma.attendanceLog.create({
      data: {
        userId: data.userId,
        rfidUid: data.rfidUid,
        status: data.verificationResult === "MATCH" ? "PRESENT" : "FAILED",
        verificationResult: data.verificationResult,
        similarityScore: data.similarityScore,
        moduleId: data.moduleId,
        moduleSessionId: data.moduleSessionId,
      },
      include: attendanceIncludes,
    });
  },

  checkOut(id: string) {
    return prisma.attendanceLog.update({
      where: { id },
      data: { checkOutAt: new Date(), status: "CHECKED_OUT" },
      include: attendanceIncludes,
    });
  },
};
