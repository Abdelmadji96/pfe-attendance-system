import { Permission, RoleName } from "./enums";

export const SIMILARITY_THRESHOLD = 0.85;
export const EMBEDDING_DIMENSION = 128;
export const MIN_FACE_IMAGES = 10;
export const MAX_FACE_IMAGES = 20;
export const MAX_FILE_SIZE_MB = 5;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
} as const;

export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  [RoleName.MINISTER]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ATTENDANCE,
    Permission.VIEW_CHARTS,
    Permission.VIEW_USERS,
    Permission.MANAGE_SETTINGS,
  ],

  [RoleName.SUPER_ADMIN]: Object.values(Permission),

  [RoleName.SUPER_HR_ADMIN]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ATTENDANCE,
    Permission.VIEW_USERS,
    Permission.MANAGE_USERS,
    Permission.MANAGE_STAFF,
    Permission.ACCESS_ENROLLMENT,
    Permission.VIEW_CHARTS,
    Permission.ACCESS_VERIFICATION,
    Permission.MANAGE_MASTER_DATA,
    Permission.MANAGE_MODULES,
  ],

  [RoleName.HR_ADMIN]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ATTENDANCE,
    Permission.VIEW_USERS,
    Permission.MANAGE_USERS,
    Permission.ACCESS_ENROLLMENT,
    Permission.VIEW_CHARTS,
    Permission.ACCESS_VERIFICATION,
    Permission.MANAGE_MASTER_DATA,
    Permission.MANAGE_MODULES,
  ],

  [RoleName.PROFESSOR]: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_OWN_STUDENTS,
    Permission.VIEW_OWN_ATTENDANCE,
    Permission.VIEW_CHARTS,
  ],
};

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", permission: Permission.VIEW_DASHBOARD, icon: "LayoutDashboard" },
  { label: "Attendance", href: "/attendance", permission: Permission.VIEW_ATTENDANCE, icon: "ClipboardList" },
  { label: "Master Data", href: "/master-data", permission: Permission.MANAGE_MASTER_DATA, icon: "Database" },
  { label: "Modules", href: "/modules", permission: Permission.MANAGE_MODULES, icon: "BookOpen" },
  { label: "Enrollment", href: "/enrollment", permission: Permission.ACCESS_ENROLLMENT, icon: "UserPlus" },
  { label: "Staff", href: "/staff", permission: Permission.MANAGE_STAFF, icon: "UserCog" },
  { label: "Students", href: "/users", permission: Permission.VIEW_USERS, icon: "Users" },
  { label: "My Students", href: "/attendance", permission: Permission.VIEW_OWN_ATTENDANCE, icon: "GraduationCap", hideIfPermission: Permission.VIEW_ATTENDANCE },
  { label: "Verification Test", href: "/verification", permission: Permission.ACCESS_VERIFICATION, icon: "ScanFace" },
  { label: "Settings", href: "/settings", permission: Permission.VIEW_DASHBOARD, icon: "Settings" },
  { label: "Roles", href: "/roles", permission: Permission.MANAGE_ROLES, icon: "Shield" },
] as const;
