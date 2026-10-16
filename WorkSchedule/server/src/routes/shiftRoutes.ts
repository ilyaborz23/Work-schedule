import express from "express";
import { getAllShifts, getShiftById, createShift, updateShift, updateShiftStatus } from "../controllers/shiftController.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate);

router.get("/", getAllShifts);

router.get("/:id", getShiftById);

router.post("/", createShift);

router.put("/:id", requireRole("admin"), updateShift);

router.patch("/:id/status", requireRole("admin"), updateShiftStatus);

export default router;
