import { z } from "zod";
import { AttendanceStatus, RoleName, VerificationResult } from "./enums";

// ── Auth ──

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerAdminSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// ── Master Data ──

export const createUniversitySchema = z.object({
  name: z.string().min(1, "University name is required"),
  code: z.string().optional(),
});

export const createFacultySchema = z.object({
  name: z.string().min(1, "Faculty name is required"),
  universityId: z.string().min(1, "University is required"),
});

export const createDepartmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  facultyId: z.string().min(1, "Faculty is required"),
});

export const createSpecialitySchema = z.object({
  name: z.string().min(1, "Speciality name is required"),
  departmentId: z.string().min(1, "Department is required"),
});

export const createClassGroupSchema = z.object({
  name: z.string().min(1, "Class/Group name is required"),
  level: z.string().min(1, "Level is required"),
  specialityId: z.string().min(1, "Speciality is required"),
});

export const createRoomSchema = z.object({
  name: z.string().min(1, "Room name is required"),
  building: z.string().optional(),
  universityId: z.string().min(1, "University is required"),
});

export const csvImportSchema = z.object({
  entityType: z.enum([
    "university",
    "faculty",
    "department",
    "speciality",
    "classGroup",
    "room",
  ]),
  rows: z.array(z.record(z.string())).min(1, "At least one row is required"),
});

// ── Users (Students) ──

export const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  studentId: z.string().min(1, "Student ID is required"),
  classGroupId: z.string().min(1, "Class/Group is required"),
  rfidUid: z.string().optional(),
});

export const createProfessorSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  classGroupId: z.string().optional(),
  studentId: z.string().optional(),
});

// ── Modules ──

export const createModuleSchema = z.object({
  name: z.string().min(1, "Module name is required"),
  code: z.string().optional(),
  classGroupId: z.string().min(1, "Class/Group is required"),
  roomId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const updateModuleSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  roomId: z.string().nullable().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const createModuleSessionSchema = z.object({
  moduleId: z.string().optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM"),
});

export const assignProfessorSchema = z.object({
  userId: z.string().min(1, "Professor user ID is required"),
});

// ── RFID ──

export const rfidScanSchema = z.object({
  uid: z.string().min(1, "RFID UID is required"),
});

export const rfidAssignSchema = z.object({
  uid: z.string().min(1, "RFID UID is required"),
  userId: z.string().min(1, "User ID is required"),
});

// ── Verification ──

export const verifySchema = z.object({
  rfidUid: z.string().min(1, "RFID UID is required"),
  liveImageBase64: z.string().optional(),
});

export const mockEntrySchema = z.object({
  rfidUid: z.string().min(1, "RFID UID is required"),
  simulateMatch: z.boolean().default(true),
});

// ── Attendance ──

export const attendanceFilterSchema = z.object({
  status: z.nativeEnum(AttendanceStatus).optional(),
  verificationResult: z.nativeEnum(VerificationResult).optional(),
  search: z.string().optional(),
  universityId: z.string().optional(),
  facultyId: z.string().optional(),
  departmentId: z.string().optional(),
  specialityId: z.string().optional(),
  classGroupId: z.string().optional(),
  moduleId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  date: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const checkInSchema = z.object({
  userId: z.string().min(1),
  rfidUid: z.string().min(1),
  verificationResult: z.nativeEnum(VerificationResult),
  similarityScore: z.number().optional(),
  moduleId: z.string().optional(),
  moduleSessionId: z.string().optional(),
});

export const checkOutSchema = z.object({
  attendanceLogId: z.string().min(1),
});

// ── Settings ──

export const updateSettingsSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string().min(1),
      value: z.string().min(1),
    })
  ),
});

// ── Staff ──

export const createStaffSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  role: z.nativeEnum(RoleName, { required_error: "Role is required" }),
  universityId: z.string().optional(),
  facultyId: z.string().optional(),
  departmentId: z.string().optional(),
  departmentIds: z.array(z.string()).optional(),
});

export const updateStaffSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ── Roles ──

export const updateUserRoleSchema = z.object({
  roleId: z.string().min(1, "Role ID is required"),
});
