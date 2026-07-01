import multer from "multer";
import { Request } from "express";

const ALLOWED_MIMETYPES = ["application/pdf", "text/plain"];
const MAX_SIZE_MB = 10;

export const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req: Request, file, cb) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and TXT files are allowed"));
    }
  },
}).single("document");
