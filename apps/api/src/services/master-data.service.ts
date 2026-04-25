import { masterDataRepository } from "../repositories/master-data.repository";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";
import type { CsvImportInput } from "@pfe/shared";

export const masterDataService = {
  getUniversities: () => masterDataRepository.findAllUniversities(),
  createUniversity: (data: { name: string; code: string }) => masterDataRepository.createUniversity(data),
  deleteUniversity: (id: string) => masterDataRepository.deleteUniversity(id),

  getFaculties: (universityId?: string) =>
    universityId
      ? masterDataRepository.findFacultiesByUniversity(universityId)
      : masterDataRepository.findAllFaculties(),
  createFaculty: (data: { name: string; universityId: string }) => masterDataRepository.createFaculty(data),
  deleteFaculty: (id: string) => masterDataRepository.deleteFaculty(id),

  getDepartments: (facultyId?: string) =>
    facultyId
      ? masterDataRepository.findDepartmentsByFaculty(facultyId)
      : masterDataRepository.findAllDepartments(),
  createDepartment: (data: { name: string; facultyId: string }) => masterDataRepository.createDepartment(data),
  deleteDepartment: (id: string) => masterDataRepository.deleteDepartment(id),

  getSpecialities: (departmentId?: string) =>
    departmentId
      ? masterDataRepository.findSpecialitiesByDepartment(departmentId)
      : masterDataRepository.findAllSpecialities(),
  createSpeciality: (data: { name: string; departmentId: string }) => masterDataRepository.createSpeciality(data),
  deleteSpeciality: (id: string) => masterDataRepository.deleteSpeciality(id),

  getClassGroups: (specialityId?: string) =>
    specialityId
      ? masterDataRepository.findClassGroupsBySpeciality(specialityId)
      : masterDataRepository.findAllClassGroups(),
  createClassGroup: (data: { name: string; level: string; specialityId: string }) =>
    masterDataRepository.createClassGroup(data),
  deleteClassGroup: (id: string) => masterDataRepository.deleteClassGroup(id),

  getRooms: (universityId?: string) =>
    universityId
      ? masterDataRepository.findRoomsByUniversity(universityId)
      : masterDataRepository.findAllRooms(),
  createRoom: (data: { name: string; building?: string; universityId: string }) =>
    masterDataRepository.createRoom(data),
  deleteRoom: (id: string) => masterDataRepository.deleteRoom(id),

  async importCsv(input: CsvImportInput) {
    const { entityType, rows } = input;
    let created = 0;

    switch (entityType) {
      case "university":
        for (const row of rows) {
          if (!row.name || !row.code) continue;
          await prisma.university.upsert({
            where: { code: row.code },
            update: { name: row.name },
            create: { name: row.name, code: row.code },
          });
          created++;
        }
        break;

      case "faculty":
        for (const row of rows) {
          if (!row.name || !row.universityCode) continue;
          const uni = await prisma.university.findUnique({ where: { code: row.universityCode } });
          if (!uni) continue;
          await prisma.faculty.create({ data: { name: row.name, universityId: uni.id } });
          created++;
        }
        break;

      case "department":
        for (const row of rows) {
          if (!row.name || !row.facultyName || !row.universityCode) continue;
          const fac = await prisma.faculty.findFirst({
            where: { name: row.facultyName, university: { code: row.universityCode } },
          });
          if (!fac) continue;
          await prisma.department.create({ data: { name: row.name, facultyId: fac.id } });
          created++;
        }
        break;

      case "speciality":
        for (const row of rows) {
          if (!row.name || !row.departmentName) continue;
          const dept = await prisma.department.findFirst({ where: { name: row.departmentName } });
          if (!dept) continue;
          await prisma.speciality.create({ data: { name: row.name, departmentId: dept.id } });
          created++;
        }
        break;

      case "classGroup":
        for (const row of rows) {
          if (!row.name || !row.level || !row.specialityName) continue;
          const spec = await prisma.speciality.findFirst({ where: { name: row.specialityName } });
          if (!spec) continue;
          await prisma.classGroup.create({
            data: { name: row.name, level: row.level, specialityId: spec.id },
          });
          created++;
        }
        break;

      case "room":
        for (const row of rows) {
          if (!row.name || !row.universityCode) continue;
          const uni = await prisma.university.findUnique({ where: { code: row.universityCode } });
          if (!uni) continue;
          await prisma.room.create({
            data: { name: row.name, building: row.building, universityId: uni.id },
          });
          created++;
        }
        break;

      default:
        throw ApiError.badRequest(`Unknown entity type: ${entityType}`);
    }

    return { created, total: rows.length };
  },
};
