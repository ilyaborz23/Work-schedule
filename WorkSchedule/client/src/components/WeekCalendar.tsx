import { useCallback, useEffect, useState } from 'react'
import { Info, Plus } from 'lucide-react'
import { getShifts, requestShift, type Shift, type Slot, type User } from '../api'
import { SLOTS, formatTime, placeShift, startOfWeek, toDateKey, weekDays } from '../dates'
import { apiErrorText, useI18n } from '../i18n'
import { SLOT_ICONS, STATUS_ICONS, STATUS_STYLES } from '../ui'
import Alert from './Alert'
import StatusBadge from './StatusBadge'
import WeekNav from './WeekNav'

type Props = {
  user: User
}

// load() is created once and can't read the current language, so it stores this marker
const LOAD_FAILED = 'load-failed'

// Employee view: own shifts by slot, with "+ Request" on free slots.
// On phones the same week grid is compact: icons instead of text.
function WeekCalendar({ user }: Props) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [shifts, setShifts] = useState<Shift[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { t } = useI18n()

  // State is set in .then() (after the response), so calling load() from an effect is fine
  const load = useCallback(
    () =>
      getShifts()
        .then(setShifts)
        .catch(() => setError(LOAD_FAILED)),
    [],
  )

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
      setError(apiErrorText(err, t))
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

  // Shifts in one day/slot plus the "+ Request" button; used by both layouts
  const renderSlot = (day: Date, slot: (typeof SLOTS)[number]) => {
    const dayKey = toDateKey(day)
    const cellShifts = shiftsIn(dayKey, slot.key)
    // The server refuses slots that have already started (e.g. today's morning at 10:00)
    const hasStarted = new Date(`${dayKey}T${slot.start}`) <= new Date()
    const hasActive = cellShifts.some((s) => s.status !== 'rejected')

    return (
      <div className="flex flex-col gap-1.5">
        {cellShifts.map((shift) => {
          const StatusIcon = STATUS_ICONS[shift.status]
          return (
            <div
              key={shift.id}
              title={t.statuses[shift.status]}
              className={`rounded-md border px-0.5 py-1 text-center md:rounded-lg md:px-2 md:py-1.5 md:text-start ${STATUS_STYLES[shift.status]}`}
            >
              <StatusIcon className="mx-auto size-4 md:hidden" aria-label={t.statuses[shift.status]} />
              <div
                className={`hidden text-xs font-semibold tabular-nums md:block ${shift.status === 'rejected' ? 'line-through' : ''}`}
              >
                <bdi dir="ltr">
                  {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
                </bdi>
              </div>
              <div className="mt-0.5 hidden items-center gap-1 text-xs md:flex">
                <StatusIcon className="size-3" aria-hidden />
                {t.statuses[shift.status]}
              </div>
            </div>
          )
        })}

        {!hasStarted && !hasActive && (
          <button
            className="flex h-11 items-center justify-center gap-1 rounded-md border border-dashed md:rounded-lg border-slate-500 text-xs font-medium text-slate-300 transition-colors hover:border-cyan-400 hover:bg-primary-soft hover:text-cyan-300 disabled:opacity-50 md:h-14"
            aria-label={t.requestShift(t.slots[slot.key], `${t.days[day.getDay()]} ${day.getDate()}`)}
            disabled={busy}
            onClick={() => request(dayKey, slot.key)}
          >
            <Plus className="size-4 md:size-3.5" aria-hidden />
            <span className="hidden md:inline">{t.request}</span>
          </button>
        )}

      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <WeekNav weekStart={weekStart} onChange={setWeekStart} />
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="approved" />
          <StatusBadge status="pending" />
          <StatusBadge status="rejected" />
        </div>
      </div>

      {error && <Alert>{error === LOAD_FAILED ? t.loadFailed : error}</Alert>}

      <div className="card overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-sm md:min-w-[760px]">
          <thead>
            <tr className="bg-slate-950">
              <th className="w-12 px-1 py-3 md:w-32 md:px-4">
                <span className="sr-only">{t.shift}</span>
              </th>
              {days.map((day) => {
                const isToday = toDateKey(day) === todayKey
                return (
                  <th key={toDateKey(day)} className={`px-0.5 py-2 text-center md:px-2 md:py-3 ${isToday ? 'bg-primary' : ''}`}>
                    <span
                      className={`block text-[11px] font-medium tracking-wide uppercase md:text-xs ${isToday ? 'text-cyan-100' : 'text-slate-400'}`}
                    >
                      <span className="md:hidden">{t.daysShort[day.getDay()]}</span>
                      <span className="hidden md:inline">{t.days[day.getDay()]}</span>
                    </span>
                    <span
                      className={`mx-auto mt-1 grid size-7 place-items-center rounded-full text-sm md:size-8 md:text-base font-semibold tabular-nums ${isToday ? 'bg-white text-cyan-900' : 'text-white'}`}
                    >
                      {day.getDate()}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map((slot) => {
              const SlotIcon = SLOT_ICONS[slot.key]
              return (
                <tr key={slot.key} className="border-b border-line last:border-0">
                  <th className="bg-surface-2 px-1 py-2 text-center align-top md:px-4 md:py-3 md:text-start">
                    <span className="flex flex-col items-center gap-1.5 font-medium text-slate-100 md:flex-row">
                      <SlotIcon className="size-4 text-cyan-400" aria-label={t.slots[slot.key]} />
                      <span className="hidden md:inline">{t.slots[slot.key]}</span>
                    </span>
                    <span className="mt-0.5 block text-[10px] font-normal text-slate-400 tabular-nums md:text-xs">
                      <bdi dir="ltr">
                        {slot.start}–{slot.end}
                      </bdi>
                    </span>
                  </th>
                  {days.map((day) => {
                    const dayKey = toDateKey(day)
                    return (
                      <td
                        key={dayKey}
                        className={`h-20 border-s border-line p-0.5 align-top md:h-24 md:p-1.5 ${dayKey === todayKey ? 'bg-primary-soft' : ''} ${dayKey < todayKey ? 'bg-black/20' : ''}`}
                      >
                        {renderSlot(day, slot)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="flex items-center gap-2 text-sm text-slate-400">
        <Info className="size-4 shrink-0" aria-hidden />
        {t.requestsHint(user.name)}
      </p>
    </div>
  )
}

export default WeekCalendar
