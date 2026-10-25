import { useCallback, useEffect, useState } from 'react'
import { Clock, FileSpreadsheet, Plus, Search } from 'lucide-react'
import { getShifts, getUsers, type Shift, type User } from '../api'
import { SLOTS, coversSlot, placeShift, shiftLabel, startOfWeek, toDateKey, weekDays } from '../dates'
import { useI18n } from '../i18n'
import { STATUS_STYLES } from '../ui'
import Alert from './Alert'
import ShiftForm from './ShiftForm'
import WeekNav from './WeekNav'

// What the form is open for: an existing shift, or an empty employee/day cell
type FormState = { shift?: Shift; userId?: number; date: string }

// load() is created once and can't read the current language, so it stores this marker
const LOAD_FAILED = 'load-failed'

// Compact on phones so the whole week fits the screen, roomier from md up
const headCell = 'px-0.5 py-2 text-[11px] font-semibold tracking-wide uppercase md:px-2 md:py-2.5 md:text-xs'
const nameCell = 'sticky start-0 z-10 w-20 border-e border-line px-2 text-start md:w-48 md:px-4'

// Admin view: one row per employee, one column per day
function AdminRoster() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [shifts, setShifts] = useState<Shift[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [pendingOnly, setPendingOnly] = useState(false)
  const [form, setForm] = useState<FormState | null>(null)
  const [exporting, setExporting] = useState(false)
  const { t } = useI18n()

  // State is set in .then() (after the response), so calling load() from an effect is fine
  const load = useCallback(
    () =>
      Promise.all([getShifts(), getUsers()])
        .then(([shiftList, userList]) => {
          setShifts(shiftList)
          setUsers(userList)
        })
        .catch(() => setError(LOAD_FAILED)),
    [],
  )

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
  const staff = users
    .filter((u) => u.role === 'employee' || weekShifts.some((s) => s.user_id === u.id))
    .sort((a, b) => a.name.localeCompare(b.name))
  const rows = staff
    .filter((u) => u.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((u) => !pendingOnly || weekShifts.some((s) => s.user_id === u.id && s.status === 'pending'))

  // exceljs is big, so it's loaded only when the button is pressed
  const handleExport = async () => {
    setExporting(true)
    try {
      const { exportRoster } = await import('../exportRoster')
      await exportRoster(weekStart, staff, weekShifts)
    } catch {
      setError(t.exportFailed)
    } finally {
      setExporting(false)
    }
  }

  // How many approved people work each slot on a day
  const coverage = (day: string, slot: (typeof SLOTS)[number]) =>
    weekShifts.filter((s) => s.status === 'approved' && coversSlot(s, day, slot)).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <WeekNav weekStart={weekStart} onChange={setWeekStart} />
        <button
          className="btn btn-primary w-full sm:w-auto"
          title={t.exportHint}
          disabled={exporting}
          onClick={handleExport}
        >
          <FileSpreadsheet className="size-4" aria-hidden />
          {exporting ? t.exporting : t.exportExcel}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-64">
          <Search
            className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-slate-500"
            aria-hidden
          />
          <input
            type="search"
            className="input ps-9"
            placeholder={t.searchEmployee}
            aria-label={t.searchEmployee}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-slate-200 transition-colors hover:bg-surface-2 sm:h-10">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={pendingOnly}
            onChange={(e) => setPendingOnly(e.target.checked)}
          />
          {t.pendingOnly}
        </label>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-sm font-medium text-amber-300">
            <Clock className="size-4" aria-hidden />
            {t.pendingCount(pendingCount)}
          </span>
        )}
        <span className="text-xs text-slate-400 sm:ms-auto">
          {SLOTS.map((slot) => (
            <span key={slot.key} className="ms-3 first:ms-0">
              <b className="text-slate-200">{t.slotShort[slot.key]}</b> <bdi dir="ltr">
                {slot.start.slice(0, 2)}–{slot.end.slice(0, 2)}
              </bdi>
            </span>
          ))}
        </span>
      </div>

      {error && <Alert>{error === LOAD_FAILED ? t.loadFailed : error}</Alert>}

      <div className="card overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-sm md:min-w-[840px]">
          <thead>
            <tr className="bg-slate-950">
              <th className={`${nameCell} ${headCell} bg-slate-950 text-slate-300`}>
                <span className="md:hidden">{t.nameCol}</span>
                <span className="hidden md:inline">{t.employeeCol}</span>
              </th>
              {days.map((day, i) => {
                const isToday = dayKeys[i] === todayKey
                return (
                  <th
                    key={dayKeys[i]}
                    className={`${headCell} text-center ${isToday ? 'bg-primary text-white' : 'text-slate-200'}`}
                  >
                    <span className="block md:hidden">{t.daysShort[day.getDay()]}</span>
                    <span className="hidden md:inline">{t.days[day.getDay()]} </span>
                    <span className="font-normal tabular-nums">
                      {day.getDate()}
                      <span className="hidden md:inline">/{day.getMonth() + 1}</span>
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="group border-b border-line last:border-0">
                <th
                  className={`${nameCell} truncate bg-surface py-2 text-xs font-medium text-slate-100 group-hover:bg-surface-2 md:text-sm`}
                >
                  {u.name}
                </th>
                {dayKeys.map((day) => {
                  const cellShifts = byCell.get(`${u.id}|${day}`) ?? []
                  return (
                    <td
                      key={day}
                      className={`group/cell h-11 cursor-pointer border-s border-line p-0.5 transition-colors hover:bg-primary-soft md:p-1.5 ${day === todayKey ? 'bg-primary-soft' : ''}`}
                      onClick={() => setForm({ userId: u.id, date: day })}
                    >
                      <div className="flex flex-col items-center justify-center gap-0.5 md:min-h-7 md:flex-row md:flex-wrap md:gap-1">
                        {cellShifts.map((shift) => (
                          <button
                            key={shift.id}
                            className={`inline-flex h-6 w-full items-center justify-center gap-0.5 rounded border text-[11px] font-semibold tabular-nums transition-shadow hover:shadow-sm md:h-7 md:w-auto md:min-w-9 md:rounded-md md:px-2 md:text-xs ${STATUS_STYLES[shift.status]} ${shift.status === 'rejected' ? 'line-through' : ''}`}
                            title={t.statuses[shift.status]}
                            aria-label={`${u.name}, ${shiftLabel(shift, t.slotShort)}, ${t.statuses[shift.status]}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              setForm({ shift, date: day })
                            }}
                          >
                            <bdi dir="ltr">{shiftLabel(shift, t.slotShort)}</bdi>
                            {shift.status === 'pending' && <Clock className="hidden size-3 md:block" aria-hidden />}
                          </button>
                        ))}
                        <button
                          className="hidden size-7 place-items-center rounded-md text-slate-500 opacity-0 transition-opacity group-hover/cell:opacity-100 hover:text-cyan-400 focus-visible:opacity-100 md:grid"
                          aria-label={t.addShiftFor(u.name, day)}
                          onClick={(e) => {
                            e.stopPropagation()
                            setForm({ userId: u.id, date: day })
                          }}
                        >
                          <Plus className="size-4" aria-hidden />
                        </button>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                  {t.noEmployees}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line bg-surface-2">
              <th className={`${nameCell} ${headCell} bg-surface-2 text-slate-300`}>
                {t.working}{' '}
                <span className="font-normal normal-case">({SLOTS.map((s) => t.slotShort[s.key]).join('/')})</span>
              </th>
              {dayKeys.map((day) => (
                <td key={day} className="border-s border-line px-0.5 py-2 md:px-1">
                  <div className="flex flex-col items-center gap-0.5 md:flex-row md:justify-center md:gap-1">
                    {SLOTS.map((slot) => {
                      const count = coverage(day, slot)
                      return (
                        <span
                          key={slot.key}
                          title={t.workingCount(t.slots[slot.key], count)}
                          className={`grid size-5 place-items-center rounded text-[11px] font-semibold tabular-nums md:size-6 md:text-xs ${count === 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-surface text-slate-200 ring-1 ring-line'}`}
                        >
                          {count}
                        </span>
                      )
                    })}
                  </div>
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
