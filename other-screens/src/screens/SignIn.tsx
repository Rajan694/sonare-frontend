import React, { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { signIn, signUp } from '../data/auth'
import { clearPendingAction, takePendingAction } from '../data/accountGate'
import { showToast } from '../store/toastStore'

/**
 * Sign in or create an account. Reached from Settings / the top bar, or from the account
 * gate when a guest tries something that saves to an account — then `reason` says why, and
 * what they were doing finishes once they're in. Uses the existing surface / field / button
 * primitives only; the design system has no login screen yet.
 */
export default function SignIn() {
  const navigate = useNavigate()
  const state = useLocation().state as { reason?: string; mode?: 'signin' | 'signup' } | null
  const [creating, setCreating] = useState(state?.mode === 'signup')
  const succeeded = useRef(false)

  // Leaving without signing in abandons the guest's pending action.
  useEffect(() => () => {
    if (!succeeded.current) clearPendingAction()
  }, [])
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
      succeeded.current = true
      showToast({ title: `Welcome, ${user.displayName}`, icon: 'check', variant: 'acc' })
      // Back to where they were (a direct visit has nowhere to go back to), then finish
      // whatever they tried as a guest — the like, the new playlist.
      if (window.history.state?.idx > 0) navigate(-1)
      else navigate('/home', { replace: true })
      await takePendingAction()?.()
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
          <span className="text-body-m text-t2">{state?.reason ?? 'Your playlists, favourites and history sync to your Sonare account.'}</span>
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
