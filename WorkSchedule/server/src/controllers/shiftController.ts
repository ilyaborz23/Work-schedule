import type { Request, Response } from "express";
import { sql } from "../db/index.js";
import type { Shift } from "../types/Shift.js";

const TIME_ZONE = "Asia/Jerusalem";
const HOUR = 60 * 60 * 1000;

const SLOTS = {
    morning: "07:00",
    afternoon: "15:00",
    night: "23:00",
} as const;
const SLOT_HOURS = 8;

const MIN_SHIFT_HOURS = 4;
const MAX_SHIFT_HOURS = 12;
const MAX_WEEK_HOURS = 60;

export const getAllShifts = async (req: Request, res: Response) => {
    const user = req.user!;
    const shifts = (user.role === "admin"
        ? await sql`SELECT * FROM shifts ORDER BY start_time`
        : await sql`SELECT * FROM shifts WHERE user_id = ${user.id} ORDER BY start_time`) as Shift[];
    res.json(shifts);
};

export const getShiftById = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid shift id" });
    }

    const rows = (await sql`SELECT * FROM shifts WHERE id = ${id}`) as Shift[];
    const shift = rows[0];

    if (!shift || (req.user!.role === "employee" && shift.user_id !== req.user!.id)) {
        return res.status(404).json({ message: "Shift not found" });
    }
    res.json(shift);
};

// Admin body: { user_id, start_time, end_time } with any hours
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

    return { user_id: Number(user_id), start, end };
};

// Employee body: { date: "YYYY-MM-DD", slot: "morning" | "afternoon" | "night" }
const validateSlotBody = async (body: any) => {
    const { date, slot } = body ?? {};

    if (!date || !slot) {
        return { error: "Date and slot are required" };
    }
    if (!(slot in SLOTS)) {
        return { error: "Slot must be morning, afternoon or night" };
    }
    const parsed = new Date(date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
        return { error: "Date must be in YYYY-MM-DD format" };
    }

    // Slot hours are Israel local time, Postgres converts them to an exact moment
    const slotTime = SLOTS[slot as keyof typeof SLOTS];
    const rows = await sql`SELECT (${date}::date + ${slotTime}::time) AT TIME ZONE ${TIME_ZONE} AS start_time`;
    const start = new Date(rows[0]!.start_time);
    const end = new Date(start.getTime() + SLOT_HOURS * HOUR);

    return { start, end };
};

// Business rules for one employee; returns an error message or null
const checkShiftRules = async (userId: number, start: Date, end: Date, excludeId = 0) => {
    const hours = (end.getTime() - start.getTime()) / HOUR;
    if (hours < MIN_SHIFT_HOURS || hours > MAX_SHIFT_HOURS) {
        return `Shift must be between ${MIN_SHIFT_HOURS} and ${MAX_SHIFT_HOURS} hours`;
    }

    const overlapping = await sql`
        SELECT id FROM shifts
        WHERE user_id = ${userId} AND status <> 'rejected' AND id <> ${excludeId}
          AND start_time < ${end} AND end_time > ${start}`;
    if (overlapping.length > 0) {
        return "Employee already has a shift at this time";
    }

    // Israeli week: Sunday to Saturday
    const week = await sql`
        SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time))), 0) / 3600 AS hours
        FROM shifts
        WHERE user_id = ${userId} AND status <> 'rejected' AND id <> ${excludeId}
          AND (start_time AT TIME ZONE ${TIME_ZONE})::date
              - EXTRACT(DOW FROM start_time AT TIME ZONE ${TIME_ZONE})::int
            = (${start}::timestamptz AT TIME ZONE ${TIME_ZONE})::date
              - EXTRACT(DOW FROM ${start}::timestamptz AT TIME ZONE ${TIME_ZONE})::int`;
    if (Number(week[0]!.hours) + hours > MAX_WEEK_HOURS) {
        return `Employee cannot work more than ${MAX_WEEK_HOURS} hours a week`;
    }

    return null;
};

// Employee requests a slot for himself (pending), admin assigns any hours (approved)
export const createShift = async (req: Request, res: Response) => {
    const isAdmin = req.user!.role === "admin";

    const result = isAdmin
        ? await validateShiftBody(req.body)
        : { ...(await validateSlotBody(req.body)), user_id: req.user!.id };
    if ("error" in result) {
        return res.status(400).json({ message: result.error });
    }
    const { user_id: userId, start, end } = result;

    const ruleError = await checkShiftRules(userId, start, end);
    if (ruleError) {
        return res.status(409).json({ message: ruleError });
    }

    const status = isAdmin ? "approved" : "pending";
    const rows = (await sql`
        INSERT INTO shifts (user_id, start_time, end_time, status)
        VALUES (${userId}, ${start}, ${end}, ${status})
        RETURNING *`) as Shift[];
    res.status(201).json(rows[0]);
};

// Admin changes a shift (any hours); the changed shift is approved
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

    const ruleError = await checkShiftRules(user_id, start, end, id);
    if (ruleError) {
        return res.status(409).json({ message: ruleError });
    }

    const rows = (await sql`
        UPDATE shifts
        SET user_id = ${user_id}, start_time = ${start}, end_time = ${end}, status = 'approved'
        WHERE id = ${id}
        RETURNING *`) as Shift[];
    if (!rows[0]) {
        return res.status(404).json({ message: "Shift not found" });
    }
    res.json(rows[0]);
};

// Admin approves or rejects a request
export const updateShiftStatus = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid shift id" });
    }

    const { status } = req.body ?? {};
    if (status !== "approved" && status !== "rejected") {
        return res.status(400).json({ message: "Status must be approved or rejected" });
    }

    const found = (await sql`SELECT * FROM shifts WHERE id = ${id}`) as Shift[];
    const shift = found[0];
    if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
    }

    // Other shifts may have been added since the request, so check the rules again
    if (status === "approved") {
        const ruleError = await checkShiftRules(shift.user_id, new Date(shift.start_time), new Date(shift.end_time), id);
        if (ruleError) {
            return res.status(409).json({ message: ruleError });
        }
    }

    const rows = (await sql`UPDATE shifts SET status = ${status} WHERE id = ${id} RETURNING *`) as Shift[];
    res.json(rows[0]);
};
