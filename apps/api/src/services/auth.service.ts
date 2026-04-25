import { userRepository } from "../repositories/user.repository";
import { hashPassword, comparePassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { ApiError } from "../utils/api-error";
import { prisma } from "../config/prisma";
import { RoleName } from "@prisma/client";
import type { AuthResponse, AuthUser } from "@pfe/shared";
import { Permission } from "@pfe/shared";

function toAuthUser(user: any): AuthUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: {
      id: user.role.id,
      name: user.role.name,
      permissions: user.role.permissions as Permission[],
      createdAt: user.role.createdAt.toISOString(),
    },
  };
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await userRepository.findByEmail(email);

    if (!user || !user.passwordHash) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    if (!user.isActive) {
      throw ApiError.unauthorized("Account is deactivated");
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    const token = signToken({ userId: user.id, email: user.email });
    return { user: toAuthUser(user), token };
  },

  async registerAdmin(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) throw ApiError.conflict("Email already registered");

    const adminRole = await prisma.role.findUnique({ where: { name: RoleName.SUPER_ADMIN } });
    if (!adminRole) throw ApiError.internal("Admin role not found. Run seed first.");

    const passwordHash = await hashPassword(data.password);
    const user = await userRepository.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash,
      role: { connect: { id: adminRole.id } },
    });

    const token = signToken({ userId: user.id, email: user.email });
    return { user: toAuthUser(user), token };
  },

  async getMe(userId: string): Promise<AuthUser> {
    const user = await userRepository.findById(userId);
    if (!user) throw ApiError.notFound("User not found");
    return toAuthUser(user);
  },
};
