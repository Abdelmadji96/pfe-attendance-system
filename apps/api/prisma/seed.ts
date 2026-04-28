import { PrismaClient, RoleName } from "@prisma/client";
import { hashPassword } from "../src/utils/password";
import { ROLE_PERMISSIONS, SIMILARITY_THRESHOLD, EMBEDDING_DIMENSION } from "@pfe/shared";

const prisma = new PrismaClient();

function randomEmbedding(): number[] {
  return Array.from({ length: EMBEDDING_DIMENSION }, () => Math.random() * 2 - 1);
}

async function main() {
  console.log("Seeding database...");

  // ── Roles ──
  const roles = await Promise.all(
    Object.entries(ROLE_PERMISSIONS).map(([name, perms]) =>
      prisma.role.upsert({
        where: { name: name as RoleName },
        update: { permissions: perms },
        create: { name: name as RoleName, permissions: perms },
      })
    )
  );
  const roleMap = Object.fromEntries(roles.map((r) => [r.name, r]));
  console.log(`  Created ${roles.length} roles`);

  // ── University ──
  const university = await prisma.university.upsert({
    where: { code: "USTO" },
    update: {},
    create: { name: "University of Science and Technology - Oran", code: "USTO" },
  });

  // ── Faculties ──
  const faculties = await Promise.all([
    prisma.faculty.create({ data: { name: "Faculty of Computer Science", universityId: university.id } }),
    prisma.faculty.create({ data: { name: "Faculty of Mathematics", universityId: university.id } }),
  ]);
  const csFaculty = faculties[0];

  // ── Departments ──
  const departments = await Promise.all([
    prisma.department.create({ data: { name: "Software Engineering", facultyId: csFaculty.id } }),
    prisma.department.create({ data: { name: "Artificial Intelligence", facultyId: csFaculty.id } }),
    prisma.department.create({ data: { name: "Applied Mathematics", facultyId: faculties[1].id } }),
  ]);
  const seDept = departments[0];
  const aiDept = departments[1];

  // ── Super Admin ──
  const adminHash = await hashPassword("admin123");
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@university.edu" },
    update: {},
    create: {
      firstName: "Super",
      lastName: "Admin",
      email: "admin@university.edu",
      passwordHash: adminHash,
      roleId: roleMap.SUPER_ADMIN.id,
    },
  });
  console.log(`  Super Admin: ${superAdmin.email}`);

  // ── Minister (read-only, all universities) ──
  const ministerHash = await hashPassword("minister123");
  const minister = await prisma.user.upsert({
    where: { email: "minister@education.gov" },
    update: {},
    create: {
      firstName: "Minister",
      lastName: "Education",
      email: "minister@education.gov",
      passwordHash: ministerHash,
      roleId: roleMap.MINISTER.id,
      createdById: superAdmin.id,
    },
  });
  console.log(`  Minister: ${minister.email}`);

  // ── Super HR Admin (scoped to university, created by Super Admin) ──
  const superHrHash = await hashPassword("superhr123");
  const superHrAdmin = await prisma.user.upsert({
    where: { email: "superhr@university.edu" },
    update: {},
    create: {
      firstName: "Super HR",
      lastName: "Manager",
      email: "superhr@university.edu",
      passwordHash: superHrHash,
      roleId: roleMap.SUPER_HR_ADMIN.id,
      universityId: university.id,
      createdById: superAdmin.id,
    },
  });
  console.log(`  Super HR Admin: ${superHrAdmin.email}`);

  // ── HR Admin (scoped to faculty + department, created by Super HR Admin) ──
  const hrHash = await hashPassword("hr1234");
  const hrAdmin = await prisma.user.upsert({
    where: { email: "hr@university.edu" },
    update: {},
    create: {
      firstName: "HR",
      lastName: "Administrator",
      email: "hr@university.edu",
      passwordHash: hrHash,
      roleId: roleMap.HR_ADMIN.id,
      universityId: university.id,
      facultyId: csFaculty.id,
      departmentId: seDept.id,
      createdById: superHrAdmin.id,
    },
  });
  console.log(`  HR Admin: ${hrAdmin.email}`);

  // ── Specialities ──
  const specialities = await Promise.all([
    prisma.speciality.create({ data: { name: "Web Development", departmentId: seDept.id } }),
    prisma.speciality.create({ data: { name: "Mobile Development", departmentId: seDept.id } }),
    prisma.speciality.create({ data: { name: "Machine Learning", departmentId: aiDept.id } }),
  ]);
  const webSpec = specialities[0];
  const mlSpec = specialities[2];

  // ── Class Groups ──
  const classGroups = await Promise.all([
    prisma.classGroup.create({ data: { name: "Section A", level: "L3", specialityId: webSpec.id } }),
    prisma.classGroup.create({ data: { name: "Section B", level: "L3", specialityId: webSpec.id } }),
    prisma.classGroup.create({ data: { name: "Section A", level: "M1", specialityId: mlSpec.id } }),
    prisma.classGroup.create({ data: { name: "Section A", level: "M2", specialityId: mlSpec.id } }),
  ]);
  console.log(`  Created ${classGroups.length} class groups`);

  // ── Rooms ──
  const rooms = await Promise.all([
    prisma.room.create({ data: { name: "A101", building: "Building A", universityId: university.id } }),
    prisma.room.create({ data: { name: "A201", building: "Building A", universityId: university.id } }),
    prisma.room.create({ data: { name: "B102", building: "Building B", universityId: university.id } }),
    prisma.room.create({ data: { name: "Lab 1", building: "Building C", universityId: university.id } }),
  ]);

  // ── Modules ──
  const now = new Date();
  const semesterStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const semesterEnd = new Date(now.getFullYear(), now.getMonth() + 4, 30);

  const modules = await Promise.all([
    prisma.module.create({
      data: {
        name: "Algorithms & Data Structures",
        code: "ADS301",
        classGroupId: classGroups[0].id,
        roomId: rooms[0].id,
        startDate: semesterStart,
        endDate: semesterEnd,
      },
    }),
    prisma.module.create({
      data: {
        name: "Web Technologies",
        code: "WEB301",
        classGroupId: classGroups[0].id,
        roomId: rooms[1].id,
        startDate: semesterStart,
        endDate: semesterEnd,
      },
    }),
    prisma.module.create({
      data: {
        name: "Database Systems",
        code: "DB301",
        classGroupId: classGroups[1].id,
        roomId: rooms[2].id,
        startDate: semesterStart,
        endDate: semesterEnd,
      },
    }),
    prisma.module.create({
      data: {
        name: "Deep Learning",
        code: "DL501",
        classGroupId: classGroups[2].id,
        roomId: rooms[3].id,
        startDate: semesterStart,
        endDate: semesterEnd,
      },
    }),
    prisma.module.create({
      data: {
        name: "Computer Vision",
        code: "CV502",
        classGroupId: classGroups[3].id,
        roomId: rooms[3].id,
        startDate: semesterStart,
        endDate: semesterEnd,
      },
    }),
  ]);
  console.log(`  Created ${modules.length} modules`);

  // ── Module Sessions (covering all weekdays for demo) ──
  const today = now.getDay();
  const sessions = await Promise.all([
    prisma.moduleSession.create({ data: { moduleId: modules[0].id, dayOfWeek: 1, startTime: "08:00", endTime: "09:30" } }),
    prisma.moduleSession.create({ data: { moduleId: modules[0].id, dayOfWeek: 3, startTime: "08:00", endTime: "09:30" } }),
    prisma.moduleSession.create({ data: { moduleId: modules[1].id, dayOfWeek: 1, startTime: "10:00", endTime: "11:30" } }),
    prisma.moduleSession.create({ data: { moduleId: modules[1].id, dayOfWeek: 4, startTime: "10:00", endTime: "11:30" } }),
    prisma.moduleSession.create({ data: { moduleId: modules[2].id, dayOfWeek: 2, startTime: "08:00", endTime: "09:30" } }),
    prisma.moduleSession.create({ data: { moduleId: modules[2].id, dayOfWeek: 4, startTime: "14:00", endTime: "15:30" } }),
    prisma.moduleSession.create({ data: { moduleId: modules[3].id, dayOfWeek: 2, startTime: "10:00", endTime: "11:30" } }),
    prisma.moduleSession.create({ data: { moduleId: modules[3].id, dayOfWeek: 5, startTime: "08:00", endTime: "09:30" } }),
    prisma.moduleSession.create({ data: { moduleId: modules[4].id, dayOfWeek: 3, startTime: "14:00", endTime: "15:30" } }),
    prisma.moduleSession.create({ data: { moduleId: modules[0].id, dayOfWeek: today, startTime: "00:00", endTime: "23:59" } }),
  ]);
  console.log(`  Created ${sessions.length} module sessions`);

  // ── Professors (created by Super HR Admin) ──
  const profHash = await hashPassword("prof123");
  const professors = await Promise.all([
    prisma.user.create({
      data: {
        firstName: "Ahmed",
        lastName: "Benali",
        email: "benali@university.edu",
        passwordHash: profHash,
        roleId: roleMap.PROFESSOR.id,
        universityId: university.id,
        facultyId: csFaculty.id,
        departmentId: seDept.id,
        createdById: superHrAdmin.id,
      },
    }),
    prisma.user.create({
      data: {
        firstName: "Fatima",
        lastName: "Zohra",
        email: "zohra@university.edu",
        passwordHash: profHash,
        roleId: roleMap.PROFESSOR.id,
        universityId: university.id,
        facultyId: csFaculty.id,
        departmentId: aiDept.id,
        createdById: superHrAdmin.id,
      },
    }),
  ]);
  console.log(`  Created ${professors.length} professors`);

  // ── Professor-Module assignments ──
  await Promise.all([
    prisma.professorModule.create({ data: { userId: professors[0].id, moduleId: modules[0].id } }),
    prisma.professorModule.create({ data: { userId: professors[0].id, moduleId: modules[1].id } }),
    prisma.professorModule.create({ data: { userId: professors[0].id, moduleId: modules[2].id } }),
    prisma.professorModule.create({ data: { userId: professors[1].id, moduleId: modules[3].id } }),
    prisma.professorModule.create({ data: { userId: professors[1].id, moduleId: modules[4].id } }),
  ]);

  // ── Students ──
  const firstNames = ["Mohamed", "Amina", "Youcef", "Sara", "Karim", "Nadia", "Rami", "Lina", "Omar", "Hana",
    "Amine", "Yasmine", "Zakaria", "Meriem", "Bilal", "Imane", "Walid", "Samira", "Reda", "Khadija"];
  const lastNames = ["Bouzid", "Cherif", "Hamidi", "Khelifi", "Mansouri", "Ouali", "Rahmani", "Saadi", "Touati", "Ziani",
    "Boudjema", "Ferhat", "Guellil", "Harbi", "Issad", "Kaci", "Lakhdari", "Mebarki", "Nassim", "Oussama"];

  const students = [];
  let studentIndex = 0;

  for (const cg of classGroups) {
    for (let i = 0; i < 5; i++) {
      const idx = studentIndex % 20;
      const student = await prisma.user.create({
        data: {
          firstName: firstNames[idx],
          lastName: lastNames[idx],
          email: `student${studentIndex + 1}@university.edu`,
          studentId: `STU${String(studentIndex + 1).padStart(4, "0")}`,
          classGroupId: cg.id,
          roleId: roleMap.PROFESSOR.id,
        },
      });

      const rfidUid = `RFID${String(studentIndex + 1).padStart(6, "0")}`;
      await prisma.rFIDCard.create({
        data: { uid: rfidUid, userId: student.id },
      });

      const templates = Array.from({ length: 10 }, (_, j) => ({
        userId: student.id,
        embedding: randomEmbedding(),
        imagePath: `faces/${student.id}/face_${j}.jpg`,
        qualityScore: 0.85 + Math.random() * 0.14,
      }));
      await prisma.faceTemplate.createMany({ data: templates });

      students.push(student);
      studentIndex++;
    }
  }
  console.log(`  Created ${students.length} students with RFID + face templates`);

  // ── Attendance Logs (30 days of demo data) ──
  let logCount = 0;

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    date.setHours(0, 0, 0, 0);
    const dayOfWeek = date.getDay();

    const daySessions = await prisma.moduleSession.findMany({
      where: { dayOfWeek },
      include: { module: true },
    });

    for (const session of daySessions) {
      const groupStudents = await prisma.user.findMany({
        where: { classGroupId: session.module.classGroupId, studentId: { not: null } },
        include: { rfidCard: true },
      });

      for (const student of groupStudents) {
        if (Math.random() < 0.2) continue;

        const isMatch = Math.random() > 0.15;
        const score = isMatch
          ? SIMILARITY_THRESHOLD + Math.random() * (1 - SIMILARITY_THRESHOLD)
          : Math.random() * SIMILARITY_THRESHOLD;

        const [h, m] = session.startTime.split(":").map(Number);
        const checkInDate = new Date(date);
        checkInDate.setHours(h, m + Math.floor(Math.random() * 10));

        const status = isMatch ? (Math.random() > 0.3 ? "CHECKED_OUT" : "PRESENT") : "FAILED";
        const checkOutDate = status === "CHECKED_OUT"
          ? new Date(checkInDate.getTime() + 60 * 60 * 1000 + Math.random() * 30 * 60 * 1000)
          : null;

        await prisma.attendanceLog.create({
          data: {
            userId: student.id,
            rfidUid: student.rfidCard?.uid || "UNKNOWN",
            checkInAt: checkInDate,
            checkOutAt: checkOutDate,
            status,
            verificationResult: isMatch ? "MATCH" : "MISMATCH",
            similarityScore: Math.round(score * 10000) / 10000,
            moduleId: session.module.id,
            moduleSessionId: session.id,
          },
        });
        logCount++;
      }
    }
  }
  console.log(`  Created ${logCount} attendance logs`);

  // ── Settings ──
  const settingsData = [
    { key: "SIMILARITY_THRESHOLD", value: String(SIMILARITY_THRESHOLD) },
    { key: "EMBEDDING_DIMENSION", value: String(EMBEDDING_DIMENSION) },
    { key: "MAX_FACE_IMAGES", value: "20" },
    { key: "MIN_FACE_IMAGES", value: "10" },
    { key: "SESSION_TOLERANCE_MINUTES", value: "15" },
  ];
  for (const s of settingsData) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log(`  Created ${settingsData.length} settings`);

  console.log("\nSeed complete!");
  console.log("Demo credentials:");
  console.log("  Minister:       minister@education.gov / minister123");
  console.log("  Super Admin:    admin@university.edu / admin123");
  console.log("  Super HR Admin: superhr@university.edu / superhr123");
  console.log("  HR Admin:       hr@university.edu / hr1234");
  console.log("  Professor:      benali@university.edu / prof123");
  console.log("  Professor:      zohra@university.edu / prof123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
