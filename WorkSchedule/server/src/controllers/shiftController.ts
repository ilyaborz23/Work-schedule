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
const MAX_HOURS_IN_A_ROW = 12;
const MAX_WEEK_HOURS = 60;

// Every error has a code, so the client can show it in the user's language
const ERRORS = {
    MISSING_FIELDS: "Missing required fields",
    INVALID_USER_ID: "Invalid user id",
    INVALID_DATE: "Invalid date format",
    END_BEFORE_START: "End time must be after start time",
    USER_NOT_FOUND: "User not found",
    SLOT_REQUIRED: "Date and slot are required",
    INVALID_SLOT: "Slot must be morning, afternoon or night",
    INVALID_DAY: "Date must be in YYYY-MM-DD format",
    SLOT_STARTED: "Cannot request a shift that has already started",
    SHIFT_LENGTH: `Shift must be between ${MIN_SHIFT_HOURS} and ${MAX_SHIFT_HOURS} hours`,
    OVERLAP: "Employee already has a shift at this time",
    MAX_IN_A_ROW: `Employee cannot work more than ${MAX_HOURS_IN_A_ROW} hours in a row`,
    MAX_WEEK: `Employee cannot work more than ${MAX_WEEK_HOURS} hours a week`,
} as const;

type ApiError = { code: keyof typeof ERRORS; message: string };

const fail = (code: keyof typeof ERRORS): ApiError => ({ code, message: ERRORS[code] });

// Runs an INSERT/UPDATE of a shift. Two requests for the same time that arrive together both pass
// checkShiftRules before either is saved; then the DB constraint shifts_no_overlap stops the second one
const saveShift = async (query: Promise<unknown>) => {
    try {
        return { rows: (await query) as Shift[] };
    } catch (err) {
        if ((err as { code?: string }).code === "23P01") {
            return { error: fail("OVERLAP") };
        }
        throw err;
    }
};

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
        return { error: fail("MISSING_FIELDS") };
    }

    // Checked here, otherwise Postgres fails on "abc" and the client gets a 500
    const userId = Number(user_id);
    if (!Number.isInteger(userId) || userId <= 0) {
        return { error: fail("INVALID_USER_ID") };
    }

    const start = new Date(start_time);
    const end = new Date(end_time);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return { error: fail("INVALID_DATE") };
    }
    if (end <= start) {
        return { error: fail("END_BEFORE_START") };
    }

    const users = await sql`SELECT id FROM users WHERE id = ${userId}`;
    if (users.length === 0) {
        return { error: fail("USER_NOT_FOUND") };
    }

    return { user_id: userId, start, end };
};

// Employee body: { date: "YYYY-MM-DD", slot: "morning" | "afternoon" | "night" }
const validateSlotBody = async (body: any) => {
    const { date, slot } = body ?? {};

    if (!date || !slot) {
        return { error: fail("SLOT_REQUIRED") };
    }
    if (!(slot in SLOTS)) {
        return { error: fail("INVALID_SLOT") };
    }
    const parsed = new Date(date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
        return { error: fail("INVALID_DAY") };
    }

    // Slot hours are Israel local time, Postgres converts them to an exact moment.
    // The 8 hours are added to the local clock time, so on the nights the clocks change
    // the night slot still ends at 07:00 (it's really 7 or 9 hours long then)
    const slotTime = SLOTS[slot as keyof typeof SLOTS];
    const rows = await sql`
        SELECT (${date}::date + ${slotTime}::time) AT TIME ZONE ${TIME_ZONE} AS start_time,
               (${date}::date + ${slotTime}::time + make_interval(hours => ${SLOT_HOURS})) AT TIME ZONE ${TIME_ZONE} AS end_time`;
    const start = new Date(rows[0]!.start_time);
    const end = new Date(rows[0]!.end_time);

    if (start.getTime() <= Date.now()) {
        return { error: fail("SLOT_STARTED") };
    }

    return { start, end };
};

// Business rules for one employee; returns an error or null
const checkShiftRules = async (userId: number, start: Date, end: Date, excludeId = 0) => {
    const hours = (end.getTime() - start.getTime()) / HOUR;
    if (hours < MIN_SHIFT_HOURS || hours > MAX_SHIFT_HOURS) {
        return fail("SHIFT_LENGTH");
    }

    const overlapping = await sql`
        SELECT id FROM shifts
        WHERE user_id = ${userId} AND status <> 'rejected' AND id <> ${excludeId}
          AND start_time < ${end} AND end_time > ${start}`;
    if (overlapping.length > 0) {
        return fail("OVERLAP");
    }

    // Shifts that touch end-to-start are one block of work: walk back and forward to find its edges
    let blockStart = start;
    let blockEnd = end;
    while (true) {
        const prev = await sql`
            SELECT start_time FROM shifts
            WHERE user_id = ${userId} AND status <> 'rejected' AND id <> ${excludeId}
              AND end_time = ${blockStart}`;
        if (!prev[0]) break;
        blockStart = new Date(prev[0].start_time);
    }
    while (true) {
        const next = await sql`
            SELECT end_time FROM shifts
            WHERE user_id = ${userId} AND status <> 'rejected' AND id <> ${excludeId}
              AND start_time = ${blockEnd}`;
        if (!next[0]) break;
        blockEnd = new Date(next[0].end_time);
    }
    if ((blockEnd.getTime() - blockStart.getTime()) / HOUR > MAX_HOURS_IN_A_ROW) {
        return fail("MAX_IN_A_ROW");
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
        return fail("MAX_WEEK");
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
        return res.status(400).json(result.error);
    }
    const { user_id: userId, start, end } = result;

    const ruleError = await checkShiftRules(userId, start, end);
    if (ruleError) {
        return res.status(409).json(ruleError);
    }

    const status = isAdmin ? "approved" : "pending";
    const saved = await saveShift(sql`
        INSERT INTO shifts (user_id, start_time, end_time, status)
        VALUES (${userId}, ${start}, ${end}, ${status})
        RETURNING *`);
    if ("error" in saved) {
        return res.status(409).json(saved.error);
    }
    res.status(201).json(saved.rows[0]);
};

// Admin changes a shift (any hours); the changed shift is approved
export const updateShift = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid shift id" });
    }

    const result = await validateShiftBody(req.body);
    if ("error" in result) {
        return res.status(400).json(result.error);
    }
    const { user_id, start, end } = result;

    const ruleError = await checkShiftRules(user_id, start, end, id);
    if (ruleError) {
        return res.status(409).json(ruleError);
    }

    const saved = await saveShift(sql`
        UPDATE shifts
        SET user_id = ${user_id}, start_time = ${start}, end_time = ${end}, status = 'approved'
        WHERE id = ${id}
        RETURNING *`);
    if ("error" in saved) {
        return res.status(409).json(saved.error);
    }
    if (!saved.rows[0]) {
        return res.status(404).json({ message: "Shift not found" });
    }
    res.json(saved.rows[0]);
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
            return res.status(409).json(ruleError);
        }
    }

    const saved = await saveShift(sql`UPDATE shifts SET status = ${status} WHERE id = ${id} RETURNING *`);
    if ("error" in saved) {
        return res.status(409).json(saved.error);
    }
    res.json(saved.rows[0]);
};
