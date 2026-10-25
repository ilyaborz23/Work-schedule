import ExcelJS from 'exceljs'
import type { Shift, User } from './api'
import { SLOTS, addDays, coversSlot, formatTime, placeShift, toDateKey, weekDays } from './dates'
import { dictionaries } from './i18n'

// The file is always in Hebrew, whatever language the app is in
const t = dictionaries.he

const HEADER_FILL = 'FF0E7490'
const SHIFT_FILL = 'FFD1FAE5'
const EMPTY_SLOT_FILL = 'FFFFE4E6'

const hours = (s: Shift) => (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 3_600_000

const formatDay = (d: Date) => d.toLocaleDateString(t.locale, { day: 'numeric', month: 'short', year: 'numeric' })

// A left-to-right mark in front keeps "07:00–15:00" in order on the right-to-left sheet
const ltr = (text: string) => `\u200E${text}`

const fill = (argb: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })

// Builds a right-to-left Hebrew .xlsx of one week's approved shifts (rows = employees, columns = days) and downloads it
export async function exportRoster(weekStart: Date, staff: User[], shifts: Shift[]) {
  const days = weekDays(weekStart)
  const dayKeys = days.map(toDateKey)
  const approved = shifts.filter((s) => s.status === 'approved' && dayKeys.includes(placeShift(s).day))
  const lastCol = days.length + 2

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(t.appName, { views: [{ state: 'frozen', xSplit: 1, ySplit: 3, rightToLeft: true }] })
  ws.columns = [{ width: 24 }, ...days.map(() => ({ width: 14 })), { width: 10 }]

  ws.addRow([`${t.appName} · ${formatDay(weekStart)} – ${formatDay(addDays(weekStart, 6))}`]).font = {
    bold: true,
    size: 14,
  }
  ws.mergeCells(1, 1, 1, lastCol)
  ws.addRow([])

  const header = ws.addRow([
    t.employeeCol,
    ...days.map((d) => `${t.days[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`),
    t.hours,
  ])
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = fill(HEADER_FILL)
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  header.height = 22

  for (const u of staff) {
    const mine = approved.filter((s) => s.user_id === u.id)
    const row = ws.addRow([
      u.name,
      ...dayKeys.map((day) =>
        mine
          .filter((s) => placeShift(s).day === day)
          .map((s) => ltr(`${formatTime(s.start_time)}–${formatTime(s.end_time)}`))
          .join('\n'),
      ),
      // Rounded to 2 decimals and no number format: "0.#" showed 8 as "8."
      Math.round(mine.reduce((sum, s) => sum + hours(s), 0) * 100) / 100,
    ])
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.alignment = { horizontal: col === 1 ? 'right' : 'center', vertical: 'middle', wrapText: true }
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } }
      if (col > 1 && col < lastCol && cell.value) cell.fill = fill(SHIFT_FILL)
    })
    row.getCell(lastCol).font = { bold: true }
  }

  // Coverage: how many people work each slot per day
  ws.addRow([])
  for (const slot of SLOTS) {
    const row = ws.addRow([
      `${t.slots[slot.key]} (${ltr(`${slot.start}–${slot.end}`)})`,
      ...dayKeys.map(
        (day) =>
          approved.filter((s) => coversSlot(s, day, slot)).length,
      ),
    ])
    row.font = { italic: true }
    row.eachCell((cell, col) => {
      if (col === 1) return
      cell.alignment = { horizontal: 'center' }
      if (cell.value === 0) cell.fill = fill(EMPTY_SLOT_FILL)
    })
  }

  const buffer = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `schedule-${dayKeys[0]}.xlsx`
  link.click()
  URL.revokeObjectURL(url)
}
