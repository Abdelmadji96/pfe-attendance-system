-- Enum ADD VALUE cannot run inside a transaction (Prisma default).
-- See: https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate/alter-enums
-- prisma-migrate-disable-transaction

ALTER TYPE "RoleName" ADD VALUE IF NOT EXISTS 'STUDENT';

INSERT INTO "roles" ("id", "name", "permissions", "createdAt", "updatedAt")
VALUES ('role_student_enrollment', 'STUDENT', '[]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

UPDATE "users" u
SET "roleId" = (SELECT r."id" FROM "roles" r WHERE r."name" = 'STUDENT' LIMIT 1)
WHERE u."classGroupId" IS NOT NULL
  AND u."roleId" = (SELECT r."id" FROM "roles" r WHERE r."name" = 'PROFESSOR' LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM "professor_modules" pm WHERE pm."userId" = u."id");
