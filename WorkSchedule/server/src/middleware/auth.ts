import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { sql } from "../db/index.js";

export type AuthUser = { id: number; role: "admin" | "employee" };

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
    }
    const token = header.slice("Bearer ".length);

    let payload: AuthUser;
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET as string) as AuthUser;
    } catch {
        return res.status(401).json({ message: "Invalid or expired token" });
    }

    // The role comes from the DB, not the token: a changed role or a deleted user
    // takes effect right away instead of when the token expires
    const rows = (await sql`SELECT id, role FROM users WHERE id = ${payload.id}`) as AuthUser[];
    if (!rows[0]) {
        return res.status(401).json({ message: "User no longer exists" });
    }
    req.user = { id: rows[0].id, role: rows[0].role };
    next();
};

export const requireRole = (role: AuthUser["role"]) =>
    (req: Request, res: Response, next: NextFunction) => {
        if (req.user?.role !== role) {
            return res.status(403).json({ message: "Forbidden" });
        }
        next();
    };
