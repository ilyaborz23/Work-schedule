import express from "express";
import { getAllShifts, getShiftById } from "../controllers/shiftController.js";

const router = express.Router();

router.get("/", getAllShifts);

router.get("/:id", getShiftById);

export default router;
