import { createNavigationContainerRef } from '@react-navigation/native';
import { useAuthStore } from './auth';

/** Lets code outside components (stores, gates) navigate. */
export const navigationRef = createNavigationContainerRef<Record<string, object | undefined>>();

let pending: (() => unknown) | null = null;

/**
 * Guests can listen, but anything that saves to the server needs an account. Runs `action`
 * straight away when signed in; otherwise opens sign-in with `reason` and runs `action`
 * once the user has signed in or created an account (see RootNavigator).
 */
export function requireAccount(reason: string, action: () => unknown): void {
  if (useAuthStore.getState().status === 'signedIn') {
    action();
    return;
  }
  pending = action;
  if (navigationRef.isReady()) navigationRef.navigate('SignIn', { reason });
}

/** The action a guest was attempting when asked to sign in; taking it clears it. */
export function takePendingAction(): (() => unknown) | null {
  const action = pending;
  pending = null;
  return action;
}

/** The guest backed out of signing in: forget what they were doing. */
export function clearPendingAction(): void {
  pending = null;
}
