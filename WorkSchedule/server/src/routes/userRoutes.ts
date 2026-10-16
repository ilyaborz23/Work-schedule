import express from "express";
import { getAllUsers } from "../controllers/userController.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = express.Router();

router.use(authenticate, requireRole("admin"));

router.get("/", getAllUsers);

export default router;
