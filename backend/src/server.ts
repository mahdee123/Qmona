import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

async function main() {
  await connectDatabase();
  const app = createApp();
  const server = app.listen(env.PORT, () => logger.info("api listening", { port: env.PORT, env: env.NODE_ENV }));

  // Graceful shutdown: stop accepting connections, let in-flight requests finish, close the database.
  let closing = false;
  const shutdown = (signal: string) => {
    if (closing) return;
    closing = true;
    logger.info("shutting down", { signal });
    const force = setTimeout(() => process.exit(1), 10_000);
    force.unref();
    server.close(() => {
      disconnectDatabase()
        .catch(() => undefined)
        .finally(() => process.exit(0));
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err: unknown) => {
  logger.error("failed to start", { message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
