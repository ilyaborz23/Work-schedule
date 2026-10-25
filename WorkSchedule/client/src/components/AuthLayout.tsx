import { CalendarClock } from 'lucide-react'
import type { ReactNode } from 'react'
import LangToggle from './LangToggle'

type Props = {
  title: string
  subtitle: string
  children: ReactNode
}

// Centered card shared by the login and sign up pages
function AuthLayout({ title, subtitle, children }: Props) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <LangToggle className="btn-ghost absolute end-4 top-4" />
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 grid size-12 place-items-center rounded-xl bg-primary text-white shadow-sm">
            <CalendarClock className="size-6" aria-hidden />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        <div className="card p-6">{children}</div>
      </div>
    </div>
  )
}

export default AuthLayout
