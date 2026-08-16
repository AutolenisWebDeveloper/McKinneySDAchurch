-- Safeguarding: a Supporter is a non-member whose chosen name is published on a public church
-- page. Minors cannot self-register anywhere else on this platform, so the Supporter path now
-- requires an explicit "I am 18 or older" attestation and records when it was given.
--
-- Nullable by design: existing Supporter rows predate the attestation and are left untouched
-- rather than being back-dated into a claim nobody actually made.
ALTER TABLE "Supporter" ADD COLUMN "adultAttestedAt" TIMESTAMP(3);
