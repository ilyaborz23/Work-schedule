import { createContext, useContext } from 'react'
import type { ShiftStatus, Slot } from './api'

export type Lang = 'en' | 'he'

const en = {
  locale: 'en-GB',
  appName: 'Work Schedule',
  langButton: 'עברית',
  switchLang: 'Switch to Hebrew',

  // Login / sign up
  signInSubtitle: 'Sign in to see your shifts',
  createAccount: 'Create account',
  signUpSubtitle: 'Sign up to request shifts',
  name: 'Name',
  email: 'Email',
  password: 'Password',
  signIn: 'Sign in',
  signingIn: 'Signing in...',
  signUp: 'Sign up',
  signingUp: 'Signing up...',
  noAccount: 'No account yet?',
  haveAccount: 'Already have an account?',
  invalidLogin: 'Invalid email or password',
  loginFailed: 'Login failed, please try again',
  emailTaken: 'A user with this email already exists',
  signUpFailed: 'Sign up failed, please try again',

  // Header
  admin: 'Admin',
  employee: 'Employee',
  logOut: 'Log out',

  // Week
  previousWeek: 'Previous week',
  nextWeek: 'Next week',
  today: 'Today',
  days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  daysShort: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
  slots: { morning: 'Morning', afternoon: 'Afternoon', night: 'Night' } as Record<Slot, string>,
  slotShort: { morning: 'M', afternoon: 'A', night: 'N' } as Record<Slot, string>,
  statuses: { approved: 'Approved', pending: 'Pending', rejected: 'Rejected' } as Record<ShiftStatus, string>,

  // Employee calendar
  shift: 'Shift',
  request: 'Request',
  requestShift: (slot: string, day: string) => `Request ${slot.toLowerCase()} shift on ${day}`,
  requestsHint: (name: string) => `Signed in as ${name}. Requests wait for the admin's approval.`,
  loadFailed: 'Could not load shifts',
  somethingWrong: 'Something went wrong',

  // Admin roster
  exportExcel: 'Export Excel',
  exporting: 'Exporting...',
  exportHint: 'Approved shifts of this week',
  exportFailed: 'Could not create the Excel file',
  searchEmployee: 'Search employee',
  pendingOnly: 'Pending only',
  pendingCount: (n: number) => `${n} pending`,
  employeeCol: 'Employee',
  nameCol: 'Name',
  working: 'Working',
  workingCount: (slot: string, n: number) => `${slot}: ${n} working`,
  noEmployees: 'No employees found',
  addShiftFor: (name: string, day: string) => `Add shift for ${name} on ${day}`,

  // Shift form
  newShift: 'New shift',
  editShift: 'Edit shift',
  close: 'Close',
  employeeRequested: 'The employee requested this shift.',
  approve: 'Approve',
  reject: 'Reject',
  chooseEmployee: 'Choose employee',
  date: 'Date',
  start: 'Start',
  end: 'End',
  cancel: 'Cancel',
  save: 'Save',
  saving: 'Saving...',

  // Excel
  hours: 'Hours',
}

export type Dict = typeof en

const he: Dict = {
  locale: 'he-IL',
  appName: 'סידור עבודה',
  langButton: 'English',
  switchLang: 'החלפה לאנגלית',

  signInSubtitle: 'התחברו כדי לראות את המשמרות שלכם',
  createAccount: 'יצירת חשבון',
  signUpSubtitle: 'הירשמו כדי לבקש משמרות',
  name: 'שם',
  email: 'אימייל',
  password: 'סיסמה',
  signIn: 'התחברות',
  signingIn: 'מתחבר...',
  signUp: 'הרשמה',
  signingUp: 'נרשם...',
  noAccount: 'עדיין אין לך חשבון?',
  haveAccount: 'כבר יש לך חשבון?',
  invalidLogin: 'אימייל או סיסמה שגויים',
  loginFailed: 'ההתחברות נכשלה, נסו שוב',
  emailTaken: 'משתמש עם האימייל הזה כבר קיים',
  signUpFailed: 'ההרשמה נכשלה, נסו שוב',

  admin: 'מנהל',
  employee: 'עובד',
  logOut: 'יציאה',

  previousWeek: 'השבוע הקודם',
  nextWeek: 'השבוע הבא',
  today: 'היום',
  days: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'],
  daysShort: ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'],
  slots: { morning: 'בוקר', afternoon: 'ערב', night: 'לילה' },
  slotShort: { morning: 'ב', afternoon: 'ע', night: 'ל' },
  statuses: { approved: 'מאושר', pending: 'ממתין', rejected: 'נדחה' },

  shift: 'משמרת',
  request: 'בקשה',
  requestShift: (slot, day) => `בקשת משמרת ${slot} ביום ${day}`,
  requestsHint: (name) => `מחובר/ת בתור ${name}. בקשות ממתינות לאישור המנהל.`,
  loadFailed: 'לא ניתן לטעון משמרות',
  somethingWrong: 'משהו השתבש',

  exportExcel: 'ייצוא לאקסל',
  exporting: 'מייצא...',
  exportHint: 'המשמרות המאושרות של השבוע',
  exportFailed: 'לא ניתן ליצור קובץ אקסל',
  searchEmployee: 'חיפוש עובד',
  pendingOnly: 'ממתינים בלבד',
  pendingCount: (n) => `${n} ממתינים`,
  employeeCol: 'עובד',
  nameCol: 'שם',
  working: 'במשמרת',
  workingCount: (slot, n) => `${slot}: ${n} במשמרת`,
  noEmployees: 'לא נמצאו עובדים',
  addShiftFor: (name, day) => `הוספת משמרת ל${name} ב־${day}`,

  newShift: 'משמרת חדשה',
  editShift: 'עריכת משמרת',
  close: 'סגירה',
  employeeRequested: 'העובד ביקש את המשמרת הזו.',
  approve: 'אישור',
  reject: 'דחייה',
  chooseEmployee: 'בחרו עובד',
  date: 'תאריך',
  start: 'התחלה',
  end: 'סיום',
  cancel: 'ביטול',
  save: 'שמירה',
  saving: 'שומר...',

  hours: 'שעות',
}

export const dictionaries: Record<Lang, Dict> = { en, he }

type I18n = { lang: Lang; t: Dict; setLang: (lang: Lang) => void }

export const I18nContext = createContext<I18n>({ lang: 'en', t: en, setLang: () => {} })

// const { t, lang } = useI18n()  →  t.save, t.days[0], t.pendingCount(3)
export const useI18n = () => useContext(I18nContext)
