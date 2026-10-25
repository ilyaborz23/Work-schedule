import type { NextFunction, Request, Response } from "express";

export const notFound = (_req: Request, res: Response) => {
    res.status(404).json({ message: "Route not found" });
};

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    // Errors from express.json() (e.g. broken JSON) carry their own 4xx status: that's the client's mistake
    const status = (err as { status?: number }).status;
    if (status && status >= 400 && status < 500) {
        return res.status(status).json({ message: "Invalid request body" });
    }

    console.error(err);
    res.status(500).json({ message: "Internal server error" });
};
