export type ShiftStatus = "pending" | "approved" | "rejected";

export type Shift = {
  id: number;
  user_id: number;
  start_time: Date;
  end_time: Date;
  status: ShiftStatus;
}
