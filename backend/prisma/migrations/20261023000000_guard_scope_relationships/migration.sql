-- ═══════════════════════════════════════════════════════════════════════════════
-- Guard scope hardening (SEC-025)
--   1) GuardShift.guardId becomes a real FK → User
--   2) GuardShift.gateId  becomes a real FK → Gate
--   3) new GuardAssignment model (active post assignment for guards)
--
-- Apply with:
--   npx prisma migrate dev --create-only --name guard_scope_relationships
--   (replace the generated SQL with this file) then:
--   npx prisma migrate dev
-- Or for production:
--   psql "$DATABASE_URL" -f prisma/migrations/20261023000000_guard_scope_relationships/migration.sql
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1) GuardShift.guardId → User.id
ALTER TABLE "GuardShift"
  ADD CONSTRAINT "GuardShift_guardId_fkey"
  FOREIGN KEY ("guardId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 2) GuardShift.gateId → Gate.id
ALTER TABLE "GuardShift"
  ADD CONSTRAINT "GuardShift_gateId_fkey"
  FOREIGN KEY ("gateId") REFERENCES "Gate"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3) GuardAssignment ------------------------------------------------------------
CREATE TABLE "GuardAssignment" (
    "id"        TEXT        NOT NULL,
    "guardId"   TEXT        NOT NULL,
    "zoneId"    TEXT        NOT NULL,
    "gateId"    TEXT,
    "postType"  TEXT        NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo"   TIMESTAMP(3),
    "isActive"  BOOLEAN     NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GuardAssignment_guardId_isActive_idx"
  ON "GuardAssignment"("guardId", "isActive");
CREATE INDEX "GuardAssignment_zoneId_gateId_idx"
  ON "GuardAssignment"("zoneId", "gateId");

ALTER TABLE "GuardAssignment"
  ADD CONSTRAINT "GuardAssignment_guardId_fkey"
  FOREIGN KEY ("guardId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GuardAssignment"
  ADD CONSTRAINT "GuardAssignment_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "Zone"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GuardAssignment"
  ADD CONSTRAINT "GuardAssignment_gateId_fkey"
  FOREIGN KEY ("gateId") REFERENCES "Gate"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
