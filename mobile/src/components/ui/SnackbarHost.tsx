import React, { useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Toast } from './Toast';
import Icon from './Icon';
import { useSnackbarStore } from '../../store/snackbar';
import { usePlayerStore } from '../../store/player';
import { useModeStore } from '../../store/mode';
import { navigationRef } from '../../data/accountGate';

export const SnackbarHost = () => {
  const current = useSnackbarStore((s) => s.current);
  const visible = useSnackbarStore((s) => s.visible);
  const mode = useModeStore((s) => s.mode);
  const hasTrack = usePlayerStore((s) => !!s.currentTrack);
  const insets = useSafeAreaInsets();
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Keep showing the last snackbar while it transitions out.
  const last = useRef(current);
  if (current) last.current = current;
  const item = current ?? last.current;

  useEffect(() => {
    const updateRoute = () => {
      if (!navigationRef.isReady?.()) return;
      const rootState = navigationRef.getRootState?.();
      const currentRoot = rootState?.routes?.[rootState.index ?? 0]?.name;
      setIsFullScreen(currentRoot !== undefined && currentRoot !== 'Tabs');
    };

    updateRoute();
    const unsubscribe = navigationRef.addListener?.('state', updateRoute);
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  if (!item) return null;

  // On full-screen routes (Now Playing, Queue), sit above the bottom safe area inset.
  // On tabs, sit above the 64px tab bar (+ bottom inset) and 64px mini player if present.
  const bottom = isFullScreen ? insets.bottom + 16 : (hasTrack ? 128 : 64) + insets.bottom + 16;

  return (
    <Toast
      visible={visible}
      message={item.title}
      subtext={item.subtitle}
      icon={item.icon && <Icon name={item.icon} size={18} color={mode === 'offline' ? '#FFC24D' : '#00E28A'} />}
      mode={mode}
      bottom={bottom}
      accessibilityLiveRegion="polite"
    />
  );
};
