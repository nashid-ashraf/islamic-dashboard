import { describe, it, expect } from 'vitest';
import {
  BUILT_IN_REMINDERS,
  BUILT_IN_REMINDER_IDS,
  BUILTIN_REMINDER_EPOCH,
  mergeWithBuiltInCatalog,
} from './builtInReminders';
import type { Reminder } from '../models/reminder';

describe('built-in reminder catalog', () => {
  it('every entry is flagged builtIn and follows the builtin-* id convention', () => {
    for (const r of BUILT_IN_REMINDERS) {
      expect(r.builtIn).toBe(true);
      expect(r.id.startsWith('builtin-')).toBe(true);
      expect(r.version).toBe(1);
    }
  });

  it('every entry uses the deterministic epoch for createdAt/updatedAt', () => {
    for (const r of BUILT_IN_REMINDERS) {
      expect(r.createdAt).toBe(BUILTIN_REMINDER_EPOCH);
      expect(r.updatedAt).toBe(BUILTIN_REMINDER_EPOCH);
    }
  });

  it('catalog ids are unique and the lookup set matches', () => {
    const ids = BUILT_IN_REMINDERS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(BUILT_IN_REMINDER_IDS.has(id)).toBe(true);
  });

  it('covers the FR-EX3/4/6/7/8 reclassified items', () => {
    const ids = new Set(BUILT_IN_REMINDERS.map((r) => r.id));
    expect(ids).toContain('builtin-duha');
    expect(ids).toContain('builtin-post-maghrib-sunnah');
    expect(ids).toContain('builtin-friday-kahf');
    expect(ids).toContain('builtin-mulk-bedtime');
    expect(ids).toContain('builtin-sajdah-bedtime');
  });

  it('Quran-action entries point at the right surahs', () => {
    const byId = new Map(BUILT_IN_REMINDERS.map((r) => [r.id, r]));
    expect(byId.get('builtin-friday-kahf')?.action).toEqual({ kind: 'quran', surah: 18 });
    expect(byId.get('builtin-mulk-bedtime')?.action).toEqual({ kind: 'quran', surah: 67 });
    expect(byId.get('builtin-sajdah-bedtime')?.action).toEqual({ kind: 'quran', surah: 32 });
  });
});

describe('mergeWithBuiltInCatalog', () => {
  function userReminder(id: string, overrides: Partial<Reminder> = {}): Reminder {
    return {
      id,
      version: 1,
      title: 'User',
      category: null,
      schedule: { kind: 'daily', timeOfDay: '08:00' },
      action: null,
      builtIn: false,
      enabled: true,
      completions: [],
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
      ...overrides,
    };
  }

  it('seeds the full catalog when storage is empty', () => {
    const merged = mergeWithBuiltInCatalog([]);
    expect(merged).toHaveLength(BUILT_IN_REMINDERS.length);
    expect(merged.map((r) => r.id)).toEqual(BUILT_IN_REMINDERS.map((r) => r.id));
  });

  it('preserves catalog order even when storage rows are out of order', () => {
    const stored: Reminder[] = [
      { ...BUILT_IN_REMINDERS[3], enabled: false },
      { ...BUILT_IN_REMINDERS[0], enabled: false },
    ];
    const merged = mergeWithBuiltInCatalog(stored);
    expect(merged.map((r) => r.id)).toEqual(BUILT_IN_REMINDERS.map((r) => r.id));
  });

  it('takes enabled/completions/updatedAt from storage but keeps catalog title/schedule/action', () => {
    const seed = BUILT_IN_REMINDERS[0];
    const stored: Reminder = {
      ...seed,
      title: 'STALE TITLE FROM PRIOR APP VERSION',
      schedule: { kind: 'none' },
      action: { kind: 'quran', surah: 1 },
      enabled: false,
      completions: [{ date: '2026-04-22', completedAt: 1_700_000_000_000 }],
      updatedAt: 1_700_000_999_999,
    };
    const merged = mergeWithBuiltInCatalog([stored]);
    const target = merged.find((r) => r.id === seed.id)!;
    // catalog wins for presentational/scheduling
    expect(target.title).toBe(seed.title);
    expect(target.schedule).toEqual(seed.schedule);
    expect(target.action).toEqual(seed.action);
    // storage wins for user-mutable state
    expect(target.enabled).toBe(false);
    expect(target.completions).toEqual([{ date: '2026-04-22', completedAt: 1_700_000_000_000 }]);
    expect(target.updatedAt).toBe(1_700_000_999_999);
  });

  it('appends user-created reminders after the catalog in their original order', () => {
    const u1 = userReminder('user-1', { title: 'one' });
    const u2 = userReminder('user-2', { title: 'two' });
    const merged = mergeWithBuiltInCatalog([u1, u2]);
    expect(merged).toHaveLength(BUILT_IN_REMINDERS.length + 2);
    expect(merged[merged.length - 2].id).toBe('user-1');
    expect(merged[merged.length - 1].id).toBe('user-2');
  });

  it('drops orphaned built-ins (builtIn flag, id no longer in catalog)', () => {
    const orphan: Reminder = {
      id: 'builtin-removed-feature',
      version: 1,
      title: 'Removed in a later version',
      category: null,
      schedule: { kind: 'none' },
      action: null,
      builtIn: true,
      enabled: true,
      completions: [{ date: '2026-04-22', completedAt: 0 }],
      createdAt: 0,
      updatedAt: 0,
    };
    const merged = mergeWithBuiltInCatalog([orphan]);
    expect(merged.find((r) => r.id === orphan.id)).toBeUndefined();
  });

  it('does not double-insert when a stored built-in matches a catalog entry', () => {
    const stored = { ...BUILT_IN_REMINDERS[0] };
    const merged = mergeWithBuiltInCatalog([stored]);
    expect(merged.filter((r) => r.id === stored.id)).toHaveLength(1);
  });
});
