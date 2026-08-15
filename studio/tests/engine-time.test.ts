import { describe, expect, it } from 'vitest';

import { dayPhaseForGameTime, dayPhaseForHour, hourFromGameTime } from '../src/engine/world/time';

describe('engine/world/time — time-of-day classification', () => {
  it('extracts hour from HH:MM and defaults to 12', () => {
    expect(hourFromGameTime('06:30')).toBe(6);
    expect(hourFromGameTime('17:00')).toBe(17);
    expect(hourFromGameTime('')).toBe(12);
  });

  it('classifies phases (mirrors updateTimeOverlay)', () => {
    expect(dayPhaseForHour(6)).toBe('morning');
    expect(dayPhaseForHour(9)).toBe('morning');
    expect(dayPhaseForHour(10)).toBe('noon');
    expect(dayPhaseForHour(16)).toBe('noon');
    expect(dayPhaseForHour(17)).toBe('evening');
    expect(dayPhaseForHour(20)).toBe('evening');
    expect(dayPhaseForHour(21)).toBe('night');
    expect(dayPhaseForHour(2)).toBe('night');
    expect(dayPhaseForHour(5)).toBe('night');
  });

  it('classifies a clock string directly', () => {
    expect(dayPhaseForGameTime('08:00')).toBe('morning');
    expect(dayPhaseForGameTime('19:00')).toBe('evening');
    expect(dayPhaseForGameTime('')).toBe('noon'); // default hour 12 -> noon
  });
});
