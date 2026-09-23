import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { signIn, signUp } from '../data/auth'
import { showToast } from '../store/toastStore'

/**
 * Minimal account screen so "Sign out" is not a dead end outside dev auto-login.
 * The design system has no login screen yet (see the TODO in data/auth.ts), so this
 * uses the existing surface / field / button primitives only.
 */
export default function SignIn() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const user = creating ? await signUp(email.trim(), password, name.trim() || email.split('@')[0]) : await signIn(email.trim(), password)
      showToast({ title: `Welcome, ${user.displayName}`, icon: 'check', variant: 'acc' })
      navigate('/home', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-full p-8">
      <form onSubmit={submit} className="surf flex flex-col gap-4 p-8 w-full max-w-[400px]">
        <div className="flex flex-col gap-1">
          <span className="text-h1 text-t1">{creating ? 'Create account' : 'Sign in'}</span>
          <span className="text-body-m text-t2">Your playlists, favourites and history sync to your Sonare account.</span>
        </div>
        {creating && (
          <Field icon="info" placeholder="Display name" value={name} onChange={e => setName(e.target.value)} aria-label="Display name" autoComplete="nickname" />
        )}
        <Field icon="info" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} aria-label="Email" autoComplete="email" required />
        <Field
          icon="settings"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          aria-label="Password"
          autoComplete={creating ? 'new-password' : 'current-password'}
          minLength={creating ? 8 : undefined}
          required
        />
        {error && <span className="text-body-s text-red" role="alert">{error}</span>}
        <Button type="submit" variant="acc" disabled={busy || !email || !password}>
          {busy ? 'Please wait…' : creating ? 'Create account' : 'Sign in'}
        </Button>
        <button
          type="button"
          className="text-body-s text-t3 bg-transparent border-0 cursor-pointer hover:text-t1"
          onClick={() => {
            setCreating(c => !c)
            setError(null)
          }}
        >
          {creating ? 'Already have an account? Sign in' : 'New to Sonare? Create an account'}
        </button>
      </form>
    </div>
  )
}
