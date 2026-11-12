import { env } from "../config/env.js";

const levels = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 } as const;

function write(level: "debug" | "info" | "warn" | "error", message: string, meta?: Record<string, unknown>) {
  if (levels[level] < levels[env.LOG_LEVEL]) return;
  // Callers pass only non-sensitive metadata (never bodies, cookies, tokens or passwords).
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...meta });
  (level === "error" ? process.stderr : process.stdout).write(line + "\n");
}

export const logger = {
  debug: (m: string, meta?: Record<string, unknown>) => write("debug", m, meta),
  info: (m: string, meta?: Record<string, unknown>) => write("info", m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => write("warn", m, meta),
  error: (m: string, meta?: Record<string, unknown>) => write("error", m, meta),
};
