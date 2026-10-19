import { useState, type FormEvent } from 'react'
import { ApiError, createShift, setShiftStatus, updateShift, type Shift, type User } from '../api'
import { SLOTS, formatTime } from '../dates'

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

  // Runs a server call; closes the form on success, shows the server's message on failure
  const save = async (action: () => Promise<unknown>) => {
    setError('')
    setSaving(true)
    try {
      await action()
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
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
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>
          {shift ? 'Edit shift' : 'New shift'}
          {shift && <span className={`chip chip-${shift.status}`}>{shift.status}</span>}
        </h2>

        {shift?.status === 'pending' && (
          <div className="modal-actions start">
            <button type="button" disabled={saving} onClick={() => save(() => setShiftStatus(shift.id, 'approved'))}>
              Approve
            </button>
            <button
              type="button"
              className="reject"
              disabled={saving}
              onClick={() => save(() => setShiftStatus(shift.id, 'rejected'))}
            >
              Reject
            </button>
          </div>
        )}

        <label>
          Employee
          <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
            <option value="" disabled>
              Choose employee
            </option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>

        <div className="slot-presets">
          {SLOTS.map((slot) => (
            <button
              key={slot.key}
              type="button"
              className={startTime === slot.start && endTime === slot.end ? '' : 'secondary'}
              onClick={() => {
                setStartTime(slot.start)
                setEndTime(slot.end)
              }}
            >
              {slot.label}
            </button>
          ))}
        </div>

        <div className="modal-row">
          <label>
            Start
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </label>
          <label>
            End
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          </label>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ShiftForm
