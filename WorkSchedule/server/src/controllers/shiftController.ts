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

const validateShiftBody = async (body: any) => {
    const { user_id, start_time, end_time } = body ?? {};

    if (!user_id || !start_time || !end_time) {
        return { error: "Missing required fields" };
    }

    const start = new Date(start_time);
    const end = new Date(end_time);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { error: "Invalid date format" };
    }
    if (end <= start) {
        return { error: "End time must be after start time" };
    }

    const users = await sql`SELECT id FROM users WHERE id = ${user_id}`;
    if (users.length === 0) {
        return { error: "User not found" };
    }

    return { user_id, start, end };
};

export const createShift = async (req: Request, res: Response) => {
    const result = await validateShiftBody(req.body);
    if ("error" in result) {
        return res.status(400).json({ message: result.error });
    }
    const { user_id, start, end } = result;

    const rows = (await sql`
        INSERT INTO shifts (user_id, start_time, end_time)
        VALUES (${user_id}, ${start}, ${end})
        RETURNING *`) as Shift[];
    res.status(201).json(rows[0]);
};

export const updateShift = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid shift id" });
    }

    const result = await validateShiftBody(req.body);
    if ("error" in result) {
        return res.status(400).json({ message: result.error });
    }
    const { user_id, start, end } = result;

    const rows = (await sql`
        UPDATE shifts
        SET user_id = ${user_id}, start_time = ${start}, end_time = ${end}
        WHERE id = ${id}
        RETURNING *`) as Shift[];
    if (!rows[0]) {
        return res.status(404).json({ message: "Shift not found" });
    }
    res.json(rows[0]);
};
