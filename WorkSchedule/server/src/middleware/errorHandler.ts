import type { NextFunction, Request, Response } from "express";

export const notFound = (_req: Request, res: Response) => {
    res.status(404).json({ message: "Route not found" });
};

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
};
