-- Admin member & household lifecycle management.
-- Adds three reversible, app-level deactivation/disable timestamps. All additive and nullable
-- (no data change on existing rows):
--   * User.disabledAt       — admin-disabled login (distinct from "never activated"); sign-in blocked.
--   * Member.deactivatedAt  — member marked inactive (independent of membershipStatus / deletion).
--   * Household.deactivatedAt — whole-household inactive (cascades to members + their logins).

-- AlterTable
ALTER TABLE "User" ADD COLUMN "disabledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Member" ADD COLUMN "deactivatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Household" ADD COLUMN "deactivatedAt" TIMESTAMP(3);
