import { addDays, startOfWeek } from '../dates'

type Props = {
  weekStart: Date
  onChange: (weekStart: Date) => void
}

function WeekNav({ weekStart, onChange }: Props) {
  const weekEnd = addDays(weekStart, 6)

  return (
    <div className="calendar-toolbar">
      <button onClick={() => onChange(addDays(weekStart, -7))}>←</button>
      <button onClick={() => onChange(startOfWeek(new Date()))}>Today</button>
      <button onClick={() => onChange(addDays(weekStart, 7))}>→</button>
      <span className="calendar-range">
        {weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} –{' '}
        {weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>
    </div>
  )
}

export default WeekNav
