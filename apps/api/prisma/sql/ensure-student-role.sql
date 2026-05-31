-- STUDENT enum should already exist after migration 20260531130000_add_student_role.
-- Only insert the role row (safe in a single Prisma db execute).
INSERT INTO "roles" ("id", "name", "permissions", "createdAt", "updatedAt")
VALUES ('role_student_enrollment', 'STUDENT', '[]'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
