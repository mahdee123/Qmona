import { Router } from "express";
import type { Limiters } from "../app.js";
import { auditRouter } from "../modules/audit/audit.router.js";
import { authRouter } from "../modules/auth/auth.router.js";
import { blogManageRoutes, blogPublicRoutes } from "../modules/blog/blog.router.js";
import { cmsManageRoutes, cmsPublicRoutes } from "../modules/cms/cms.router.js";
import { dashboardRouter } from "../modules/dashboard/dashboard.router.js";
import { healthRouter } from "../modules/dashboard/health.router.js";
import { industriesManageRoutes, industriesPublicRoutes } from "../modules/industries/industries.router.js";
import { inquiriesManageRoutes, inquiriesPublicRoutes } from "../modules/inquiries/inquiries.router.js";
import { mediaRouter } from "../modules/media/media.router.js";
import { portfolioManageRoutes, portfolioPublicRoutes } from "../modules/portfolio/portfolio.router.js";
import { servicesManageRoutes, servicesPublicRoutes } from "../modules/services/services.router.js";

/**
 * Everything under /api/v1. Each feature module contributes its public routes (read-only, published data
 * only) and its management routes (authenticated, role-checked) here.
 *
 *   /api/v1/...           public
 *   /api/v1/auth/...      session login and staff management
 *   /api/v1/manage/...    management API
 */
export function apiRouter(limiters: Limiters): Router {
  const api = Router();
  api.use(healthRouter);
  api.use("/auth", authRouter(limiters.login));

  // Public
  servicesPublicRoutes(api);
  industriesPublicRoutes(api);
  portfolioPublicRoutes(api);
  blogPublicRoutes(api);
  cmsPublicRoutes(api);
  inquiriesPublicRoutes(api, limiters.inquiry);

  // Management
  const manage = Router();
  manage.use(dashboardRouter);
  manage.use("/media", mediaRouter);
  manage.use("/audit-events", auditRouter);
  servicesManageRoutes(manage);
  industriesManageRoutes(manage);
  portfolioManageRoutes(manage);
  blogManageRoutes(manage);
  cmsManageRoutes(manage);
  inquiriesManageRoutes(manage);
  api.use("/manage", manage);

  return api;
}
