-- Weekly back-cover inspiration quote (§15). Additive.
ALTER TABLE "Bulletin"
  ADD COLUMN "inspiration" TEXT,
  ADD COLUMN "inspirationSource" TEXT;
