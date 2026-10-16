import express from "express";
import { getAllShifts, getShiftById, createShift, updateShift } from "../controllers/shiftController.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getAllShifts);

router.get("/:id", getShiftById);

router.post("/", requireRole("admin"), createShift);

router.put("/:id", requireRole("admin"), updateShift);

export default router;
