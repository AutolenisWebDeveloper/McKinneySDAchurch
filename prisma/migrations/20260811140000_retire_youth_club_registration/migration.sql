-- Retire the unused Youth Club registration surface (safeguarding audit, data minimization).
--
-- YouthClubRegistration / the YouthClub enum had NO application surface: no route, server
-- action, query, seed, or script ever referenced them, so the table cannot have been
-- populated by this application. Youth-club / minor-facing features are out of scope unless
-- separately authorized, so the unused minor-PII table is removed rather than left latent.

-- Drop the FK to Member and the table (the table also owns its own index, dropped with it).
ALTER TABLE "YouthClubRegistration" DROP CONSTRAINT IF EXISTS "YouthClubRegistration_minorMemberId_fkey";
DROP TABLE IF EXISTS "YouthClubRegistration";

-- Drop the now-unreferenced enum type.
DROP TYPE IF EXISTS "YouthClub";
