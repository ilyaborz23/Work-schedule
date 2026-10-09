import type { Request, Response } from "express";
import { sql } from "../db/index.js";
import type { Shift } from "../types/Shift.js";

export const getAllShifts = async (_req: Request, res: Response) => {
    const shifts = (await sql`SELECT * FROM shifts ORDER BY start_time`) as Shift[];
    res.json(shifts);
};
