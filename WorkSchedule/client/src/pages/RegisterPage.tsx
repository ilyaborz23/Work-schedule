import { useState, type FormEvent } from 'react'
import Alert from '../components/Alert'
import AuthLayout from '../components/AuthLayout'
import { ApiError, login, register, saveAuth, type User } from '../api'
import { useI18n } from '../i18n'

type Props = {
  onLogin: (user: User) => void
  onSwitchToLogin: () => void
}

function RegisterPage({ onLogin, onSwitchToLogin }: Props) {
  const [name, setName] = useState('')
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
      await register(name, email, password)
      // Register doesn't return a token, so log in right after
      const { token, user } = await login(email, password)
      saveAuth(token, user)
      onLogin(user)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t.emailTaken)
      } else if (err instanceof ApiError && err.status === 400) {
        setError(err.message)
      } else {
        setError(t.signUpFailed)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title={t.createAccount} subtitle={t.signUpSubtitle}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="label">
          {t.name}
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </label>

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
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>

        {error && <Alert>{error}</Alert>}

        <button type="submit" className="btn btn-primary mt-2 w-full" disabled={loading}>
          {loading ? t.signingUp : t.signUp}
        </button>

        <p className="text-center text-sm text-slate-400">
          {t.haveAccount}{' '}
          <button type="button" className="font-medium text-cyan-400 hover:underline" onClick={onSwitchToLogin}>
            {t.signIn}
          </button>
        </p>
      </form>
    </AuthLayout>
  )
}

export default RegisterPage
