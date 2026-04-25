import { z } from "zod";
import type {
  AttendanceStatus,
  BuzzerFeedback,
  LedFeedback,
  Permission,
  RoleName,
  VerificationResult,
} from "./enums";
import type {
  loginSchema,
  registerAdminSchema,
  createUserSchema,
  createProfessorSchema,
  updateUserSchema,
  rfidScanSchema,
  rfidAssignSchema,
  verifySchema,
  mockEntrySchema,
  attendanceFilterSchema,
  checkInSchema,
  updateSettingsSchema,
  updateUserRoleSchema,
  createUniversitySchema,
  createFacultySchema,
  createDepartmentSchema,
  createSpecialitySchema,
  createClassGroupSchema,
  createRoomSchema,
  createModuleSchema,
  updateModuleSchema,
  createModuleSessionSchema,
  assignProfessorSchema,
  csvImportSchema,
} from "./schemas";

// ── Inferred request types ──

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterAdminInput = z.infer<typeof registerAdminSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateProfessorInput = z.infer<typeof createProfessorSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type RfidScanInput = z.infer<typeof rfidScanSchema>;
export type RfidAssignInput = z.infer<typeof rfidAssignSchema>;
export type VerifyInput = z.infer<typeof verifySchema>;
export type MockEntryInput = z.infer<typeof mockEntrySchema>;
export type AttendanceFilterInput = z.infer<typeof attendanceFilterSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type CreateUniversityInput = z.infer<typeof createUniversitySchema>;
export type CreateFacultyInput = z.infer<typeof createFacultySchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type CreateSpecialityInput = z.infer<typeof createSpecialitySchema>;
export type CreateClassGroupInput = z.infer<typeof createClassGroupSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
export type CreateModuleSessionInput = z.infer<typeof createModuleSessionSchema>;
export type AssignProfessorInput = z.infer<typeof assignProfessorSchema>;
export type CsvImportInput = z.infer<typeof csvImportSchema>;

// ── API response wrappers ──

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── Master Data DTOs ──

export interface UniversityDto {
  id: string;
  name: string;
  code: string;
  createdAt: string;
}

export interface FacultyDto {
  id: string;
  name: string;
  universityId: string;
  university?: UniversityDto;
}

export interface DepartmentDto {
  id: string;
  name: string;
  facultyId: string;
  faculty?: FacultyDto;
}

export interface SpecialityDto {
  id: string;
  name: string;
  departmentId: string;
  department?: DepartmentDto;
}

export interface ClassGroupDto {
  id: string;
  name: string;
  level: string;
  specialityId: string;
  speciality?: SpecialityDto;
}

export interface RoomDto {
  id: string;
  name: string;
  building: string | null;
  universityId: string;
}

// ── Module DTOs ──

export interface ModuleSessionDto {
  id: string;
  moduleId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface ModuleDto {
  id: string;
  name: string;
  code: string;
  classGroupId: string;
  classGroup?: ClassGroupDto;
  roomId: string | null;
  room?: RoomDto | null;
  startDate: string;
  endDate: string;
  sessions?: ModuleSessionDto[];
  professors?: ProfessorModuleDto[];
}

export interface ProfessorModuleDto {
  id: string;
  userId: string;
  moduleId: string;
  user?: UserDto;
  module?: ModuleDto;
}

// ── Domain types ──

export interface RoleDto {
  id: string;
  name: RoleName;
  permissions: Permission[];
  createdAt: string;
}

export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  studentId: string | null;
  classGroupId: string | null;
  classGroup: ClassGroupDto | null;
  isActive: boolean;
  role: RoleDto;
  rfidCard: RfidCardDto | null;
  professorModules?: ProfessorModuleDto[];
  createdAt: string;
  updatedAt: string;
}

export interface RfidCardDto {
  id: string;
  uid: string;
  isActive: boolean;
  assignedAt: string;
}

export interface FaceTemplateDto {
  id: string;
  userId: string;
  imagePath: string;
  qualityScore: number;
  createdAt: string;
}

export interface AttendanceLogDto {
  id: string;
  userId: string | null;
  user: UserDto | null;
  rfidUid: string;
  checkInAt: string;
  checkOutAt: string | null;
  status: AttendanceStatus;
  verificationResult: VerificationResult;
  similarityScore: number | null;
  moduleId: string | null;
  module: ModuleDto | null;
  moduleSessionId: string | null;
  moduleSession: ModuleSessionDto | null;
  createdAt: string;
}

export interface AccessLogDto {
  id: string;
  userId: string | null;
  rfidUid: string;
  result: VerificationResult;
  reason: string;
  ledFeedback: LedFeedback;
  buzzerFeedback: BuzzerFeedback;
  doorUnlocked: boolean;
  similarityScore: number | null;
  createdAt: string;
}

export interface SettingDto {
  id: string;
  key: string;
  value: string;
}

// ── Auth types ──

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleDto;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

// ── Verification result ──

export interface SessionInfo {
  moduleId: string;
  moduleName: string;
  moduleCode: string;
  sessionId: string;
  roomName: string | null;
  startTime: string;
  endTime: string;
}

export interface VerificationResponse {
  userFound: boolean;
  user: UserDto | null;
  similarityScore: number | null;
  verificationResult: VerificationResult;
  ledFeedback: LedFeedback;
  buzzerFeedback: BuzzerFeedback;
  doorUnlocked: boolean;
  attendanceMarked: boolean;
  sessionInfo: SessionInfo | null;
  message: string;
}

// ── Chart data types ──

export interface CheckInsPerDay {
  date: string;
  count: number;
}

export interface PeakHourData {
  hour: number;
  count: number;
}

export interface ByGroupData {
  group: string;
  count: number;
}

export interface AttendanceStats {
  totalUsers: number;
  todayCheckIns: number;
  todayFailedAttempts: number;
  averageVerificationScore: number;
}
