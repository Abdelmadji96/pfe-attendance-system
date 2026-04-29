import { Router } from "express";
import { masterDataController } from "../controllers/master-data.controller";
import { validate } from "../middlewares/validate";
import { authenticate } from "../middlewares/authenticate";
import { authorize } from "../middlewares/authorize";
import {
  Permission,
  createUniversitySchema,
  createFacultySchema,
  createDepartmentSchema,
  createSpecialitySchema,
  createClassGroupSchema,
  createRoomSchema,
  csvImportSchema,
} from "@pfe/shared";

export const masterDataRouter = Router();

masterDataRouter.use(authenticate);

// Universities
masterDataRouter.get("/universities", masterDataController.getUniversities);
masterDataRouter.post("/universities", authorize(Permission.MANAGE_MASTER_DATA), validate(createUniversitySchema), masterDataController.createUniversity);
masterDataRouter.delete("/universities/:id", authorize(Permission.MANAGE_MASTER_DATA), masterDataController.deleteUniversity);

// Faculties
masterDataRouter.get("/faculties", masterDataController.getFaculties);
masterDataRouter.post("/faculties", authorize(Permission.MANAGE_MASTER_DATA), validate(createFacultySchema), masterDataController.createFaculty);
masterDataRouter.delete("/faculties/:id", authorize(Permission.MANAGE_MASTER_DATA), masterDataController.deleteFaculty);

// Departments
masterDataRouter.get("/departments", masterDataController.getDepartments);
masterDataRouter.post("/departments", authorize(Permission.MANAGE_MASTER_DATA), validate(createDepartmentSchema), masterDataController.createDepartment);
masterDataRouter.delete("/departments/:id", authorize(Permission.MANAGE_MASTER_DATA), masterDataController.deleteDepartment);

// Specialities
masterDataRouter.get("/specialities", masterDataController.getSpecialities);
masterDataRouter.post("/specialities", authorize(Permission.MANAGE_MASTER_DATA), validate(createSpecialitySchema), masterDataController.createSpeciality);
masterDataRouter.delete("/specialities/:id", authorize(Permission.MANAGE_MASTER_DATA), masterDataController.deleteSpeciality);

// Class Groups
masterDataRouter.get("/class-groups", masterDataController.getClassGroups);
masterDataRouter.post("/class-groups", authorize(Permission.MANAGE_MASTER_DATA), validate(createClassGroupSchema), masterDataController.createClassGroup);
masterDataRouter.delete("/class-groups/:id", authorize(Permission.MANAGE_MASTER_DATA), masterDataController.deleteClassGroup);

// Rooms
masterDataRouter.get("/rooms", masterDataController.getRooms);
masterDataRouter.post("/rooms", authorize(Permission.MANAGE_MASTER_DATA), validate(createRoomSchema), masterDataController.createRoom);
masterDataRouter.delete("/rooms/:id", authorize(Permission.MANAGE_MASTER_DATA), masterDataController.deleteRoom);

// Levels
masterDataRouter.get("/levels", masterDataController.getLevels);
masterDataRouter.post("/levels", authorize(Permission.MANAGE_MASTER_DATA), masterDataController.addLevel);
masterDataRouter.delete("/levels/:name", authorize(Permission.MANAGE_MASTER_DATA), masterDataController.deleteLevel);

// CSV Import
masterDataRouter.post("/import-csv", authorize(Permission.MANAGE_MASTER_DATA), validate(csvImportSchema), masterDataController.importCsv);
