import { prisma } from "../config/prisma";

export const masterDataRepository = {
  // ── Universities ──
  findAllUniversities() {
    return prisma.university.findMany({ orderBy: { name: "asc" } });
  },
  createUniversity(data: { name: string; code: string }) {
    return prisma.university.create({ data });
  },
  deleteUniversity(id: string) {
    return prisma.university.delete({ where: { id } });
  },

  // ── Faculties ──
  findFacultiesByUniversity(universityId: string) {
    return prisma.faculty.findMany({
      where: { universityId },
      include: { university: true },
      orderBy: { name: "asc" },
    });
  },
  findAllFaculties() {
    return prisma.faculty.findMany({
      include: { university: true },
      orderBy: { name: "asc" },
    });
  },
  createFaculty(data: { name: string; universityId: string }) {
    return prisma.faculty.create({ data, include: { university: true } });
  },
  deleteFaculty(id: string) {
    return prisma.faculty.delete({ where: { id } });
  },

  // ── Departments ──
  findDepartmentsByFaculty(facultyId: string) {
    return prisma.department.findMany({
      where: { facultyId },
      include: { faculty: { include: { university: true } } },
      orderBy: { name: "asc" },
    });
  },
  findAllDepartments() {
    return prisma.department.findMany({
      include: { faculty: { include: { university: true } } },
      orderBy: { name: "asc" },
    });
  },
  createDepartment(data: { name: string; facultyId: string }) {
    return prisma.department.create({ data, include: { faculty: true } });
  },
  deleteDepartment(id: string) {
    return prisma.department.delete({ where: { id } });
  },

  // ── Specialities ──
  findSpecialitiesByDepartment(departmentId: string) {
    return prisma.speciality.findMany({
      where: { departmentId },
      include: { department: { include: { faculty: { include: { university: true } } } } },
      orderBy: { name: "asc" },
    });
  },
  findAllSpecialities() {
    return prisma.speciality.findMany({
      include: { department: { include: { faculty: { include: { university: true } } } } },
      orderBy: { name: "asc" },
    });
  },
  createSpeciality(data: { name: string; departmentId: string }) {
    return prisma.speciality.create({ data, include: { department: true } });
  },
  deleteSpeciality(id: string) {
    return prisma.speciality.delete({ where: { id } });
  },

  // ── Class Groups ──
  findClassGroupsBySpeciality(specialityId: string) {
    return prisma.classGroup.findMany({
      where: { specialityId },
      include: {
        speciality: {
          include: { department: { include: { faculty: { include: { university: true } } } } },
        },
        _count: { select: { students: true, modules: true } },
      },
      orderBy: { name: "asc" },
    });
  },
  findAllClassGroups() {
    return prisma.classGroup.findMany({
      include: {
        speciality: {
          include: { department: { include: { faculty: { include: { university: true } } } } },
        },
        _count: { select: { students: true, modules: true } },
      },
      orderBy: { name: "asc" },
    });
  },
  createClassGroup(data: { name: string; level: string; specialityId: string }) {
    return prisma.classGroup.create({
      data,
      include: { speciality: true },
    });
  },
  deleteClassGroup(id: string) {
    return prisma.classGroup.delete({ where: { id } });
  },

  // ── Rooms ──
  findRoomsByUniversity(universityId: string) {
    return prisma.room.findMany({
      where: { universityId },
      orderBy: { name: "asc" },
    });
  },
  findAllRooms() {
    return prisma.room.findMany({
      include: { university: true },
      orderBy: { name: "asc" },
    });
  },
  createRoom(data: { name: string; building?: string; universityId: string }) {
    return prisma.room.create({ data });
  },
  deleteRoom(id: string) {
    return prisma.room.delete({ where: { id } });
  },
};
