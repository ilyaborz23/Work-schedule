import { useEffect, useState } from 'react'
import './App.css'
import { clearAuth, getSavedUser, type User } from './api'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import WeekCalendar from './components/WeekCalendar'
import AdminRoster from './components/AdminRoster'

function App() {
  const [user, setUser] = useState<User | null>(getSavedUser)
  const [showRegister, setShowRegister] = useState(false)

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
    <div className="app">
      <header className="app-header">
        <h1>Work Schedule</h1>
        <div className="user-info">
          <span>
            Hello, {user.name} ({user.role === 'admin' ? 'Admin' : 'Employee'})
          </span>
          <button onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <main>
        {user.role === 'admin' ? <AdminRoster /> : <WeekCalendar user={user} />}
      </main>
    </div>
  )
}

export default App
