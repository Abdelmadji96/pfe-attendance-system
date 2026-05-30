-- Remove check-out support: migrate existing data, drop column, and shrink enum.

UPDATE "attendance_logs"
SET "status" = 'PRESENT'
WHERE "status" = 'CHECKED_OUT';

ALTER TABLE "attendance_logs" DROP COLUMN IF EXISTS "checkOutAt";

ALTER TABLE "attendance_logs" ALTER COLUMN "status" DROP DEFAULT;

ALTER TYPE "AttendanceStatus" RENAME TO "AttendanceStatus_old";

CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'FAILED');

ALTER TABLE "attendance_logs"
  ALTER COLUMN "status" TYPE "AttendanceStatus"
  USING ("status"::text::"AttendanceStatus");

ALTER TABLE "attendance_logs"
  ALTER COLUMN "status" SET DEFAULT 'PRESENT'::"AttendanceStatus";

DROP TYPE "AttendanceStatus_old";
