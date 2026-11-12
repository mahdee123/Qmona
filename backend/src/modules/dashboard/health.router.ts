import { Router } from "express";
import { isDatabaseConnected } from "../../config/database.js";

export const healthRouter = Router();

/** Public health check: status and database connectivity only. Used by Docker and the gateway. */
healthRouter.get("/health", (_req, res) => {
  const db = isDatabaseConnected();
  res.status(db ? 200 : 503).json({
    status: db ? "healthy" : "unhealthy",
    database: db ? "connected" : "disconnected",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
  });
});
