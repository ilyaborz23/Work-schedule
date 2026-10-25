import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, startOfWeek } from '../dates'
import { useI18n } from '../i18n'

type Props = {
  weekStart: Date
  onChange: (weekStart: Date) => void
}

const arrowClass = 'grid size-10 place-items-center text-slate-300 transition-colors hover:bg-surface-2 hover:text-slate-100'

function WeekNav({ weekStart, onChange }: Props) {
  const { t } = useI18n()
  const weekEnd = addDays(weekStart, 6)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
        <button className={arrowClass} aria-label={t.previousWeek} onClick={() => onChange(addDays(weekStart, -7))}>
          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
        </button>
        <button
          className="h-10 border-x border-line px-4 text-sm font-medium text-slate-200 transition-colors hover:bg-surface-2"
          onClick={() => onChange(startOfWeek(new Date()))}
        >
          {t.today}
        </button>
        <button className={arrowClass} aria-label={t.nextWeek} onClick={() => onChange(addDays(weekStart, 7))}>
          <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
        </button>
      </div>
      <h2 className="text-lg font-semibold tabular-nums">
        {weekStart.toLocaleDateString(t.locale, { day: 'numeric', month: 'short' })} –{' '}
        {weekEnd.toLocaleDateString(t.locale, { day: 'numeric', month: 'short', year: 'numeric' })}
      </h2>
    </div>
  )
}

export default WeekNav
