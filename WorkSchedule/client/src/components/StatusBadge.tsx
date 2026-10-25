import type { ShiftStatus } from '../api'
import { useI18n } from '../i18n'
import { STATUS_ICONS, STATUS_STYLES } from '../ui'

function StatusBadge({ status }: { status: ShiftStatus }) {
  const { t } = useI18n()
  const Icon = STATUS_ICONS[status]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      <Icon className="size-3.5" aria-hidden />
      {t.statuses[status]}
    </span>
  )
}

export default StatusBadge
