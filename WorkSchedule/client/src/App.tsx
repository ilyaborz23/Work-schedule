import { useEffect, useState } from 'react'
import { CalendarClock, LogOut } from 'lucide-react'
import { clearAuth, getSavedUser, type User } from './api'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import WeekCalendar from './components/WeekCalendar'
import AdminRoster from './components/AdminRoster'
import LangToggle from './components/LangToggle'
import { useI18n } from './i18n'

function App() {
  const [user, setUser] = useState<User | null>(getSavedUser)
  const [showRegister, setShowRegister] = useState(false)
  const { t } = useI18n()

  // api() fires "logout" when the token expires
  useEffect(() => {
    const onLogout = () => setUser(null)
    window.addEventListener('logout', onLogout)
    return () => window.removeEventListener('logout', onLogout)
  }, [])

  const handleLogout = () => {
    clearAuth()
    setUser(null)
  }

  if (!user) {
    return showRegister ? (
      <RegisterPage onLogin={setUser} onSwitchToLogin={() => setShowRegister(false)} />
    ) : (
      <LoginPage onLogin={setUser} onSwitchToRegister={() => setShowRegister(true)} />
    )
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-primary-dark text-white shadow-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-white/15">
              <CalendarClock className="size-5" aria-hidden />
            </span>
            <h1 className="text-lg font-semibold">{t.appName}</h1>
          </div>

          <div className="flex items-center gap-1 sm:gap-3">
            <div className="hidden text-end leading-tight sm:block">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-cyan-200">{user.role === 'admin' ? t.admin : t.employee}</p>
            </div>
            <LangToggle className="text-cyan-50 hover:bg-white/10" />
            <button className="btn px-3 text-cyan-50 hover:bg-white/10" aria-label={t.logOut} onClick={handleLogout}>
              <LogOut className="size-4 rtl:-scale-x-100" aria-hidden />
              <span className="hidden sm:inline">{t.logOut}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
        {user.role === 'admin' ? <AdminRoster /> : <WeekCalendar user={user} />}
      </main>
    </div>
  )
}

export default App
