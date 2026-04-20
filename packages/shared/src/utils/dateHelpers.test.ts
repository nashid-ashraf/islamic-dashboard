import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  prayerTimeToMinutes,
  prayerTimeToDate,
  getNextPrayer,
  formatCountdown,
  formatHijriDate,
  generateId,
} from './dateHelpers';
import type { PrayerTimings } from '../models/prayer';
import { PRAYER_NAMES } from '../models/prayer';

describe('prayerTimeToMinutes', () => {
  it('converts HH:MM to total minutes', () => {
    expect(prayerTimeToMinutes('05:15')).toBe(315);
    expect(prayerTimeToMinutes('00:00')).toBe(0);
    expect(prayerTimeToMinutes('23:59')).toBe(23 * 60 + 59);
  });
});

describe('prayerTimeToDate', () => {
  it('sets hours/minutes on the provided base date', () => {
    const base = new Date('2026-04-18T00:00:00');
    const d = prayerTimeToDate('14:30', base);
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
    expect(d.getSeconds()).toBe(0);
  });
});

describe('getNextPrayer', () => {
  const timings: PrayerTimings = {
    Fajr: '05:00',
    Sunrise: '06:15',
    Dhuhr: '12:00',
    Asr: '15:30',
    Maghrib: '18:00',
    Isha: '19:30',
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the first prayer whose time is after now', () => {
    vi.setSystemTime(new Date('2026-04-18T13:00:00'));
    const next = getNextPrayer(timings, PRAYER_NAMES);
    expect(next).toEqual({ name: 'Asr', index: 3 });
  });

  it('returns null when all prayers have passed', () => {
    vi.setSystemTime(new Date('2026-04-18T20:00:00'));
    expect(getNextPrayer(timings, PRAYER_NAMES)).toBeNull();
  });

  it('returns Fajr before dawn', () => {
    vi.setSystemTime(new Date('2026-04-18T03:00:00'));
    const next = getNextPrayer(timings, PRAYER_NAMES);
    expect(next?.name).toBe('Fajr');
  });
});

describe('formatCountdown', () => {
  it('renders minutes only for sub-hour values', () => {
    expect(formatCountdown(30)).toBe('30m');
  });
  it('renders hours only when minutes are zero', () => {
    expect(formatCountdown(120)).toBe('2h');
  });
  it('renders combined h/m', () => {
    expect(formatCountdown(135)).toBe('2h 15m');
  });
  it('returns Now for zero or negative', () => {
    expect(formatCountdown(0)).toBe('Now');
    expect(formatCountdown(-5)).toBe('Now');
  });
});

describe('formatHijriDate', () => {
  it('joins weekday, day, month, year with AH suffix', () => {
    const hijri = {
      day: '15',
      month: { en: 'Shawwal' },
      year: '1447',
      weekday: { en: 'Wednesday' },
    };
    expect(formatHijriDate(hijri)).toBe('Wednesday · 15 Shawwal 1447 AH');
  });
});

describe('generateId', () => {
  it('produces unique values across rapid calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) ids.add(generateId());
    expect(ids.size).toBe(100);
  });
});
