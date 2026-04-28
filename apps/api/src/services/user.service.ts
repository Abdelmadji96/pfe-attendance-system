import { userRepository } from "../repositories/user.repository";
import { ApiError } from "../utils/api-error";
import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";
import type { CreateUserInput, UpdateUserInput } from "@pfe/shared";
import { Permission } from "@pfe/shared";

function mapUserToDto(user: any) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    studentId: user.studentId,
    classGroupId: user.classGroupId,
    classGroup: user.classGroup
      ? {
          id: user.classGroup.id,
          name: user.classGroup.name,
          level: user.classGroup.level,
          specialityId: user.classGroup.specialityId,
          speciality: user.classGroup.speciality
            ? {
                id: user.classGroup.speciality.id,
                name: user.classGroup.speciality.name,
                departmentId: user.classGroup.speciality.departmentId,
                department: user.classGroup.speciality.department
                  ? {
                      id: user.classGroup.speciality.department.id,
                      name: user.classGroup.speciality.department.name,
                      facultyId: user.classGroup.speciality.department.facultyId,
                      faculty: user.classGroup.speciality.department.faculty
                        ? {
                            id: user.classGroup.speciality.department.faculty.id,
                            name: user.classGroup.speciality.department.faculty.name,
                            universityId: user.classGroup.speciality.department.faculty.universityId,
                            university: user.classGroup.speciality.department.faculty.university
                              ? {
                                  id: user.classGroup.speciality.department.faculty.university.id,
                                  name: user.classGroup.speciality.department.faculty.university.name,
                                  code: user.classGroup.speciality.department.faculty.university.code,
                                  createdAt: user.classGroup.speciality.department.faculty.university.createdAt?.toISOString(),
                                }
                              : undefined,
                          }
                        : undefined,
                    }
                  : undefined,
              }
            : undefined,
        }
      : null,
    isActive: user.isActive,
    role: {
      id: user.role.id,
      name: user.role.name,
      permissions: user.role.permissions,
      createdAt: user.role.createdAt.toISOString(),
    },
    rfidCard: user.rfidCard
      ? {
          id: user.rfidCard.id,
          uid: user.rfidCard.uid,
          isActive: user.rfidCard.isActive,
          assignedAt: user.rfidCard.assignedAt.toISOString(),
        }
      : null,
    universityId: user.universityId ?? null,
    university: user.university
      ? { id: user.university.id, name: user.university.name, code: user.university.code, createdAt: user.university.createdAt?.toISOString() }
      : null,
    facultyId: user.facultyId ?? null,
    faculty: user.faculty
      ? { id: user.faculty.id, name: user.faculty.name, universityId: user.faculty.universityId }
      : null,
    departmentId: user.departmentId ?? null,
    department: user.department
      ? { id: user.department.id, name: user.department.name, facultyId: user.department.facultyId }
      : null,
    createdById: user.createdById ?? null,
    professorModules: user.professorModules?.map((pm: any) => ({
      id: pm.id,
      userId: pm.userId,
      moduleId: pm.moduleId,
      module: pm.module ? { id: pm.module.id, name: pm.module.name, code: pm.module.code } : undefined,
    })),
    professorDepartments: user.professorDepartments?.map((pd: any) => ({
      id: pd.id,
      userId: pd.userId,
      departmentId: pd.departmentId,
      department: pd.department
        ? {
            id: pd.department.id,
            name: pd.department.name,
            facultyId: pd.department.facultyId,
            faculty: pd.department.faculty
              ? { id: pd.department.faculty.id, name: pd.department.faculty.name, universityId: pd.department.faculty.universityId }
              : undefined,
          }
        : undefined,
    })),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export const userService = {
  async getAll(params: {
    page: number;
    limit: number;
    search?: string;
    classGroupId?: string;
    specialityId?: string;
    departmentId?: string;
    facultyId?: string;
    universityId?: string;
  }) {
    const { data, total } = await userRepository.findAll(params);
    return {
      data: data.map(mapUserToDto),
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  },

  async getByProfessorScope(professorId: string, params: { page: number; limit: number; search?: string }) {
    const { data, total } = await userRepository.findByProfessorScope(professorId, params);
    return {
      data: data.map(mapUserToDto),
      pagination: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    };
  },

  async getById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw ApiError.notFound("User not found");
    return mapUserToDto(user);
  },

  async create(input: CreateUserInput) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw ApiError.conflict("Email already registered");

    if (input.studentId) {
      const existingStudent = await userRepository.findByStudentId(input.studentId);
      if (existingStudent) throw ApiError.conflict("Student ID already exists");
    }

    const defaultRole = await prisma.role.findFirst({ where: { name: "PROFESSOR" } });
    const studentRole = defaultRole; // Students get a basic role; adjust as needed
    if (!studentRole) throw ApiError.internal("Default role not found");

    const createData: Prisma.UserCreateInput = {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      studentId: input.studentId,
      classGroup: { connect: { id: input.classGroupId } },
      role: { connect: { id: studentRole.id } },
    };

    if (input.rfidUid) {
      createData.rfidCard = { create: { uid: input.rfidUid } };
    }

    const user = await userRepository.create(createData);
    return mapUserToDto(user);
  },

  async update(id: string, input: UpdateUserInput) {
    const existing = await userRepository.findById(id);
    if (!existing) throw ApiError.notFound("User not found");

    const updateData: Prisma.UserUpdateInput = {};
    if (input.firstName) updateData.firstName = input.firstName;
    if (input.lastName) updateData.lastName = input.lastName;
    if (input.email) updateData.email = input.email;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.studentId) updateData.studentId = input.studentId;
    if (input.classGroupId) updateData.classGroup = { connect: { id: input.classGroupId } };

    const user = await userRepository.update(id, updateData);
    return mapUserToDto(user);
  },

  async delete(id: string) {
    const existing = await userRepository.findById(id);
    if (!existing) throw ApiError.notFound("User not found");
    await userRepository.delete(id);
  },

  async updateRole(userId: string, roleId: string) {
    const existing = await userRepository.findById(userId);
    if (!existing) throw ApiError.notFound("User not found");

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw ApiError.notFound("Role not found");

    const user = await userRepository.updateRole(userId, roleId);
    return mapUserToDto(user);
  },
};

export { mapUserToDto };
