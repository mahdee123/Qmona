import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { runSeed } from "./seed/index.js";

/** npm run seed [-- --reset-copy] */
const resetCopy = process.argv.includes("--reset-copy");

try {
  await connectDatabase();
  await runSeed({ resetCopy, log: (m) => console.log(`seeded ${m}`) });
  console.log("Seeded default content. No projects, testimonials, pricing, statistics or team members were created.");
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
