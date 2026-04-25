import multer from "multer";
import path from "path";
import fs from "fs";
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE_MB } from "@pfe/shared";

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userId = req.params.userId;
    const dir = path.resolve(__dirname, `../../uploads/faces/${userId}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `face_${uniqueSuffix}${ext}`);
  },
});

export const uploadFaceImages = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 20,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(", ")}`));
    }
  },
});
