import { seedE2E } from "./seed";

/** Seed deterministic role fixtures once before the suite runs. */
export default async function globalSetup(): Promise<void> {
  await seedE2E();
}
