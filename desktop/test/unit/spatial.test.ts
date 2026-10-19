import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  DEFAULT_SPATIAL,
  directionLabel,
  distanceLabel,
  fromPolar,
  resolveSpatial,
  sanitizeSpatial,
  shortestArc,
  toPolar,
  withDistance,
  type SpatialSettings,
} from '../../../shared/spatial';

const freshSpatial = async () => {
  vi.resetModules();
  return await import('../../src/audio/spatial');
};

describe('spatial audio shared model', () => {
  it('WEB-SPATIAL-001 defaults are disabled and use concert preset', () => {
    expect(DEFAULT_SPATIAL.enabled).toBe(false);
    expect(DEFAULT_SPATIAL.mode).toBe('presets');
    expect(DEFAULT_SPATIAL.preset).toBe('concert');
    expect(DEFAULT_SPATIAL.custom.x).toBe(0);
    expect(DEFAULT_SPATIAL.custom.y).toBe(0.4);
    expect(DEFAULT_SPATIAL.custom.intensity).toBe(70);
    expect(DEFAULT_SPATIAL.custom.ambience).toBe(30);
    expect(DEFAULT_SPATIAL.custom.width).toBe(60);
  });

  it('WEB-SPATIAL-002 sanitizeSpatial rejects junk and clamps (x, y) into the unit disc [0.1, 1]', () => {
    // null or undefined
    expect(sanitizeSpatial(null)).toEqual(DEFAULT_SPATIAL);
    expect(sanitizeSpatial(undefined)).toEqual(DEFAULT_SPATIAL);
    expect(sanitizeSpatial('invalid')).toEqual(DEFAULT_SPATIAL);

    // Out of disc (r > 1) clamped to radius 1.0
    const clampedFar = sanitizeSpatial({
      enabled: true,
      mode: 'custom',
      custom: { x: 3, y: 4, intensity: 150, ambience: -20, width: 200 },
    });
    expect(clampedFar.enabled).toBe(true);
    expect(clampedFar.mode).toBe('custom');
    const rFar = Math.hypot(clampedFar.custom.x, clampedFar.custom.y);
    expect(rFar).toBeCloseTo(1.0, 4);
    expect(clampedFar.custom.x).toBeCloseTo(0.6, 4);
    expect(clampedFar.custom.y).toBeCloseTo(0.8, 4);
    expect(clampedFar.custom.intensity).toBe(100);
    expect(clampedFar.custom.ambience).toBe(0);
    expect(clampedFar.custom.width).toBe(100);

    // Too close to center (r < 0.1) clamped to radius 0.1
    const clampedNear = sanitizeSpatial({
      custom: { x: 0.03, y: 0.04 },
    });
    const rNear = Math.hypot(clampedNear.custom.x, clampedNear.custom.y);
    expect(rNear).toBeCloseTo(0.1, 4);

    // Exact center (0, 0) clamped to (0, 0.1)
    const zeroNear = sanitizeSpatial({ custom: { x: 0, y: 0 } });
    expect(zeroNear.custom.x).toBe(0);
    expect(zeroNear.custom.y).toBe(0.1);
  });

  it('WEB-SPATIAL-003 polar round-trip maps angles correctly, including behind (0, -1) -> 180°', () => {
    // Front: (0, 0.5) -> azimuth 0°, distance 0.5
    const front = toPolar(0, 0.5);
    expect(front.azimuth).toBe(0);
    expect(front.distance).toBe(0.5);
    expect(front.azimuthDeg).toBe(0);
    const frontBack = fromPolar(front.azimuth, front.distance);
    expect(frontBack.x).toBeCloseTo(0, 5);
    expect(frontBack.y).toBeCloseTo(0.5, 5);

    // Right: (0.7, 0) -> azimuth pi/2, distance 0.7
    const right = toPolar(0.7, 0);
    expect(right.azimuth).toBeCloseTo(Math.PI / 2, 5);
    expect(right.distance).toBeCloseTo(0.7, 5);
    expect(right.azimuthDeg).toBeCloseTo(90, 5);

    // Behind: (0, -1) -> azimuth pi, distance 1.0, azimuthDeg 180°
    const back = toPolar(0, -1);
    expect(Math.abs(back.azimuth)).toBeCloseTo(Math.PI, 5);
    expect(back.distance).toBe(1.0);
    expect(back.azimuthDeg).toBeCloseTo(180, 5);
    const backBack = fromPolar(back.azimuth, back.distance);
    expect(backBack.x).toBeCloseTo(0, 5);
    expect(backBack.y).toBeCloseTo(-1, 5);

    // withDistance keeps angle intact
    const original = { x: 0.3, y: 0.4, intensity: 70, ambience: 30, width: 60 };
    const scaled = withDistance(original, 0.8);
    expect(Math.hypot(scaled.x, scaled.y)).toBeCloseTo(0.8, 5);
    expect(scaled.x / scaled.y).toBeCloseTo(0.3 / 0.4, 5);
  });

  it('WEB-SPATIAL-004 shortestArc from 350° to 10° passes through 0° with +20° difference', () => {
    const fromRad = (350 * Math.PI) / 180;
    const toRad = (10 * Math.PI) / 180;
    const diff = shortestArc(fromRad, toRad);
    const diffDeg = (diff * 180) / Math.PI;

    expect(diffDeg).toBeCloseTo(20, 4); // positive step of 20°
  });

  it('WEB-SPATIAL-005 directionLabel and distanceLabel format human readouts', () => {
    expect(directionLabel(0)).toBe('Front');
    expect(directionLabel((45 * Math.PI) / 180)).toBe('Front-right');
    expect(directionLabel((90 * Math.PI) / 180)).toBe('Right');
    expect(directionLabel((135 * Math.PI) / 180)).toBe('Back-right');
    expect(directionLabel(Math.PI)).toBe('Back');
    expect(directionLabel((-135 * Math.PI) / 180)).toBe('Back-left');
    expect(directionLabel((-90 * Math.PI) / 180)).toBe('Left');
    expect(directionLabel((-45 * Math.PI) / 180)).toBe('Front-left');

    expect(distanceLabel(0.2)).toBe('Close');
    expect(distanceLabel(0.4)).toBe('Near');
    expect(distanceLabel(0.65)).toBe('Mid');
    expect(distanceLabel(0.9)).toBe('Far');
  });

  it('WEB-SPATIAL-006 presets resolve to distinct acoustic parameters', () => {
    const concert = resolveSpatial({
      enabled: true,
      mode: 'presets',
      preset: 'concert',
      custom: DEFAULT_SPATIAL.custom,
    });
    const cafe = resolveSpatial({
      enabled: true,
      mode: 'presets',
      preset: 'cafe',
      custom: DEFAULT_SPATIAL.custom,
    });
    const hall = resolveSpatial({
      enabled: true,
      mode: 'presets',
      preset: 'hall',
      custom: DEFAULT_SPATIAL.custom,
    });

    expect(concert.roomId).toBe('stage');
    expect(cafe.roomId).toBe('cafe');
    expect(hall.roomId).toBe('hall');

    // Distinct RT60
    expect(cafe.room.rt60Low).toBeLessThan(concert.room.rt60Low);
    expect(concert.room.rt60Low).toBeLessThan(hall.room.rt60Low);

    // Cafe has warm high-shelf tone
    expect(cafe.tone?.type).toBe('highshelf');
    expect(cafe.tone?.gainDb).toBe(-1.5);

    // Hall has air low-pass tone
    expect(hall.tone?.type).toBe('lowpass');
    expect(hall.tone?.frequency).toBe(12000);
  });

  it('WEB-SPATIAL-007 reverb-to-direct ratio rises with distance', () => {
    const near = resolveSpatial({
      enabled: true,
      mode: 'custom',
      preset: 'concert',
      custom: { x: 0, y: 0.15, intensity: 80, ambience: 50, width: 60 },
    });
    const far = resolveSpatial({
      enabled: true,
      mode: 'custom',
      preset: 'concert',
      custom: { x: 0, y: 0.95, intensity: 80, ambience: 50, width: 60 },
    });

    const ratioNear = near.gRev / near.gDir;
    const ratioFar = far.gRev / far.gDir;

    expect(ratioFar).toBeGreaterThan(ratioNear);
  });

  it('WEB-SPATIAL-008 trim stays within bounds [-6 dB, +1.5 dB] and estimated level stays within ±1.5 dB', () => {
    for (const preset of ['concert', 'cafe', 'hall'] as const) {
      const p = resolveSpatial({
        enabled: true,
        mode: 'presets',
        preset,
        custom: DEFAULT_SPATIAL.custom,
      });
      expect(p.trimDb).toBeGreaterThanOrEqual(-6.0);
      expect(p.trimDb).toBeLessThanOrEqual(1.5);
    }

    // Grid of custom positions
    for (const d of [0.1, 0.5, 1.0]) {
      for (const angle of [0, Math.PI / 2, Math.PI]) {
        const { x, y } = fromPolar(angle, d);
        const p = resolveSpatial({
          enabled: true,
          mode: 'custom',
          preset: 'concert',
          custom: { x, y, intensity: 70, ambience: 40, width: 60 },
        });
        expect(p.trimDb).toBeGreaterThanOrEqual(-6.0);
        expect(p.trimDb).toBeLessThanOrEqual(1.5);
      }
    }
  });

  it('WEB-SPATIAL-009 rear shelf is capped at -2 dB under HRTF renderer', () => {
    // az = 180° (directly behind)
    const hrtfBehind = resolveSpatial(
      {
        enabled: true,
        mode: 'custom',
        preset: 'concert',
        custom: { x: 0, y: -0.8, intensity: 100, ambience: 30, width: 60 },
      },
      { renderer: 'hrtf' },
    );

    const headModelBehind = resolveSpatial(
      {
        enabled: true,
        mode: 'custom',
        preset: 'concert',
        custom: { x: 0, y: -0.8, intensity: 100, ambience: 30, width: 60 },
      },
      { renderer: 'headModel' },
    );

    // HRTF capped at -2 dB
    expect(hrtfBehind.rearShelfDb).toBeCloseTo(-2.0, 1);
    // Head model reaches -4 dB
    expect(headModelBehind.rearShelfDb).toBeCloseTo(-4.0, 1);
  });

  it('WEB-SPATIAL-010 bypass makes spatial stage inactive without clearing settings', () => {
    const settings: SpatialSettings = {
      enabled: true,
      mode: 'presets',
      preset: 'hall',
      custom: DEFAULT_SPATIAL.custom,
    };

    const normal = resolveSpatial(settings, { bypass: false });
    expect(normal.active).toBe(true);

    const bypassed = resolveSpatial(settings, { bypass: true });
    expect(bypassed.active).toBe(false);
    expect(bypassed.roomId).toBe('hall');
  });

  it('WEB-SPATIAL-016 desktop spatial store manages settings, continuous custom updates, bypass, and support', async () => {
    localStorage.clear();
    let mod = await freshSpatial();
    expect(mod.getSpatial()).toEqual(DEFAULT_SPATIAL);
    expect(mod.getSpatialBypass()).toBe(false);
    expect(mod.getSpatialSupport()).toBe('pending');

    const { result: spatialHook } = renderHook(() => mod.useSpatial());
    const { result: bypassHook } = renderHook(() => mod.useSpatialBypass());
    const { result: supportHook } = renderHook(() => mod.useSpatialSupport());

    expect(spatialHook.current.enabled).toBe(false);
    expect(bypassHook.current).toBe(false);
    expect(supportHook.current).toBe('pending');

    act(() => {
      mod.setSpatial({ enabled: true, preset: 'cafe' });
    });
    expect(mod.getSpatial().enabled).toBe(true);
    expect(mod.getSpatial().preset).toBe('cafe');
    expect(spatialHook.current.enabled).toBe(true);
    expect(spatialHook.current.preset).toBe('cafe');
    expect(JSON.parse(localStorage.getItem('sonare_spatial')!).preset).toBe('cafe');

    // Continuous update with commit: false updates memory state without updating localStorage
    act(() => {
      mod.setSpatialCustom({ x: 0.3, y: 0.6 }, { commit: false });
    });
    expect(mod.getSpatial().custom.x).toBeCloseTo(0.3, 2);
    expect(spatialHook.current.custom.x).toBeCloseTo(0.3, 2);
    expect(JSON.parse(localStorage.getItem('sonare_spatial')!).custom.x).toBe(0);

    // Continuous update with commit: true persists
    act(() => {
      mod.setSpatialCustom({ intensity: 90 }, { commit: true });
    });
    expect(mod.getSpatial().custom.intensity).toBe(90);
    expect(JSON.parse(localStorage.getItem('sonare_spatial')!).custom.intensity).toBe(90);

    // Bypass
    act(() => {
      mod.setSpatialBypass(true);
    });
    expect(mod.getSpatialBypass()).toBe(true);
    expect(bypassHook.current).toBe(true);

    // Support
    act(() => {
      mod.setSpatialSupport('hrtf');
    });
    expect(mod.getSpatialSupport()).toBe('hrtf');
    expect(supportHook.current).toBe('hrtf');

    // Unreadable localStorage falls back to defaults
    localStorage.setItem('sonare_spatial', '{corrupted json');
    mod = await freshSpatial();
    expect(mod.getSpatial()).toEqual(DEFAULT_SPATIAL);
  });
});
