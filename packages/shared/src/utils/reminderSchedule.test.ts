import { describe, it, expect } from 'vitest';
import { resolveNextFireAt } from './reminderSchedule';
import type { Reminder, ReminderSchedule } from '../models/reminder';

const NOW = new Date('2026-04-21T10:00:00').getTime(); // Tuesday

function makeReminder(schedule: ReminderSchedule, overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'r',
    version: 1,
    title: 'x',
    category: null,
    schedule,
    action: null,
    builtIn: false,
    enabled: true,
    completions: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('resolveNextFireAt', () => {
  it('returns null for disabled reminders', () => {
    const r = makeReminder({ kind: 'once', dueTime: NOW + 60_000 }, { enabled: false });
    expect(resolveNextFireAt(r, NOW)).toBeNull();
  });

  it('returns null for kind:none', () => {
    expect(resolveNextFireAt(makeReminder({ kind: 'none' }), NOW)).toBeNull();
  });

  describe('once', () => {
    it('returns dueTime when in the future and not completed', () => {
      const r = makeReminder({ kind: 'once', dueTime: NOW + 60_000 });
      expect(resolveNextFireAt(r, NOW)).toBe(NOW + 60_000);
    });

    it('returns null when dueTime is in the past', () => {
      const r = makeReminder({ kind: 'once', dueTime: NOW - 60_000 });
      expect(resolveNextFireAt(r, NOW)).toBeNull();
    });

    it('returns null when already completed on the dueTime date', () => {
      const r = makeReminder(
        { kind: 'once', dueTime: NOW + 60_000 },
        { completions: [{ date: '2026-04-21', completedAt: NOW }] },
      );
      expect(resolveNextFireAt(r, NOW)).toBeNull();
    });
  });

  describe('daily', () => {
    it('fires today when the time-of-day is still in the future', () => {
      const r = makeReminder({ kind: 'daily', timeOfDay: '22:00' });
      const fireAt = resolveNextFireAt(r, NOW);
      expect(fireAt).not.toBeNull();
      expect(new Date(fireAt!).getHours()).toBe(22);
      expect(new Date(fireAt!).getDate()).toBe(21);
    });

    it('rolls to tomorrow when today`s time-of-day has passed', () => {
      const r = makeReminder({ kind: 'daily', timeOfDay: '06:00' });
      const fireAt = resolveNextFireAt(r, NOW);
      expect(fireAt).not.toBeNull();
      expect(new Date(fireAt!).getDate()).toBe(22);
      expect(new Date(fireAt!).getHours()).toBe(6);
    });

    it('skips today and fires tomorrow when already completed today', () => {
      const r = makeReminder(
        { kind: 'daily', timeOfDay: '22:00' },
        { completions: [{ date: '2026-04-21', completedAt: NOW }] },
      );
      const fireAt = resolveNextFireAt(r, NOW);
      expect(fireAt).not.toBeNull();
      expect(new Date(fireAt!).getDate()).toBe(22);
    });

    it('returns null for untimed daily', () => {
      expect(resolveNextFireAt(makeReminder({ kind: 'daily', timeOfDay: null }), NOW)).toBeNull();
    });

    it('returns null for malformed HH:mm', () => {
      expect(resolveNextFireAt(makeReminder({ kind: 'daily', timeOfDay: '99:99' }), NOW)).toBeNull();
      expect(resolveNextFireAt(makeReminder({ kind: 'daily', timeOfDay: 'bad' }), NOW)).toBeNull();
    });
  });

  describe('weekly', () => {
    it('fires today when today is in weekdays and time-of-day is future', () => {
      // Tuesday (2) at 22:00
      const r = makeReminder({ kind: 'weekly', weekdays: [2], timeOfDay: '22:00' });
      const fireAt = resolveNextFireAt(r, NOW);
      expect(fireAt).not.toBeNull();
      expect(new Date(fireAt!).getDate()).toBe(21);
    });

    it('rolls to the next matching weekday', () => {
      // Friday only → next Friday is 2026-04-24
      const r = makeReminder({ kind: 'weekly', weekdays: [5], timeOfDay: '08:00' });
      const fireAt = resolveNextFireAt(r, NOW);
      expect(fireAt).not.toBeNull();
      expect(new Date(fireAt!).getDate()).toBe(24);
    });

    it('returns null when no weekdays configured', () => {
      const r = makeReminder({ kind: 'weekly', weekdays: [], timeOfDay: '08:00' });
      expect(resolveNextFireAt(r, NOW)).toBeNull();
    });

    it('skips a completed day and goes to the next matching weekday', () => {
      // Tuesday 22:00 but today is already completed → next Tuesday
      const r = makeReminder(
        { kind: 'weekly', weekdays: [2], timeOfDay: '22:00' },
        { completions: [{ date: '2026-04-21', completedAt: NOW }] },
      );
      const fireAt = resolveNextFireAt(r, NOW);
      expect(fireAt).not.toBeNull();
      expect(new Date(fireAt!).getDate()).toBe(28); // next Tuesday
    });
  });

  describe('prayerAnchor', () => {
    it('returns null — resolved externally by the orchestrator', () => {
      const r = makeReminder({ kind: 'prayerAnchor', anchor: { prayer: 'Maghrib', offsetMinutes: 15 } });
      expect(resolveNextFireAt(r, NOW)).toBeNull();
    });
  });
});
