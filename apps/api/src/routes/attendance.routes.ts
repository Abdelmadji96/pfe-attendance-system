import { Router } from "express";
import { attendanceController } from "../controllers/attendance.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import { checkInSchema, checkOutSchema, Permission } from "@pfe/shared";

export const attendanceRouter = Router();

attendanceRouter.use(authenticate);

const viewAttendance = authorize(Permission.VIEW_ATTENDANCE, Permission.VIEW_OWN_ATTENDANCE);
const viewCharts = authorize(Permission.VIEW_CHARTS);

attendanceRouter.get("/", viewAttendance, attendanceController.getAll);
attendanceRouter.get("/stats", viewAttendance, attendanceController.getStats);
attendanceRouter.get("/charts/checkins-per-day", viewCharts, attendanceController.getCheckInsPerDay);
attendanceRouter.get("/charts/peak-hours", viewCharts, attendanceController.getPeakHours);
attendanceRouter.get("/charts/by-class-department", viewCharts, attendanceController.getByGroupData);
attendanceRouter.post("/check-in", authorize(Permission.MANAGE_ATTENDANCE), validate(checkInSchema), attendanceController.checkIn);
attendanceRouter.post("/check-out", authorize(Permission.MANAGE_ATTENDANCE), validate(checkOutSchema), attendanceController.checkOut);
