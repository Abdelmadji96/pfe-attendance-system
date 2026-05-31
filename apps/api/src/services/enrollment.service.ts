import { z } from "zod";
import { enrollmentCompleteSchema } from "@pfe/shared";
import { prisma } from "../config/prisma";
import { enrollmentRfidStore } from "../stores/enrollment-rfid.store";
import { rfidRepository } from "../repositories/rfid.repository";
import { userRepository } from "../repositories/user.repository";
import { ApiError } from "../utils/api-error";
import { mapUserToDto } from "./user.service";

type EnrollmentCompleteInput = z.infer<typeof enrollmentCompleteSchema>;

function normalizeUid(uid: string): string {
  return uid.trim().toUpperCase();
}

export const enrollmentService = {
  recordRfidScan(uid: string, deviceId?: string) {
    const normalized = normalizeUid(uid);
    if (!normalized) {
      throw ApiError.badRequest("RFID UID is required");
    }

    const scan = enrollmentRfidStore.set({
      uid: normalized,
      deviceId: deviceId?.trim() || "",
    });

    return {
      uid: scan.uid,
      scannedAt: scan.scannedAt.toISOString(),
    };
  },

  getLatestRfidScan() {
    const scan = enrollmentRfidStore.get();
    if (!scan) {
      return { uid: null as string | null };
    }

    return {
      uid: scan.uid,
      deviceId: scan.deviceId,
      scannedAt: scan.scannedAt.toISOString(),
    };
  },

  clearLatestRfidScan() {
    enrollmentRfidStore.clear();
  },

  async complete(input: EnrollmentCompleteInput) {
    const rfidUid = normalizeUid(input.rfidUid);
    if (!rfidUid) {
      throw ApiError.badRequest("RFID UID is required");
    }

    const existingCard = await rfidRepository.findByUid(rfidUid);
    if (existingCard) {
      throw ApiError.conflict("RFID card is already registered");
    }

    const email = input.userInfo.email?.trim() || null;
    const studentCode = input.academicInfo.studentCode?.trim() || null;

    if (email) {
      const existingEmail = await userRepository.findByEmail(email);
      if (existingEmail) {
        throw ApiError.conflict("Email already registered");
      }
    }

    if (studentCode) {
      const existingStudent = await userRepository.findByStudentId(studentCode);
      if (existingStudent) {
        throw ApiError.conflict("Student ID already exists");
      }
    }

    const studentRole = await prisma.role.findFirst({ where: { name: "STUDENT" } });
    if (!studentRole) {
      throw ApiError.internal("STUDENT role not found — run db:seed or add STUDENT to roles");
    }

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          firstName: input.userInfo.firstName,
          lastName: input.userInfo.lastName,
          email,
          phone: input.userInfo.phone,
          studentId: studentCode,
          classGroup: { connect: { id: input.academicInfo.classGroupId } },
          role: { connect: { id: studentRole.id } },
          rfidCard: { create: { uid: rfidUid } },
        },
        include: {
          role: true,
          classGroup: {
            include: {
              speciality: {
                include: {
                  department: { include: { faculty: { include: { university: true } } } },
                },
              },
            },
          },
          rfidCard: true,
          professorModules: { include: { module: true } },
          professorDepartments: { include: { department: { include: { faculty: true } } } },
          university: true,
          faculty: true,
          department: true,
        },
      });

      if (input.faceEnrollment?.embedding?.length) {
        await tx.faceTemplate.create({
          data: {
            userId: created.id,
            embedding: input.faceEnrollment.embedding,
            imagePath: input.faceEnrollment.imagePath ?? "enrollment/placeholder.jpg",
            qualityScore: 0.8,
          },
        });
      }

      return created;
    });

    return mapUserToDto(user);
  },
};
