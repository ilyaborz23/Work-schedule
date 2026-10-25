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

// Which day and slot a shift belongs to, by its local start time.
// A shift starting after midnight (00–07) is the previous day's night.
export const placeShift = (shift: Shift): { day: string; slot: Slot } => {
  const start = new Date(shift.start_time)
  const hour = start.getHours()
  if (hour >= 7 && hour < 15) return { day: toDateKey(start), slot: 'morning' }
  if (hour >= 15 && hour < 23) return { day: toDateKey(start), slot: 'afternoon' }
  if (hour >= 23) return { day: toDateKey(start), slot: 'night' }
  return { day: toDateKey(addDays(start, -1)), slot: 'night' }
}

// Short slot name ("M" / "ב") for a standard slot, otherwise the real hours like "07–19"
export const shiftLabel = (shift: Shift, slotShort: Record<Slot, string>) => {
  const start = formatTime(shift.start_time)
  const end = formatTime(shift.end_time)
  const slot = SLOTS.find((s) => s.start === start && s.end === end)
  return slot ? slotShort[slot.key] : `${start.slice(0, 2)}–${end.slice(0, 2)}`
}
