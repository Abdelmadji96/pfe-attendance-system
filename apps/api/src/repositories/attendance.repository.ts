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

  async getStats(professorModuleIds?: string[], universityId?: string, departmentId?: string, dateFrom?: string, dateTo?: string) {
    let rangeStart: Date;
    let rangeEnd: Date;

    if (dateFrom) {
      rangeStart = new Date(dateFrom);
      rangeEnd = dateTo ? new Date(dateTo) : new Date();
      rangeEnd.setDate(rangeEnd.getDate() + 1);
    } else {
      rangeStart = new Date();
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd = new Date(rangeStart);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
    }

    const moduleFilter = professorModuleIds ? { moduleId: { in: professorModuleIds } } : {};
    const uniUserFilter: Prisma.UserWhereInput | undefined = departmentId
      ? { classGroup: { speciality: { departmentId } } }
      : universityId
        ? { classGroup: { speciality: { department: { faculty: { universityId } } } } }
        : undefined;
    const uniLogFilter: Prisma.AttendanceLogWhereInput = uniUserFilter
      ? { user: uniUserFilter }
      : {};

    const dateFilter = { gte: rangeStart, lt: rangeEnd };

    const [totalUsers, checkIns, failedAttempts, avgScore] = await Promise.all([
      prisma.user.count({ where: { studentId: { not: null }, ...uniUserFilter } }),
      prisma.attendanceLog.count({
        where: { checkInAt: dateFilter, ...moduleFilter, ...uniLogFilter },
      }),
      prisma.attendanceLog.count({
        where: { checkInAt: dateFilter, status: "FAILED", ...moduleFilter, ...uniLogFilter },
      }),
      prisma.attendanceLog.aggregate({
        _avg: { similarityScore: true },
        where: { similarityScore: { not: null }, checkInAt: dateFilter, ...moduleFilter, ...uniLogFilter },
      }),
    ]);

    return {
      totalUsers,
      todayCheckIns: checkIns,
      todayFailedAttempts: failedAttempts,
      averageVerificationScore: Math.round((avgScore._avg.similarityScore || 0) * 100) / 100,
    };
  },

  async getDashboardStats(professorModuleIds?: string[], universityId?: string, departmentId?: string) {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart); todayEnd.setDate(todayEnd.getDate() + 1);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart); monthStart.setDate(weekStart.getDate() - 30);

    const moduleFilter = professorModuleIds ? { moduleId: { in: professorModuleIds } } : {};
    const uniUserFilter: Prisma.UserWhereInput | undefined = departmentId
      ? { classGroup: { speciality: { departmentId } } }
      : universityId
        ? { classGroup: { speciality: { department: { faculty: { universityId } } } } }
        : undefined;
    const uniLogFilter: Prisma.AttendanceLogWhereInput = uniUserFilter ? { user: uniUserFilter } : {};
    const studentFilter: Prisma.UserWhereInput = { studentId: { not: null }, ...uniUserFilter };

    const [
      totalStudents,
      enrolledWithRfid,
      enrolledWithFace,
      todayCheckIns,
      todayFailed,
      yesterdayCheckIns,
      weekCheckIns,
      monthCheckIns,
      todayAvgScore,
      activeModules,
      todayUniqueStudents,
      recentLogs,
    ] = await Promise.all([
      prisma.user.count({ where: studentFilter }),
      prisma.user.count({ where: { ...studentFilter, rfidCard: { isNot: null } } }),
      prisma.user.count({ where: { ...studentFilter, faceTemplates: { some: {} } } }),
      prisma.attendanceLog.count({ where: { checkInAt: { gte: todayStart, lt: todayEnd }, ...moduleFilter, ...uniLogFilter } }),
      prisma.attendanceLog.count({ where: { checkInAt: { gte: todayStart, lt: todayEnd }, status: "FAILED", ...moduleFilter, ...uniLogFilter } }),
      prisma.attendanceLog.count({ where: { checkInAt: { gte: yesterdayStart, lt: todayStart }, ...moduleFilter, ...uniLogFilter } }),
      prisma.attendanceLog.count({ where: { checkInAt: { gte: weekStart, lt: todayEnd }, ...moduleFilter, ...uniLogFilter } }),
      prisma.attendanceLog.count({ where: { checkInAt: { gte: monthStart, lt: todayEnd }, ...moduleFilter, ...uniLogFilter } }),
      prisma.attendanceLog.aggregate({
        _avg: { similarityScore: true },
        where: { similarityScore: { not: null }, checkInAt: { gte: todayStart, lt: todayEnd }, ...moduleFilter, ...uniLogFilter },
      }),
      prisma.module.count({
        where: {
          startDate: { lte: now },
          endDate: { gte: now },
          ...(professorModuleIds ? { id: { in: professorModuleIds } } : {}),
        },
      }),
      prisma.attendanceLog.groupBy({
        by: ["userId"],
        where: { checkInAt: { gte: todayStart, lt: todayEnd }, status: { not: "FAILED" }, ...moduleFilter, ...uniLogFilter },
      }).then((r) => r.length),
      prisma.attendanceLog.findMany({
        where: { ...moduleFilter, ...uniLogFilter },
        include: { user: { select: { firstName: true, lastName: true, studentId: true } }, module: { select: { name: true, code: true } } },
        orderBy: { checkInAt: "desc" },
        take: 5,
      }),
    ]);

    const todaySuccessful = todayCheckIns - todayFailed;
    const attendanceRate = totalStudents > 0 ? Math.round((todayUniqueStudents / totalStudents) * 100) : 0;
    const rfidEnrollmentRate = totalStudents > 0 ? Math.round((enrolledWithRfid / totalStudents) * 100) : 0;
    const faceEnrollmentRate = totalStudents > 0 ? Math.round((enrolledWithFace / totalStudents) * 100) : 0;
    const successRate = todayCheckIns > 0 ? Math.round((todaySuccessful / todayCheckIns) * 100) : 0;
    const avgScore = Math.round((todayAvgScore._avg.similarityScore || 0) * 100);

    const todayVsYesterday = yesterdayCheckIns > 0
      ? Math.round(((todayCheckIns - yesterdayCheckIns) / yesterdayCheckIns) * 100)
      : todayCheckIns > 0 ? 100 : 0;

    return {
      totalStudents,
      todayCheckIns,
      todayFailed,
      todaySuccessful,
      yesterdayCheckIns,
      weekCheckIns,
      monthCheckIns,
      todayUniqueStudents,
      attendanceRate,
      enrolledWithRfid,
      enrolledWithFace,
      rfidEnrollmentRate,
      faceEnrollmentRate,
      successRate,
      avgVerificationScore: avgScore,
      todayVsYesterday,
      activeModules,
      recentActivity: recentLogs.map((l) => ({
        id: l.id,
        studentName: `${l.user.firstName} ${l.user.lastName}`,
        studentId: l.user.studentId,
        module: l.module?.name || null,
        status: l.status,
        verificationResult: l.verificationResult,
        time: l.checkInAt.toISOString(),
      })),
    };
  },

  async getCheckInsPerDay(professorModuleIds?: string[], universityId?: string, departmentId?: string, dateFrom?: string, dateTo?: string) {
    const since = dateFrom ? new Date(dateFrom) : new Date();
    if (!dateFrom) {
      since.setDate(since.getDate() - 30);
    }
    since.setHours(0, 0, 0, 0);

    const until = dateTo ? new Date(dateTo) : new Date();
    until.setDate(until.getDate() + 1);

    const moduleFilter = professorModuleIds ? { moduleId: { in: professorModuleIds } } : {};
    const uniLogFilter: Prisma.AttendanceLogWhereInput = departmentId
      ? { user: { classGroup: { speciality: { departmentId } } } }
      : universityId
        ? { user: { classGroup: { speciality: { department: { faculty: { universityId } } } } } }
        : {};

    const logs = await prisma.attendanceLog.groupBy({
      by: ["checkInAt"],
      _count: { id: true },
      where: { checkInAt: { gte: since, lt: until }, ...moduleFilter, ...uniLogFilter },
    });

    const dailyMap = new Map<string, number>();
    for (const log of logs) {
      const dateKey = log.checkInAt.toISOString().split("T")[0];
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + log._count.id);
    }

    const days = Math.ceil((until.getTime() - since.getTime()) / (1000 * 60 * 60 * 24));
    const result: { date: string; count: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0];
      result.push({ date: key, count: dailyMap.get(key) || 0 });
    }
    return result;
  },

  async getPeakHours(professorModuleIds?: string[], universityId?: string, departmentId?: string, dateFrom?: string, dateTo?: string) {
    const since = dateFrom ? new Date(dateFrom) : new Date();
    if (!dateFrom) {
      since.setDate(since.getDate() - 7);
    }
    since.setHours(0, 0, 0, 0);

    const until = dateTo ? new Date(dateTo) : new Date();
    until.setDate(until.getDate() + 1);

    const moduleFilter = professorModuleIds ? { moduleId: { in: professorModuleIds } } : {};
    const uniLogFilter: Prisma.AttendanceLogWhereInput = departmentId
      ? { user: { classGroup: { speciality: { departmentId } } } }
      : universityId
        ? { user: { classGroup: { speciality: { department: { faculty: { universityId } } } } } }
        : {};

    const logs = await prisma.attendanceLog.findMany({
      where: { checkInAt: { gte: since, lt: until }, ...moduleFilter, ...uniLogFilter },
      select: { checkInAt: true },
    });

    const hourCounts = new Array(24).fill(0);
    for (const log of logs) hourCounts[log.checkInAt.getHours()]++;
    return hourCounts.map((count, hour) => ({ hour, count }));
  },

  async getByGroupData(professorModuleIds?: string[], universityId?: string, departmentId?: string, dateFrom?: string, dateTo?: string) {
    const moduleFilter = professorModuleIds ? { moduleId: { in: professorModuleIds } } : {};
    const uniLogFilter: Prisma.AttendanceLogWhereInput = departmentId
      ? { user: { classGroup: { speciality: { departmentId } } } }
      : universityId
        ? { user: { classGroup: { speciality: { department: { faculty: { universityId } } } } } }
        : {};

    const since = dateFrom ? new Date(dateFrom) : new Date();
    if (!dateFrom) {
      since.setDate(since.getDate() - 30);
    }
    since.setHours(0, 0, 0, 0);

    const until = dateTo ? new Date(dateTo) : new Date();
    until.setDate(until.getDate() + 1);

    const logs = await prisma.attendanceLog.findMany({
      where: {
        userId: { not: null },
        checkInAt: { gte: since, lt: until },
        ...moduleFilter,
        ...uniLogFilter,
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
