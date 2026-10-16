import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sql } from "../db/index.js";
import type { Request, Response } from "express";

export const registerUser = async (req: Request, res: Response) =>{
    const { name, password, email } = req.body ?? {};
 
    if (!name || !password || !email) {
        return res.status(400).json({ message: "Name, password, and email are required" });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }
    const existingUser = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existingUser.length > 0) {
        return res.status(409).json({ message: "User with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
const rows = await sql`
    INSERT INTO users (name, email, password_hash, role)
    VALUES (${name}, ${email}, ${passwordHash}, 'employee')
    RETURNING id, name, email, role`;
    res.status(201).json(rows[0]);
};

export const loginUser = async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    const rows = await sql`SELECT id, name, email, password_hash, role FROM users WHERE email = ${email}`;
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: "1d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
};


