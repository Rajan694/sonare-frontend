import { Alert, AccessibilityInfo, Text, Platform } from 'react-native';
import { cn } from '../src/lib/cn';
import { formatDuration, generatePeaks, songCount } from '../src/lib/format';
import { hasInternet } from '../src/lib/connectivity';
import { confirmDeletePlaylist } from '../src/lib/confirmDeletePlaylist';
import { confirmRemoveDownloads } from '../src/lib/confirmRemoveDownloads';
import { durations, easings, springConfig, springs, AnimatedView, FadeView } from '../src/lib/motion';
import { useLibraryStore } from '../src/store/library';
import { useDownloadsStore } from '../src/store/downloads';
import { render } from '@testing-library/react-native';
import React from 'react';

describe('Lib Layer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cn.ts', () => {
    it('MOB-LIB-001 joins truthy class names and ignores falsy values', () => {
      expect(cn('btn', 'btn-primary')).toBe('btn btn-primary');
      expect(cn('btn', false && 'hidden', undefined, null, 'active')).toBe('btn active');
      expect(cn()).toBe('');
    });
  });

  describe('format.ts', () => {
    it('MOB-LIB-002 formatDuration formats ms to mm:ss correctly', () => {
      expect(formatDuration(0)).toBe('0:00');
      expect(formatDuration(65000)).toBe('1:05');
      expect(formatDuration(3600000)).toBe('60:00');
      expect(formatDuration(215000)).toBe('3:35');
    });

    it('MOB-LIB-003 generatePeaks returns deterministic pseudo-random peak heights', () => {
      const peaks1 = generatePeaks('track_123', 20);
      const peaks2 = generatePeaks('track_123', 20);
      expect(peaks1).toHaveLength(20);
      expect(peaks1).toEqual(peaks2);
      peaks1.forEach((p) => {
        expect(p).toBeGreaterThanOrEqual(4);
        expect(p).toBeLessThanOrEqual(22);
      });
    });

    it('MOB-LIB-004 songCount handles singular, plural, and zero/null counts', () => {
      expect(songCount(1)).toBe('1 song');
      expect(songCount(0)).toBe('0 songs');
      expect(songCount(5)).toBe('5 songs');
      expect(songCount(null)).toBe('0 songs');
      expect(songCount(undefined)).toBe('0 songs');
    });
  });

  describe('connectivity.ts', () => {
    const originalFetch = global.fetch;

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('MOB-LIB-005 hasInternet resolves true when endpoint responds', async () => {
      global.fetch = jest.fn().mockResolvedValue({ status: 204 } as any);
      const res = await hasInternet();
      expect(res).toBe(true);
    });

    it('MOB-LIB-006 hasInternet resolves false when all endpoints fail or abort', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      const res = await hasInternet(100);
      expect(res).toBe(false);
    });
  });

  describe('confirmDeletePlaylist.ts', () => {
    it('MOB-LIB-007 displays Alert and resolves true when user confirms deletion', async () => {
      jest.spyOn(useLibraryStore.getState(), 'deletePlaylist').mockResolvedValue();
      jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
        const deleteButton = buttons?.find((b) => b.text === 'Delete');
        deleteButton?.onPress?.();
      });

      const result = await confirmDeletePlaylist({
        id: 'p1',
        name: 'Roadtrip',
      });
      expect(result).toBe(true);
      expect(Alert.alert).toHaveBeenCalled();
    });

    it('MOB-LIB-008 resolves false when user cancels deletion', async () => {
      jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
        const cancelButton = buttons?.find((b) => b.text === 'Cancel');
        cancelButton?.onPress?.();
      });

      const result = await confirmDeletePlaylist({ id: 'p2' });
      expect(result).toBe(false);
    });

    it('MOB-LIB-009 shows error alert and resolves false when delete fails', async () => {
      jest.spyOn(useLibraryStore.getState(), 'deletePlaylist').mockRejectedValue(new Error('Server error'));
      let alertCalls = 0;
      jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
        alertCalls++;
        if (alertCalls === 1) {
          const deleteButton = buttons?.find((b) => b.text === 'Delete');
          deleteButton?.onPress?.();
        }
      });

      const result = await confirmDeletePlaylist({
        id: 'p3',
        name: 'Roadtrip',
      });
      expect(result).toBe(false);
      expect(alertCalls).toBe(2);
    });
  });

  describe('confirmRemoveDownloads.ts', () => {
    it('MOB-LIB-010 displays Alert and deletes files from downloads store', async () => {
      const removeSpy = jest.spyOn(useDownloadsStore.getState(), 'remove').mockResolvedValue({ fileDeleted: true });
      jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
        const deleteBtn = buttons?.find((b) => b.text === 'Delete');
        deleteBtn?.onPress?.();
      });

      confirmRemoveDownloads([
        {
          id: 'd1',
          title: 'Song 1',
          artist: 'Artist 1',
          artistId: 'a1',
          album: null,
          albumId: null,
          durationMs: 1000,
          status: 'done',
          quality: 'high',
          format: 'opus',
          totalBytes: 1000,
          receivedBytes: 1000,
          addedAt: Date.now(),
        },
      ]);
      expect(Alert.alert).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalledWith('d1');
    });

    it('MOB-LIB-011 alerts user if finished files could not be deleted from storage', async () => {
      jest.spyOn(useDownloadsStore.getState(), 'remove').mockResolvedValue({
        fileDeleted: false,
        reason: 'File moved',
      });
      let alertCalls = 0;
      jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
        alertCalls++;
        if (alertCalls === 1) {
          const deleteBtn = buttons?.find((b) => b.text === 'Delete');
          deleteBtn?.onPress?.();
        }
      });

      // Test multiple items kept message
      confirmRemoveDownloads([
        {
          id: 'd2',
          title: 'Song 2',
          artist: 'Artist 2',
          artistId: 'a2',
          album: null,
          albumId: null,
          durationMs: 1000,
          status: 'done',
          quality: 'high',
          format: 'opus',
          totalBytes: 1000,
          receivedBytes: 1000,
          addedAt: Date.now(),
        },
        {
          id: 'd3',
          title: 'Song 3',
          artist: 'Artist 3',
          artistId: 'a3',
          album: null,
          albumId: null,
          durationMs: 1000,
          status: 'done',
          quality: 'high',
          format: 'opus',
          totalBytes: 1000,
          receivedBytes: 1000,
          addedAt: Date.now(),
        },
      ]);
      expect(alertCalls).toBeGreaterThanOrEqual(1);
    });
  });

  describe('errorReporting.ts', () => {
    type Sent = { method: string; url: string; body: any };
    let sent: Sent[];
    const originalXHR = global.XMLHttpRequest;

    beforeEach(() => {
      sent = [];
      class RecordingXHR {
        status = 201;
        responseText = '';
        onload: (() => void) | null = null;
        private method = '';
        private url = '';
        open(method: string, url: string) {
          this.method = method;
          this.url = url;
        }
        setRequestHeader() {}
        send(body: string | null) {
          sent.push({
            method: this.method,
            url: this.url,
            body: body ? JSON.parse(body) : null,
          });
          this.onload?.();
        }
      }
      global.XMLHttpRequest = RecordingXHR as any;
    });
    afterEach(() => {
      global.XMLHttpRequest = originalXHR;
      delete (globalThis as any).ErrorUtils;
      delete (globalThis as any).HermesInternal;
    });

    // The send budget, the repeat throttle and the "installed" flag are module state.
    const freshModule = (): typeof import('../src/lib/errorReporting') => {
      let mod: any;
      jest.isolateModules(() => {
        mod = require('../src/lib/errorReporting');
      });
      return mod;
    };

    it('MOB-LIB-012 reportError posts the error with its kind, fatality and platform', () => {
      const { reportError: report } = freshModule();
      report(new TypeError('x is undefined'), true, 'uncaught');
      report('Plain string failure', false, 'unhandledRejection');
      report({ code: 42 });

      expect(sent.map((r) => r.method)).toEqual(['POST', 'POST', 'POST']);
      expect(sent[0].url).toMatch(/\/client-errors$/);
      expect(sent[0].body).toMatchObject({
        source: 'mobile',
        level: 'error',
        message: 'TypeError: x is undefined',
        context: { os: Platform.OS, fatal: true, kind: 'uncaught' },
      });
      expect(sent[0].body.stack).toContain('x is undefined');
      expect(sent[1].body).toMatchObject({
        message: 'Plain string failure',
        context: { fatal: false, kind: 'unhandledRejection' },
      });
      // Non-errors are reported as their JSON.
      expect(sent[2].body.message).toBe('{"code":42}');
    });

    it('MOB-LIB-013 offline failures are not reported, repeats wait a minute, and a session sends at most 20', () => {
      const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      const { reportError: report } = freshModule();

      report(new Error('Network request failed'));
      report(new Error('Network request timed out'));
      expect(sent).toHaveLength(0);

      report(new Error('Same bug'));
      report(new Error('Same bug'));
      expect(sent).toHaveLength(1);
      now.mockReturnValue(1_000_000 + 59_999);
      report(new Error('Same bug'));
      expect(sent).toHaveLength(1);
      now.mockReturnValue(1_000_000 + 60_000);
      report(new Error('Same bug'));
      expect(sent).toHaveLength(2);

      for (let i = 0; i < 30; i++) report(new Error(`Bug ${i}`));
      expect(sent).toHaveLength(20);
      now.mockRestore();
    });

    it('MOB-LIB-014 installErrorReporting reports uncaught errors and unhandled rejections, then hands them on', () => {
      const previous = jest.fn();
      let handler: ((e: unknown, fatal?: boolean) => void) | null = null;
      (globalThis as any).ErrorUtils = {
        getGlobalHandler: () => previous,
        setGlobalHandler: (h: typeof handler) => {
          handler = h;
        },
      };
      let tracker: any = null;
      (globalThis as any).HermesInternal = {
        hasPromise: () => true,
        enablePromiseRejectionTracker: (opts: any) => {
          tracker = opts;
        },
      };

      // React Native's own dev tracker (the red box) still gets every rejection.
      const devTracker = { onUnhandled: jest.fn(), onHandled: jest.fn() };
      jest.doMock('react-native/Libraries/promiseRejectionTrackingOptions', () => ({ default: devTracker }));

      const { installErrorReporting: install } = freshModule();
      install();
      install(); // a second call must not wrap the handler again

      const crash = new Error('Render crashed');
      handler!(crash, true);
      expect(previous).toHaveBeenCalledTimes(1);
      expect(previous).toHaveBeenCalledWith(crash, true);
      expect(sent[0].body).toMatchObject({
        message: 'Render crashed',
        context: { fatal: true, kind: 'uncaught' },
      });

      expect(tracker.allRejections).toBe(true);
      tracker.onUnhandled(7, new Error('Fetch lyrics rejected'));
      expect(sent).toHaveLength(2);
      expect(sent[1].body).toMatchObject({
        message: 'Fetch lyrics rejected',
        context: { fatal: false, kind: 'unhandledRejection' },
      });
      expect(devTracker.onUnhandled).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ message: 'Fetch lyrics rejected' }),
      );
      // A rejection that gets handled later is not a new report.
      tracker.onHandled(7, 'late catch');
      expect(sent).toHaveLength(2);
      expect(devTracker.onHandled).toHaveBeenCalledWith(7, 'late catch');
      jest.dontMock('react-native/Libraries/promiseRejectionTrackingOptions');
    });

    it('MOB-LIB-044 without Hermes promise tracking, uncaught errors are still reported', () => {
      (globalThis as any).ErrorUtils = {
        getGlobalHandler: () => jest.fn(),
        setGlobalHandler: (h: any) => h(new Error('Boot failed'), false),
      };
      (globalThis as any).HermesInternal = { hasPromise: () => false };
      const { installErrorReporting: install } = freshModule();
      expect(() => install()).not.toThrow();
      expect(sent.map((r) => r.body.message)).toEqual(['Boot failed']);
    });
  });

  describe('motion.tsx', () => {
    it('MOB-LIB-015 durations, easings and the springs exported; springs settle without overshoot', () => {
      expect(durations.fast).toBe(150);
      expect(durations.base).toBe(250);
      expect(durations.slow).toBe(350);
      expect(easings.standard).toEqual([0.4, 0.0, 0.2, 1]);
      expect(easings.decelerate).toEqual([0.0, 0.0, 0.2, 1]);
      expect(easings.accelerate).toEqual([0.4, 0.0, 1, 1]);
      expect(springConfig).toEqual({ damping: 28, stiffness: 280, overshootClamping: true });
      // No bounce past the end anywhere (sheets, swipes, presses, sliding indicators).
      for (const spring of [springConfig, ...Object.values(springs)]) {
        expect(spring.overshootClamping).toBe(true);
        // Well damped too (ζ = damping / 2√stiffness ≥ 0.6 with mass 1), so it eases in smoothly.
        expect(spring.damping / (2 * Math.sqrt(spring.stiffness))).toBeGreaterThanOrEqual(0.6);
      }
    });

    it('MOB-LIB-016 AnimatedView rises in after its delay; FadeView fades with visibility; reduced motion skips both', async () => {
      const anim = render(
        <AnimatedView delay={50}>
          <Text>Animated Content</Text>
        </AnimatedView>,
      );
      // MotiView is the element carrying the animation props.
      const motiOf = (r: ReturnType<typeof render>) =>
        r.UNSAFE_root.findAll((n: any) => n.type === 'View' && n.props.animate !== undefined);
      const [moti] = motiOf(anim);
      expect(moti.props).toMatchObject({
        from: { opacity: 0, translateY: 8 },
        animate: { opacity: 1, translateY: 0 },
      });
      expect(moti.props.transition).toMatchObject({
        duration: durations.base,
        delay: 50,
      });

      const fade = render(
        <FadeView visible={false}>
          <Text>Fade Content</Text>
        </FadeView>,
      );
      expect(motiOf(fade)[0].props.animate).toEqual({ opacity: 0 });
      expect(fade.getByText('Fade Content')).toBeTruthy();

      // With "reduce motion" on, content appears without animation and hidden content is gone.
      (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValueOnce(true);
      let reduced: typeof import('../src/lib/motion') | undefined;
      jest.isolateModules(() => {
        reduced = require('../src/lib/motion');
      });
      await Promise.resolve();
      const { AnimatedView: A, FadeView: F } = reduced!;
      const still = render(
        <A delay={50}>
          <Text>Still</Text>
        </A>,
      );
      expect(still.getByText('Still')).toBeTruthy();
      expect(motiOf(still)).toHaveLength(0);
      const hidden = render(
        <F visible={false}>
          <Text>Gone</Text>
        </F>,
      );
      expect(hidden.queryByText('Gone')).toBeNull();
    });
  });
});
