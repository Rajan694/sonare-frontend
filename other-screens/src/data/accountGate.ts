import { isAuthenticated } from './auth'

/**
 * Guests can browse and listen; anything saved to the server needs an account. This runs
 * such an action straight away when signed in, and otherwise sends the guest to /signin
 * with the reason, finishing the action once they've signed in (see SignIn.tsx).
 */

type Navigate = (to: string, options?: { state?: unknown }) => void

let navigate: Navigate | null = null
let pending: (() => unknown) | null = null

/** AppShell hands over the router's navigate so non-component code can open /signin. */
export function bindAccountGateNavigator(fn: Navigate): void {
  navigate = fn
}

export function requireAccount(reason: string, action: () => unknown): void {
  if (isAuthenticated()) {
    action()
    return
  }
  pending = action
  navigate?.('/signin', { state: { reason, mode: 'signup' } })
}

/** What the guest was doing when asked to sign in; taking it clears it. */
export function takePendingAction(): (() => unknown) | null {
  const action = pending
  pending = null
  return action
}

export function clearPendingAction(): void {
  pending = null
}
