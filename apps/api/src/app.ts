import express from "express";
import cors from "cors";
import path from "path";
import { errorHandler } from "./middlewares/error-handler";
import { authRouter } from "./routes/auth.routes";
import { usersRouter } from "./routes/users.routes";
import { rfidRouter } from "./routes/rfid.routes";
import { faceRouter } from "./routes/face.routes";
import { verificationRouter } from "./routes/verification.routes";
import { attendanceRouter } from "./routes/attendance.routes";
import { rolesRouter } from "./routes/roles.routes";
import { settingsRouter } from "./routes/settings.routes";
import { masterDataRouter } from "./routes/master-data.routes";
import { modulesRouter } from "./routes/module.routes";
import { staffRouter } from "./routes/staff.routes";
import { enrollmentRouter } from "./routes/enrollment.routes";
import { evaluationRouter } from "./routes/evaluation.routes";
import { env } from "./config/env";
import { isStudentRoleReady } from "./utils/ensure-student-role";

export const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

app.get("/api/health", async (_req, res) => {
  const payload: Record<string, unknown> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    faceEmbedConfigured: Boolean(env.FACE_EMBED_SERVICE_URL),
  };

  try {
    payload.studentRoleReady = await isStudentRoleReady();
  } catch {
    payload.studentRoleReady = false;
  }

  if (env.FACE_EMBED_SERVICE_URL) {
    const healthUrl = env.FACE_EMBED_SERVICE_URL.replace(/\/embed\/?$/, "/health");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(healthUrl, { signal: controller.signal });
      clearTimeout(timeout);
      payload.faceEmbedUrl = env.FACE_EMBED_SERVICE_URL;
      payload.faceEmbedReachable = response.ok;
      if (!response.ok) {
        payload.faceEmbedError = `HTTP ${response.status}`;
      }
    } catch (error) {
      payload.faceEmbedUrl = env.FACE_EMBED_SERVICE_URL;
      payload.faceEmbedReachable = false;
      payload.faceEmbedError =
        error instanceof Error ? error.message : "Embed health check failed";
    }
  }

  res.json(payload);
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/rfid", rfidRouter);
app.use("/api/face", faceRouter);
app.use("/api/verification", verificationRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/roles", rolesRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/master-data", masterDataRouter);
app.use("/api/modules", modulesRouter);
app.use("/api/staff", staffRouter);
app.use("/api/enrollment", enrollmentRouter);
app.use("/api/evaluation", evaluationRouter);

app.use(errorHandler);
