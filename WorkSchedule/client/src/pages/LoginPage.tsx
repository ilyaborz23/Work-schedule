import { useState, type FormEvent } from 'react'
import Alert from '../components/Alert'
import AuthLayout from '../components/AuthLayout'
import { ApiError, login, saveAuth, type User } from '../api'
import { useI18n } from '../i18n'

type Props = {
  onLogin: (user: User) => void
  onSwitchToRegister: () => void
}

function LoginPage({ onLogin, onSwitchToRegister }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { t } = useI18n()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token, user } = await login(email, password)
      saveAuth(token, user)
      onLogin(user)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(t.invalidLogin)
      } else {
        setError(t.loginFailed)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title={t.appName} subtitle={t.signInSubtitle}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="label">
          {t.email}
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className="label">
          {t.password}
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <Alert>{error}</Alert>}

        <button type="submit" className="btn btn-primary mt-2 w-full" disabled={loading}>
          {loading ? t.signingIn : t.signIn}
        </button>

        <p className="text-center text-sm text-slate-400">
          {t.noAccount}{' '}
          <button type="button" className="font-medium text-cyan-400 hover:underline" onClick={onSwitchToRegister}>
            {t.signUp}
          </button>
        </p>
      </form>
    </AuthLayout>
  )
}

export default LoginPage
