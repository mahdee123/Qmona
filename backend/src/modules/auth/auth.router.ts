import { Router, type RequestHandler } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { userRouter } from "../user/user.router.js";
import { getCsrf, getMe, postLogin, postLogout } from "./auth.controller.js";

/** /api/v1/auth — session login for staff, plus user management under /users. */
export function authRouter(loginLimiter: RequestHandler): Router {
  const router = Router();
  router.get("/csrf", getCsrf);
  router.post("/login", loginLimiter, postLogin);
  router.post("/logout", requireAuth, postLogout);
  router.get("/me", requireAuth, getMe);
  router.use("/users", userRouter);
  return router;
}
