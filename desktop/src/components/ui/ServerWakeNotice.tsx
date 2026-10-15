import React, { useSyncExternalStore } from 'react';
import { Toast } from './Toast';
import { isServerWaking, subscribeServerWaking } from '../../../../shared/net/serverWake';

/** Shown while a request waits for the sleeping server to start (shared/net/serverWake.ts). */
export const ServerWakeNotice = () => {
  const waking = useSyncExternalStore(subscribeServerWaking, isServerWaking);
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] pointer-events-none max-w-[calc(100vw-32px)]"
    >
      <Toast
        show={waking}
        icon="cloud"
        variant="acc"
        title="Waking up the Sonare server"
        description="After a quiet while it takes up to a minute to start."
      />
    </div>
  );
};
