import { useState, type FormEvent } from 'react'
import { ApiError, login, register, saveAuth, type User } from '../api'

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
        setError('A user with this email already exists')
      } else if (err instanceof ApiError && err.status === 400) {
        setError(err.message)
      } else {
        setError('Sign up failed, please try again')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Sign up</h1>

        <label>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Signing up...' : 'Sign up'}
        </button>

        <p className="switch">
          Already have an account?{' '}
          <button type="button" className="link" onClick={onSwitchToLogin}>
            Sign in
          </button>
        </p>
      </form>
    </div>
  )
}

export default RegisterPage
