import express from "express";
import { rateLimit } from "express-rate-limit";
import { registerUser, loginUser } from "../controllers/authController.js";

const router = express.Router();

// At most 20 login/sign-up attempts per IP in 15 minutes, against password guessing
const authLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { code: "TOO_MANY_ATTEMPTS", message: "Too many attempts, try again in 15 minutes" },
});

router.post("/register", authLimit, registerUser)
router.post("/login", authLimit, loginUser)

export default router;
