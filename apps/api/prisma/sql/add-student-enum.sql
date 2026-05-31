-- Run alone first if STUDENT is missing from RoleName enum (separate transaction).
-- prisma-migrate-disable-transaction
ALTER TYPE "RoleName" ADD VALUE IF NOT EXISTS 'STUDENT';
