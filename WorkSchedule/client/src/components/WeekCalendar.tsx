import { useCallback, useEffect, useState } from 'react'
import { ApiError, getShifts, requestShift, type Shift, type Slot, type User } from '../api'
import { DAY_NAMES, SLOTS, formatTime, placeShift, startOfWeek, toDateKey, weekDays } from '../dates'
import WeekNav from './WeekNav'

type Props = {
  user: User
}

// Employee view: own shifts by slot, with "+ Request" on free slots
function WeekCalendar({ user }: Props) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [shifts, setShifts] = useState<Shift[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setShifts(await getShifts())
    } catch {
      setError('Could not load shifts')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const request = async (date: string, slot: Slot) => {
    setError('')
    setBusy(true)
    try {
      await requestShift(date, slot)
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const days = weekDays(weekStart)
  const todayKey = toDateKey(new Date())

  const shiftsIn = (dayKey: string, slot: Slot) =>
    shifts.filter((s) => {
      const place = placeShift(s)
      return place.day === dayKey && place.slot === slot
    })

  return (
    <div className="calendar">
      <WeekNav weekStart={weekStart} onChange={setWeekStart} />

      {error && <p className="error">{error}</p>}

      <div className="calendar-scroll">
        <table className="calendar-grid">
          <thead>
            <tr>
              <th></th>
              {days.map((day) => (
                <th key={toDateKey(day)} className={toDateKey(day) === todayKey ? 'today' : ''}>
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
                  <small>{slot.start}–{slot.end}</small>
                </th>
                {days.map((day) => {
                  const dayKey = toDateKey(day)
                  const cellShifts = shiftsIn(dayKey, slot.key)
                  const isPast = dayKey < todayKey
                  const hasActive = cellShifts.some((s) => s.status !== 'rejected')

                  return (
                    <td key={dayKey}>
                      {cellShifts.map((shift) => (
                        <div key={shift.id} className={`shift shift-${shift.status}`}>
                          <span>
                            {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
                          </span>
                          <span className="shift-status">{shift.status}</span>
                        </div>
                      ))}

                      {!isPast && !hasActive && (
                        <button className="request" disabled={busy} onClick={() => request(dayKey, slot.key)}>
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

      <p className="hint">Signed in as {user.name}. Requests wait for the admin's approval.</p>
    </div>
  )
}

export default WeekCalendar
