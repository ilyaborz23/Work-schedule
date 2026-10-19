import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  getShifts,
  getUsers,
  requestShift,
  setShiftStatus,
  type Shift,
  type Slot,
  type User,
} from '../api'

type Props = {
  user: User
}

const SLOTS: { key: Slot; label: string; hours: string }[] = [
  { key: 'morning', label: 'Morning', hours: '07:00–15:00' },
  { key: 'afternoon', label: 'Afternoon', hours: '15:00–23:00' },
  { key: 'night', label: 'Night', hours: '23:00–07:00' },
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Week starts on Sunday, like in Israel
const startOfWeek = (date: Date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

const addDays = (date: Date, days: number) => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// "YYYY-MM-DD" in local time (toISOString would shift it to UTC)
const toDateKey = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

// Which day and slot a shift belongs to, by its local start time.
// A shift starting after midnight (00–07) is the previous day's night.
const placeShift = (shift: Shift) => {
  const start = new Date(shift.start_time)
  const hour = start.getHours()
  if (hour >= 7 && hour < 15) return { day: toDateKey(start), slot: 'morning' as Slot }
  if (hour >= 15 && hour < 23) return { day: toDateKey(start), slot: 'afternoon' as Slot }
  if (hour >= 23) return { day: toDateKey(start), slot: 'night' as Slot }
  return { day: toDateKey(addDays(start, -1)), slot: 'night' as Slot }
}

function WeekCalendar({ user }: Props) {
  const isAdmin = user.role === 'admin'
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [shifts, setShifts] = useState<Shift[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const [shiftList, userList] = await Promise.all([
        getShifts(),
        isAdmin ? getUsers() : Promise.resolve([]),
      ])
      setShifts(shiftList)
      setUsers(userList)
    } catch {
      setError('Could not load shifts')
    }
  }, [isAdmin])

  useEffect(() => {
    load()
  }, [load])

  // Runs a change on the server, then reloads; shows the server's message on failure
  const run = async (action: () => Promise<unknown>) => {
    setError('')
    setBusy(true)
    try {
      await action()
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const todayKey = toDateKey(new Date())
  const userName = (id: number) => users.find((u) => u.id === id)?.name ?? `#${id}`

  const shiftsIn = (dayKey: string, slot: Slot) =>
    shifts.filter((s) => {
      const place = placeShift(s)
      return place.day === dayKey && place.slot === slot
    })

  return (
    <div className="calendar">
      <div className="calendar-toolbar">
        <button onClick={() => setWeekStart(addDays(weekStart, -7))}>←</button>
        <button onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</button>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))}>→</button>
        <span className="calendar-range">
          {days[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} –{' '}
          {days[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="calendar-scroll">
        <table className="calendar-grid">
          <thead>
            <tr>
              <th></th>
              {days.map((day) => (
                <th key={day.toISOString()} className={toDateKey(day) === todayKey ? 'today' : ''}>
                  {DAY_NAMES[day.getDay()]}
                  <br />
                  <small>{day.getDate()}/{day.getMonth() + 1}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map((slot) => (
              <tr key={slot.key}>
                <th className="slot-label">
                  {slot.label}
                  <br />
                  <small>{slot.hours}</small>
                </th>
                {days.map((day) => {
                  const dayKey = toDateKey(day)
                  const cellShifts = shiftsIn(dayKey, slot.key)
                  const isPast = dayKey < todayKey
                  const hasOwn = cellShifts.some((s) => s.user_id === user.id && s.status !== 'rejected')

                  return (
                    <td key={dayKey}>
                      {cellShifts.map((shift) => (
                        <div key={shift.id} className={`shift shift-${shift.status}`}>
                          {isAdmin && <strong>{userName(shift.user_id)}</strong>}
                          <span>
                            {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
                          </span>
                          <span className="shift-status">{shift.status}</span>
                          {isAdmin && shift.status === 'pending' && (
                            <div className="shift-actions">
                              <button
                                disabled={busy}
                                onClick={() => run(() => setShiftStatus(shift.id, 'approved'))}
                              >
                                Approve
                              </button>
                              <button
                                className="reject"
                                disabled={busy}
                                onClick={() => run(() => setShiftStatus(shift.id, 'rejected'))}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      {!isAdmin && !isPast && !hasOwn && (
                        <button
                          className="request"
                          disabled={busy}
                          onClick={() => run(() => requestShift(dayKey, slot.key))}
                        >
                          + Request
                        </button>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default WeekCalendar
