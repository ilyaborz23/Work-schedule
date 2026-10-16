export type User = {
  id: number
  name: string
  email: string
  role: 'admin' | 'employee'
}

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const getToken = () => localStorage.getItem(TOKEN_KEY)

export const getSavedUser = (): User | null => {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const saveAuth = (token: string, user: User) => {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

// fetch wrapper: adds the token, parses JSON, throws ApiError on 4xx/5xx
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`/api${path}`, { ...options, headers })

  // Token expired or invalid: log the user out everywhere
  if (res.status === 401 && token) {
    clearAuth()
    window.dispatchEvent(new Event('logout'))
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(res.status, data?.message ?? 'Request failed')
  }
  return data as T
}

export const register = (name: string, email: string, password: string) =>
  api<User>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })

export const login = (email: string, password: string) =>
  api<{ token: string; user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
