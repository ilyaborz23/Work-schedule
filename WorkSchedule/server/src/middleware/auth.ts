import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

export type AuthUser = { id: number; role: "admin" | "employee" };

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ message: "No token provided" });
    }
    const token = header.slice("Bearer ".length);

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET as string) as AuthUser;
        req.user = { id: payload.id, role: payload.role };
        next();
    } catch {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};

export const requireRole = (role: AuthUser["role"]) =>
    (req: Request, res: Response, next: NextFunction) => {
        if (req.user?.role !== role) {
            return res.status(403).json({ message: "Forbidden" });
        }
        next();
    };
