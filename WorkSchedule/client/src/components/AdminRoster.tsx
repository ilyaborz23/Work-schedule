import { useCallback, useEffect, useState } from 'react'
import { getShifts, getUsers, type Shift, type User } from '../api'
import { DAY_NAMES, SLOTS, placeShift, shiftLabel, startOfWeek, toDateKey, weekDays } from '../dates'
import ShiftForm from './ShiftForm'
import WeekNav from './WeekNav'

// What the form is open for: an existing shift, or an empty employee/day cell
type FormState = { shift?: Shift; userId?: number; date: string }

// Admin view: one row per employee, one column per day
function AdminRoster() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [shifts, setShifts] = useState<Shift[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [pendingOnly, setPendingOnly] = useState(false)
  const [form, setForm] = useState<FormState | null>(null)

  const load = useCallback(async () => {
    try {
      const [shiftList, userList] = await Promise.all([getShifts(), getUsers()])
      setShifts(shiftList)
      setUsers(userList)
    } catch {
      setError('Could not load shifts')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const days = weekDays(weekStart)
  const dayKeys = days.map(toDateKey)
  const todayKey = toDateKey(new Date())

  // Only this week's shifts, grouped by "userId|day"
  const byCell = new Map<string, Shift[]>()
  for (const shift of shifts) {
    const { day } = placeShift(shift)
    if (!dayKeys.includes(day)) continue
    const key = `${shift.user_id}|${day}`
    byCell.set(key, [...(byCell.get(key) ?? []), shift])
  }
  const weekShifts = [...byCell.values()].flat()
  const pendingCount = weekShifts.filter((s) => s.status === 'pending').length

  // Employees, plus admins who have shifts this week
  const rows = users
    .filter((u) => u.role === 'employee' || weekShifts.some((s) => s.user_id === u.id))
    .filter((u) => u.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((u) => !pendingOnly || weekShifts.some((s) => s.user_id === u.id && s.status === 'pending'))
    .sort((a, b) => a.name.localeCompare(b.name))

  // How many approved people work each slot on a day
  const coverage = (day: string, slot: string) =>
    weekShifts.filter((s) => s.status === 'approved' && placeShift(s).day === day && placeShift(s).slot === slot).length

  return (
    <div className="calendar">
      <WeekNav weekStart={weekStart} onChange={setWeekStart} />

      <div className="roster-filters">
        <input
          type="search"
          placeholder="Search employee"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="checkbox">
          <input type="checkbox" checked={pendingOnly} onChange={(e) => setPendingOnly(e.target.checked)} />
          Pending only
        </label>
        {pendingCount > 0 && <span className="pending-badge">{pendingCount} pending</span>}
        <span className="legend">
          <b>M</b> 07–15 · <b>A</b> 15–23 · <b>N</b> 23–07
        </span>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="calendar-scroll">
        <table className="roster">
          <thead>
            <tr>
              <th className="roster-name">Employee</th>
              {days.map((day, i) => (
                <th key={dayKeys[i]} className={dayKeys[i] === todayKey ? 'today' : ''}>
                  {DAY_NAMES[day.getDay()]} <small>{day.getDate()}/{day.getMonth() + 1}</small>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <th className="roster-name">{u.name}</th>
                {dayKeys.map((day) => {
                  const cellShifts = byCell.get(`${u.id}|${day}`) ?? []
                  return (
                    <td key={day} className="roster-cell" onClick={() => setForm({ userId: u.id, date: day })}>
                      {cellShifts.map((shift) => (
                        <button
                          key={shift.id}
                          className={`chip chip-${shift.status}`}
                          title={shift.status}
                          onClick={(e) => {
                            e.stopPropagation()
                            setForm({ shift, date: day })
                          }}
                        >
                          {shiftLabel(shift)}
                          {shift.status === 'pending' && '?'}
                        </button>
                      ))}
                    </td>
                  )
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="roster-empty">
                  No employees found
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <th className="roster-name">Working (M/A/N)</th>
              {dayKeys.map((day) => (
                <td key={day} className="roster-coverage">
                  {SLOTS.map((slot) => coverage(day, slot.key)).join('/')}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {form && (
        <ShiftForm
          users={users}
          shift={form.shift}
          userId={form.userId}
          date={form.shift ? toDateKey(new Date(form.shift.start_time)) : form.date}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null)
            load()
          }}
        />
      )}
    </div>
  )
}

export default AdminRoster
