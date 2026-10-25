import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sql } from "../db/index.js";
import type { Request, Response } from "express";

const isText = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

// "Ilya@Mail.com " and "ilya@mail.com" are the same address
const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const registerUser = async (req: Request, res: Response) =>{
    const { name, password } = req.body ?? {};
    let { email } = req.body ?? {};

    // Strings only: a number as password used to crash bcrypt with a 500
    if (!isText(name) || !isText(password) || !isText(email)) {
        return res.status(400).json({ code: "REGISTER_FIELDS", message: "Name, password, and email are required" });
    }
    if (password.length < 6) {
        return res.status(400).json({ code: "PASSWORD_SHORT", message: "Password must be at least 6 characters long" });
    }
    email = normalizeEmail(email);
    const existingUser = await sql`SELECT id FROM users WHERE lower(email) = ${email}`;
    if (existingUser.length > 0) {
        return res.status(409).json({ code: "EMAIL_TAKEN", message: "User with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
const rows = await sql`
    INSERT INTO users (name, email, password_hash, role)
    VALUES (${name.trim()}, ${email}, ${passwordHash}, 'employee')
    RETURNING id, name, email, role`;
    res.status(201).json(rows[0]);
};

export const loginUser = async (req: Request, res: Response) => {
    const { email, password } = req.body ?? {};

    if (!isText(email) || !isText(password)) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    // lower() on the column too, for users saved before emails were lowercased
    const rows = await sql`SELECT id, name, email, password_hash, role FROM users WHERE lower(email) = ${normalizeEmail(email)}`;
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET as string, { expiresIn: "1d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
};


