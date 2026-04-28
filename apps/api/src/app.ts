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

export const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
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

app.use(errorHandler);
