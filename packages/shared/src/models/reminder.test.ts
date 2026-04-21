import { describe, it, expect } from 'vitest';
import {
  isCompletedOn,
  isCompletedToday,
  isReminderV0,
  localDateKey,
  migrateReminderV0ToV1,
  migrateReminders,
  type Reminder,
  type ReminderV0,
} from './reminder';

const FIXED_NOW = new Date('2026-04-21T10:00:00').getTime();

describe('localDateKey', () => {
  it('produces a YYYY-MM-DD key in local time', () => {
    expect(localDateKey(FIXED_NOW)).toBe('2026-04-21');
  });

  it('pads single-digit months and days', () => {
    const ms = new Date('2026-01-05T00:00:00').getTime();
    expect(localDateKey(ms)).toBe('2026-01-05');
  });
});

describe('isCompletedOn / isCompletedToday', () => {
  const base: Reminder = {
    id: 'r1',
    version: 1,
    title: 'x',
    category: null,
    schedule: { kind: 'none' },
    action: null,
    builtIn: false,
    enabled: true,
    completions: [{ date: '2026-04-21', completedAt: FIXED_NOW }],
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
  };

  it('returns true when the date key matches a completion', () => {
    expect(isCompletedOn(base, '2026-04-21')).toBe(true);
    expect(isCompletedOn(base, '2026-04-22')).toBe(false);
  });

  it('resolves "today" via the injected now', () => {
    expect(isCompletedToday(base, FIXED_NOW)).toBe(true);
    expect(isCompletedToday(base, FIXED_NOW + 24 * 60 * 60 * 1000)).toBe(false);
  });
});

describe('isReminderV0', () => {
  it('detects the legacy shape by boolean `complete` and absent `version`', () => {
    const v0: ReminderV0 = {
      id: 'a',
      title: 't',
      dueTime: null,
      repeat: 'none',
      complete: false,
      createdAt: 0,
      updatedAt: 0,
    };
    expect(isReminderV0(v0)).toBe(true);
  });

  it('rejects v1 records and garbage', () => {
    expect(isReminderV0({ version: 1 })).toBe(false);
    expect(isReminderV0(null)).toBe(false);
    expect(isReminderV0('oops')).toBe(false);
    expect(isReminderV0({})).toBe(false);
  });
});

describe('migrateReminderV0ToV1', () => {
  const base: ReminderV0 = {
    id: 'r',
    title: 'Read Quran',
    dueTime: null,
    repeat: 'none',
    complete: false,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
  };

  it('maps untimed + repeat=none → schedule kind:none, no completions', () => {
    const v1 = migrateReminderV0ToV1(base);
    expect(v1.schedule).toEqual({ kind: 'none' });
    expect(v1.completions).toEqual([]);
    expect(v1.version).toBe(1);
    expect(v1.builtIn).toBe(false);
    expect(v1.enabled).toBe(true);
  });

  it('maps dueTime + repeat=none → schedule kind:once', () => {
    const v1 = migrateReminderV0ToV1({ ...base, dueTime: FIXED_NOW + 60_000, repeat: 'none' });
    expect(v1.schedule).toEqual({ kind: 'once', dueTime: FIXED_NOW + 60_000 });
  });

  it('maps dueTime + repeat=daily → schedule kind:daily with HH:mm', () => {
    // 10:00 local at FIXED_NOW
    const v1 = migrateReminderV0ToV1({ ...base, dueTime: FIXED_NOW, repeat: 'daily' });
    expect(v1.schedule).toEqual({ kind: 'daily', timeOfDay: '10:00' });
  });

  it('maps dueTime + repeat=weekly → schedule kind:weekly with weekday + HH:mm', () => {
    // 2026-04-21 is a Tuesday → weekday 2
    const v1 = migrateReminderV0ToV1({ ...base, dueTime: FIXED_NOW, repeat: 'weekly' });
    expect(v1.schedule).toEqual({ kind: 'weekly', weekdays: [2], timeOfDay: '10:00' });
  });

  it('synthesizes a completion from `complete=true` using updatedAt', () => {
    const v1 = migrateReminderV0ToV1({ ...base, complete: true });
    expect(v1.completions).toEqual([{ date: '2026-04-21', completedAt: FIXED_NOW }]);
  });

  it('is idempotent under migrateReminders (v1 in → v1 out)', () => {
    const v1 = migrateReminderV0ToV1(base);
    const round = migrateReminders([v1]);
    expect(round).toEqual([v1]);
  });
});

describe('migrateReminders', () => {
  it('mixes v0 and v1 inputs, drops malformed records', () => {
    const v0: ReminderV0 = {
      id: 'a',
      title: 't',
      dueTime: null,
      repeat: 'none',
      complete: true,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    };
    const v1: Reminder = {
      id: 'b',
      version: 1,
      title: 'already v1',
      category: null,
      schedule: { kind: 'none' },
      action: null,
      builtIn: false,
      enabled: true,
      completions: [],
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    };
    const out = migrateReminders([v0, v1, null, 'garbage', { title: 'no marker' }]);
    expect(out).toHaveLength(2);
    expect(out[0].id).toBe('a');
    expect(out[0].version).toBe(1);
    expect(out[1]).toBe(v1);
  });
});
