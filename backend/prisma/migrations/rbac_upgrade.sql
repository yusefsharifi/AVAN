-- RBAC: Role, RolePermission, RoleAssignment, RoleScope
-- Generated from schema.prisma changes (manual, no prisma migrate dev)

-- Enum
DO $$ BEGIN
  CREATE TYPE "RoleScope" AS ENUM ('GLOBAL', 'ZONE', 'COMPANY');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Table: Role
CREATE TABLE IF NOT EXISTS "Role" (
  "id"          TEXT   NOT NULL DEFAULT gen_random_uuid()::text,
  "name"        TEXT   NOT NULL,
  "nameFa"      TEXT   NOT NULL,
  "description" TEXT,
  "scopeType"   "RoleScope" NOT NULL DEFAULT 'GLOBAL',
  "zoneId"      TEXT,
  "companyId"   TEXT,
  "isSystem"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Role_name_zoneId_companyId_key"
  ON "Role" ("name", "zoneId", "companyId");
CREATE INDEX IF NOT EXISTS "Role_scopeType_idx" ON "Role" ("scopeType");
CREATE INDEX IF NOT EXISTS "Role_zoneId_idx" ON "Role" ("zoneId");
CREATE INDEX IF NOT EXISTS "Role_companyId_idx" ON "Role" ("companyId");

-- Table: RolePermission
CREATE TABLE IF NOT EXISTS "RolePermission" (
  "id"         TEXT   NOT NULL DEFAULT gen_random_uuid()::text,
  "roleId"     TEXT   NOT NULL,
  "permission" TEXT   NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RolePermission_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "RolePermission_roleId_permission_key"
  ON "RolePermission" ("roleId", "permission");
CREATE INDEX IF NOT EXISTS "RolePermission_roleId_idx" ON "RolePermission" ("roleId");

-- Table: RoleAssignment (composite PK)
CREATE TABLE IF NOT EXISTS "RoleAssignment" (
  "userId"     TEXT   NOT NULL,
  "roleId"     TEXT   NOT NULL,
  "assignedBy" TEXT   NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("userId", "roleId"),
  CONSTRAINT "RoleAssignment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
  CONSTRAINT "RoleAssignment_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "RoleAssignment_roleId_idx" ON "RoleAssignment" ("roleId");

-- Seed system roles
INSERT INTO "Role" ("id", "name", "nameFa", "description", "scopeType", "isSystem", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'super_admin', 'مدیر ارشد', 'دسترسی کامل به سامانه', 'GLOBAL', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'zone_manager', 'مدیر شهرک', 'مدیریت شهرک صنعتی', 'GLOBAL', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'company_admin', 'مدیر شرکت', 'مدیریت شرکت', 'GLOBAL', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name", "zoneId", "companyId") DO NOTHING;
