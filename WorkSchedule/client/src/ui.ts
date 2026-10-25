import { Check, Clock, Moon, Sun, Sunrise, X } from 'lucide-react'
import type { ShiftStatus, Slot } from './api'

// Tailwind classes for a shift's colors, by status
export const STATUS_STYLES: Record<ShiftStatus, string> = {
  approved: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  pending: 'border-dashed border-amber-400/50 bg-amber-400/10 text-amber-300',
  rejected: 'border-slate-600 bg-slate-800 text-slate-400',
}

// Icons so status isn't shown by color alone
export const STATUS_ICONS = { approved: Check, pending: Clock, rejected: X }

export const SLOT_ICONS: Record<Slot, typeof Sun> = { morning: Sunrise, afternoon: Sun, night: Moon }
