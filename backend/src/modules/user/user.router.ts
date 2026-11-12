import { Router } from "express";
import { requireSuperAdmin } from "../../middleware/auth.js";
import { getUser, listUsers, patchUser, postSetPassword, postUser } from "./user.controller.js";

/** Staff management, mounted at /api/v1/auth/users. Super Admin only; there is no DELETE (accounts are deactivated). */
export const userRouter = Router();

userRouter.use(requireSuperAdmin);
userRouter.get("/", listUsers);
userRouter.post("/", postUser);
userRouter.get("/:id", getUser);
userRouter.patch("/:id", patchUser);
userRouter.post("/:id/set-password", postSetPassword);
