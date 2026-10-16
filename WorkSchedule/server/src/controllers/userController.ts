import type { Request, Response } from "express";
import { sql } from "../db/index.js";

export const getAllUsers = async (_req: Request, res: Response) => {
    const users = await sql`SELECT id, name, email, role FROM users ORDER BY name`;
    res.json(users);
};
