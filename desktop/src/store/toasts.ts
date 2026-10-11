import { useSyncExternalStore } from 'react';
import type { IconName } from '../components/ui/Icon';

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  icon?: IconName;
  variant?: 'neutral' | 'acc' | 'gold';
}

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

const emit = () => {
  for (const l of listeners) l();
};

export const dismissToast = (id: number): void => {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
};

export const showToast = (toast: Omit<ToastItem, 'id'>, durationMs = 3200): void => {
  const id = nextId++;
  // Keep the stack short; the newest message is the one that matters.
  toasts = [...toasts.slice(-2), { ...toast, id }];
  emit();
  setTimeout(() => dismissToast(id), durationMs);
};

export const useToasts = (): ToastItem[] => {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => toasts,
  );
};
