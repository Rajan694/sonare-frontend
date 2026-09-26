import React, { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom'
import { Activity, AlertTriangle, KeyRound, LayoutDashboard, LogOut, SlidersHorizontal } from 'lucide-react'
import { BrandMark } from '../components/ui/BrandMark'
import Button from '../components/ui/Button'
import { cn } from '../lib/utils'
import { adminApi, isSignedIn, onSessionChange, signOut, type AdminAccount } from './api'
import { Notice, TextInput } from './ui'
import Overview from './Overview'
import ApiMetrics from './ApiMetrics'
import ErrorLogs from './ErrorLogs'
import Configuration from './Configuration'
import Account from './Account'
import '../sonare.css'

// /admin on the web build (main.tsx never loads this in the Linux window). Not linked from
// the app; it asks for the admin username and password.

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/api', label: 'API', icon: Activity },
  { to: '/admin/errors', label: 'Errors', icon: AlertTriangle },
  { to: '/admin/config', label: 'Configuration', icon: SlidersHorizontal },
  { to: '/admin/account', label: 'Account', icon: KeyRound },
]

export default function AdminApp() {
  const [signedIn, setSignedIn] = useState(isSignedIn())
  const [account, setAccount] = useState<AdminAccount | null>(null)

  useEffect(() => {
    document.title = 'Sonare admin'
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex, nofollow'
    document.head.appendChild(robots)
    return () => robots.remove()
  }, [])

  useEffect(() => onSessionChange(setSignedIn), [])

  // A token from earlier in this tab may have expired; /me finds out (a 401 signs out).
  useEffect(() => {
    if (!signedIn) {
      setAccount(null)
      return
    }
    adminApi.me().then(setAccount, () => {})
  }, [signedIn])

  return (
    <div className="min-h-screen bg-bg text-t1 font-sans">
      {signedIn ? (
        <BrowserRouter>
          <Routes>
            <Route path="/admin" element={<Shell account={account} />}>
              <Route index element={<Overview />} />
              <Route path="api" element={<ApiMetrics />} />
              <Route path="errors" element={<ErrorLogs />} />
              <Route path="config" element={<Configuration />} />
              <Route path="account" element={<Account account={account} onChange={setAccount} />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      ) : (
        <SignIn onSignedIn={setAccount} />
      )}
    </div>
  )
}

function Shell({ account }: { account: AdminAccount | null }) {
  const link = ({ isActive }: { isActive: boolean }) =>
    cn('sitem hover:bg-s2 hover:text-t1 flex-none', isActive && 'bg-s3 text-t1')

  return (
    <div className="lg:flex">
      <aside className="lg:w-60 lg:h-screen lg:sticky lg:top-0 lg:border-r border-b lg:border-b-0 border-ln bg-s0 flex lg:flex-col">
        <div className="hidden lg:flex items-center gap-2.5 px-5 h-16">
          <BrandMark size={26} />
          <span className="text-title-m">Sonare <span className="text-t3 font-normal">admin</span></span>
        </div>
        <nav className="flex lg:flex-col gap-1 px-3 py-2 lg:py-0 overflow-x-auto no-scrollbar flex-1" aria-label="Admin sections">
          {NAV.map(({ to, label, icon: Glyph, end }) => (
            <NavLink key={to} to={to} end={end} className={link}>
              <Glyph size={17} aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden lg:flex items-center justify-between gap-2 px-5 py-4 border-t border-ln">
          <span className="text-label-l text-t2 truncate">{account?.username ?? ''}</span>
          <button type="button" className="ib ib-32" onClick={signOut} aria-label="Sign out" data-tip="Sign out">
            <LogOut size={16} aria-hidden />
          </button>
        </div>
        <button type="button" className="lg:hidden ib ib-40 m-1.5 flex-none" onClick={signOut} aria-label="Sign out">
          <LogOut size={17} aria-hidden />
        </button>
      </aside>
      <main className="flex-1 min-w-0 px-4 sm:px-8 py-6 sm:py-8 max-w-[1400px]">
        {account && !account.passwordChangedAt && (
          <div className="mb-6">
            <Notice tone="warn">
              This account still has its initial password.{' '}
              <NavLink to="/admin/account" className="underline font-semibold">Change it</NavLink>
            </Notice>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}

function SignIn({ onSignedIn }: { onSignedIn: (a: AdminAccount) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onSignedIn(await adminApi.login(username.trim(), password))
    } catch (err) {
      setError((err as Error).message)
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-s1 border border-ln rounded-xl p-8 flex flex-col gap-5 shadow-e3">
        <div className="flex items-center gap-3">
          <BrandMark size={32} />
          <div>
            <h1 className="text-h2">Sonare admin</h1>
            <p className="text-body-s text-t3">Sign in to continue</p>
          </div>
        </div>
        <TextInput
          label="Username" autoComplete="username" autoFocus required spellCheck={false}
          value={username} onChange={e => setUsername(e.target.value)}
        />
        <TextInput
          label="Password" type="password" autoComplete="current-password" required
          value={password} onChange={e => setPassword(e.target.value)}
        />
        {error && <Notice>{error}</Notice>}
        <Button type="submit" variant="acc" size="lg" disabled={busy || !username.trim() || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}
