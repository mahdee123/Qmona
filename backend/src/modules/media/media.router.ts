import { Router } from "express";
import multer from "multer";
import { env } from "../../config/env.js";
import { requireContentEditor } from "../../middleware/auth.js";
import { deleteMedia, getMedia, listMedia, patchMedia, postMedia } from "./media.controller.js";

// Files are held in memory only long enough to be validated; the limit is slightly above the business limit
// so oversized files get the friendly validation message instead of a raw multer error.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: (env.MEDIA_MAX_UPLOAD_MB + 1) * 1024 * 1024, files: 1, fields: 10 },
});

/** /api/v1/manage/media — Content Editors and Super Admins. */
export const mediaRouter = Router();
mediaRouter.use(requireContentEditor);
mediaRouter.get("/", listMedia);
mediaRouter.post("/", upload.single("file"), postMedia);
mediaRouter.get("/:id", getMedia);
mediaRouter.patch("/:id", patchMedia);
mediaRouter.delete("/:id", deleteMedia);
