import type { Request, Response } from "express";
import { sql } from "../db/index.js";
import type { Shift } from "../types/Shift.js";

export const getAllShifts = async (_req: Request, res: Response) => {
    const shifts = (await sql`SELECT * FROM shifts ORDER BY start_time`) as Shift[];
    res.json(shifts);
};

export const getShiftById = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid shift id" });
    }

    const rows = (await sql`SELECT * FROM shifts WHERE id = ${id}`) as Shift[];
    const shift = rows[0];
    if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
    }

    res.json(shift);
};
