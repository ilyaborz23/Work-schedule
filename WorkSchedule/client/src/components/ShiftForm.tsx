import { useEffect, useState, type FormEvent } from 'react'
import { Check, X } from 'lucide-react'
import { createShift, setShiftStatus, updateShift, type Shift, type User } from '../api'
import { SLOTS, formatTime } from '../dates'
import { apiErrorText, useI18n } from '../i18n'
import { SLOT_ICONS } from '../ui'
import Alert from './Alert'
import StatusBadge from './StatusBadge'

type Props = {
  users: User[]
  shift?: Shift // edit this shift; without it the form creates a new one
  userId?: number // preselected employee for a new shift
  date: string // "YYYY-MM-DD"
  onSaved: () => void
  onClose: () => void
}

function ShiftForm({ users, shift, userId: initialUserId, date: initialDate, onSaved, onClose }: Props) {
  const [userId, setUserId] = useState(String(shift?.user_id ?? initialUserId ?? ''))
  const [date, setDate] = useState(initialDate)
  const [startTime, setStartTime] = useState(shift ? formatTime(shift.start_time) : SLOTS[0].start)
  const [endTime, setEndTime] = useState(shift ? formatTime(shift.end_time) : SLOTS[0].end)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const { t } = useI18n()

  // Esc closes the modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Runs a server call; closes the form on success, shows the server's message on failure
  const save = async (action: () => Promise<unknown>) => {
    setError('')
    setSaving(true)
    try {
      await action()
      onSaved()
    } catch (err) {
      setError(apiErrorText(err, t))
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const start = new Date(`${date}T${startTime}`)
    const end = new Date(`${date}T${endTime}`)
    // End earlier than start means the shift goes past midnight (e.g. 23:00–07:00)
    if (end <= start) end.setDate(end.getDate() + 1)

    save(() =>
      shift ? updateShift(shift.id, Number(userId), start, end) : createShift(Number(userId), start, end),
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="shift-form-title"
        className="card flex max-h-[92vh] w-full flex-col gap-4 overflow-y-auto rounded-b-none p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:max-w-md sm:rounded-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 id="shift-form-title" className="text-lg font-semibold">
              {shift ? t.editShift : t.newShift}
            </h2>
            {shift && <StatusBadge status={shift.status} />}
          </div>
          <button
            type="button"
            aria-label={t.close}
            className="grid size-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-surface-2 hover:text-slate-200"
            onClick={onClose}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {shift?.status === 'pending' && (
          <div className="flex flex-col gap-3 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-amber-200">{t.employeeRequested}</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn h-9 bg-emerald-600 px-3 text-white hover:bg-emerald-700"
                disabled={saving}
                onClick={() => save(() => setShiftStatus(shift.id, 'approved'))}
              >
                <Check className="size-4" aria-hidden />
                {t.approve}
              </button>
              <button
                type="button"
                className="btn h-9 border border-rose-400/50 px-3 text-rose-300 hover:bg-rose-500/15"
                disabled={saving}
                onClick={() => save(() => setShiftStatus(shift.id, 'rejected'))}
              >
                <X className="size-4" aria-hidden />
                {t.reject}
              </button>
            </div>
          </div>
        )}

        <label className="label">
          {t.employee}
          <select className="input" value={userId} onChange={(e) => setUserId(e.target.value)} required>
            <option value="" disabled>
              {t.chooseEmployee}
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>

        <label className="label">
          {t.date}
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-slate-200">{t.shift}</legend>
          <div className="grid grid-cols-3 gap-2">
            {SLOTS.map((slot) => {
              const active = startTime === slot.start && endTime === slot.end
              const Icon = SLOT_ICONS[slot.key]
              return (
                <button
                  key={slot.key}
                  type="button"
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2 text-sm font-medium transition-colors ${active ? 'border-primary bg-primary-soft text-cyan-400' : 'border-line text-slate-300 hover:bg-surface-2'}`}
                  onClick={() => {
                    setStartTime(slot.start)
                    setEndTime(slot.end)
                  }}
                >
                  <Icon className="size-4" aria-hidden />
                  {t.slots[slot.key]}
                  <span className="text-xs font-normal tabular-nums opacity-80">
                    <bdi dir="ltr">
                      {slot.start}–{slot.end}
                    </bdi>
                  </span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label className="label">
            {t.start}
            <input
              className="input"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </label>
          <label className="label">
            {t.end}
            <input className="input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          </label>
        </div>

        {error && <Alert>{error}</Alert>}

        <div className="mt-2 flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? t.saving : t.save}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ShiftForm
