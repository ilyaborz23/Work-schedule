import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sql } from "../db/index.js";
import type { Request, Response } from "express";

export const registerUser = async (req: Request, res: Response) =>{
    const { name, password, email, role = "employee" } = req.body ?? {};
 
    if (!name || !password || !email) {
        return res.status(400).json({ message: "Name, password, and email are required" });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }
    if (role !== "admin" && role !== "employee") {
        return res.status(400).json({ message: "Role must be admin or employee" });
    }

    const existingUser = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existingUser.length > 0) {
        return res.status(409).json({ message: "User with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
const rows = await sql`
    INSERT INTO users (name, email, password_hash, role)
    VALUES (${name}, ${email}, ${passwordHash}, ${role})
    RETURNING id, name, email, role`;
    res.status(201).json(rows[0]);
};

