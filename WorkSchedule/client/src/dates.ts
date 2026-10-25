import type { Shift, Slot } from './api'

// Names of slots and days are in i18n.ts (t.slots, t.days)
export const SLOTS: { key: Slot; start: string; end: string }[] = [
  { key: 'morning', start: '07:00', end: '15:00' },
  { key: 'afternoon', start: '15:00', end: '23:00' },
  { key: 'night', start: '23:00', end: '07:00' },
]

// Week starts on Sunday, like in Israel
export const startOfWeek = (date: Date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

export const addDays = (date: Date, days: number) => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export const weekDays = (weekStart: Date) => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

// "YYYY-MM-DD" in local time (toISOString would shift it to UTC)
export const toDateKey = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

// Which day and slot a shift belongs to: the slot whose start (07 / 15 / 23) is nearest
// to the shift's local start. 05:00 → that day's morning, 01:00 → the previous day's night.
export const placeShift = (shift: Shift): { day: string; slot: Slot } => {
  const start = new Date(shift.start_time)
  const hour = start.getHours() + start.getMinutes() / 60
  if (hour >= 3 && hour < 11) return { day: toDateKey(start), slot: 'morning' }
  if (hour >= 11 && hour < 19) return { day: toDateKey(start), slot: 'afternoon' }
  if (hour >= 19) return { day: toDateKey(start), slot: 'night' }
  return { day: toDateKey(addDays(start, -1)), slot: 'night' }
}

// Does the shift cover at least half of a slot on that day? Used for coverage counts,
// so a 07–19 shift counts for both morning and afternoon
export const coversSlot = (shift: Shift, day: string, slot: (typeof SLOTS)[number]) => {
  const slotStart = new Date(`${day}T${slot.start}`)
  const endDay = slot.key === 'night' ? toDateKey(addDays(slotStart, 1)) : day
  const slotEnd = new Date(`${endDay}T${slot.end}`)
  const overlap =
    Math.min(slotEnd.getTime(), new Date(shift.end_time).getTime()) -
    Math.max(slotStart.getTime(), new Date(shift.start_time).getTime())
  return overlap >= (slotEnd.getTime() - slotStart.getTime()) / 2
}

// Short slot name ("M" / "ב") for a standard slot, otherwise the real hours like "07–19"
export const shiftLabel = (shift: Shift, slotShort: Record<Slot, string>) => {
  const start = formatTime(shift.start_time)
  const end = formatTime(shift.end_time)
  const slot = SLOTS.find((s) => s.start === start && s.end === end)
  return slot ? slotShort[slot.key] : `${start.slice(0, 2)}–${end.slice(0, 2)}`
}
