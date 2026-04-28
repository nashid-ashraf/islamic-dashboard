import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReminders } from './useReminders';
import { createMockStorage } from '../test/mockStorage';
import { localDateKey } from '../models/reminder';
import type { Reminder, ReminderSchedule } from '../models/reminder';
import {
  BUILT_IN_REMINDERS,
  BUILT_IN_REMINDER_IDS,
} from '../data/builtInReminders';

// Use real time; tests derive "today" dynamically so they stay valid across dates.
const TODAY = localDateKey();

function reminder(overrides: Partial<Reminder>): Reminder {
  const now = Date.now();
  return {
    id: 'r' + Math.random().toString(36).slice(2),
    version: 1,
    title: 'Untitled',
    category: null,
    schedule: { kind: 'none' } as ReminderSchedule,
    action: null,
    builtIn: false,
    enabled: true,
    completions: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/** Drops built-in catalog seeds; lets us assert against just the user's own data. */
function userOnly(rs: Reminder[]): Reminder[] {
  return rs.filter((r) => !r.builtIn);
}

describe('useReminders', () => {
  it('loads, sorts, and exposes user reminders from storage (alongside the catalog seed)', async () => {
    const now = Date.now();
    const storage = createMockStorage({
      reminders: [
        reminder({
          id: 'c',
          title: 'Done thing',
          schedule: { kind: 'once', dueTime: now + 1000 },
          completions: [{ date: TODAY, completedAt: now }],
        }),
        reminder({ id: 'b', title: 'Later', schedule: { kind: 'once', dueTime: now + 10_000 } }),
        reminder({ id: 'a', title: 'Soon', schedule: { kind: 'once', dueTime: now + 1000 } }),
        reminder({ id: 'd', title: 'Untimed', schedule: { kind: 'none' } }),
      ],
    });
    const { result } = renderHook(() => useReminders(storage));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Catalog seeds are present alongside user data.
    expect(result.current.reminders.length).toBe(4 + BUILT_IN_REMINDERS.length);

    // User-only ordering matches the original spec: incomplete-timed (soonest first),
    // incomplete-untimed, completed-today.
    expect(userOnly(result.current.reminders).map((r) => r.id)).toEqual(['a', 'b', 'd', 'c']);
  });

  it('migrates v0 records on load and exposes them as v1', async () => {
    const now = Date.now();
    const storage = createMockStorage();
    // Bypass the typed setter to inject legacy-shaped data directly.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (storage.state.reminders as any[]).push({
      id: 'legacy',
      title: 'Legacy task',
      dueTime: now + 60_000,
      repeat: 'none',
      complete: false,
      createdAt: now,
      updatedAt: now,
    });

    const { result } = renderHook(() => useReminders(storage));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const users = userOnly(result.current.reminders);
    expect(users).toHaveLength(1);
    const r = users[0];
    expect(r.version).toBe(1);
    expect(r.schedule).toEqual({ kind: 'once', dueTime: now + 60_000 });
    expect(r.completions).toEqual([]);
  });

  it('adds a new reminder, persists it, and exposes it next to the catalog', async () => {
    const storage = createMockStorage();
    const { result } = renderHook(() => useReminders(storage));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const futureDue = Date.now() + 60_000;
    await act(async () => {
      await result.current.addReminder({
        title: 'Read 1 page of Quran',
        schedule: { kind: 'once', dueTime: futureDue },
      });
    });

    const users = userOnly(result.current.reminders);
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({
      title: 'Read 1 page of Quran',
      version: 1,
      builtIn: false,
      enabled: true,
    });
    // Catalog seeds remain virtual until touched — only the user reminder hit storage.
    expect(storage.state.reminders).toHaveLength(1);
  });

  it('toggles today`s completion on and pushes to the end of the user-visible list', async () => {
    const now = Date.now();
    const storage = createMockStorage({
      reminders: [
        reminder({ id: 'a', title: 'Thing A', schedule: { kind: 'once', dueTime: now + 1000 } }),
        reminder({ id: 'b', title: 'Thing B', schedule: { kind: 'once', dueTime: now + 2000 } }),
      ],
    });
    const { result } = renderHook(() => useReminders(storage));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggleComplete('a');
    });

    const ids = userOnly(result.current.reminders).map((r) => r.id);
    expect(ids).toEqual(['b', 'a']);
    const a = result.current.reminders.find((r) => r.id === 'a')!;
    expect(a.completions).toHaveLength(1);
    expect(a.completions[0].date).toBe(TODAY);
  });

  it('toggles today`s completion off without removing history for other days', async () => {
    const YESTERDAY = localDateKey(Date.now() - 24 * 60 * 60 * 1000);
    const now = Date.now();
    const storage = createMockStorage({
      reminders: [
        reminder({
          id: 'a',
          schedule: { kind: 'daily', timeOfDay: '22:00' },
          completions: [
            { date: YESTERDAY, completedAt: now - 86_400_000 },
            { date: TODAY, completedAt: now },
          ],
        }),
      ],
    });
    const { result } = renderHook(() => useReminders(storage));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggleComplete('a');
    });

    const a = result.current.reminders.find((r) => r.id === 'a')!;
    expect(a.completions).toHaveLength(1);
    expect(a.completions[0].date).toBe(YESTERDAY);
  });

  it('deletes a user reminder and removes it from storage', async () => {
    const storage = createMockStorage({
      reminders: [reminder({ id: 'x', title: 'Delete me' })],
    });
    const { result } = renderHook(() => useReminders(storage));
    await waitFor(() => expect(userOnly(result.current.reminders)).toHaveLength(1));

    await act(async () => {
      await result.current.deleteReminder('x');
    });

    expect(userOnly(result.current.reminders)).toHaveLength(0);
    expect(storage.state.reminders).toHaveLength(0);
  });

  describe('built-in catalog integration', () => {
    it('seeds the full catalog on a cold install', async () => {
      const storage = createMockStorage();
      const { result } = renderHook(() => useReminders(storage));
      await waitFor(() => expect(result.current.loading).toBe(false));

      const ids = result.current.reminders.map((r) => r.id);
      for (const seed of BUILT_IN_REMINDERS) {
        expect(ids).toContain(seed.id);
      }
      // Storage is untouched — catalog seeds are virtual until first mutation.
      expect(storage.state.reminders).toHaveLength(0);
    });

    it('persists the first toggleComplete on a built-in via upsert', async () => {
      const storage = createMockStorage();
      const { result } = renderHook(() => useReminders(storage));
      await waitFor(() => expect(result.current.loading).toBe(false));
      const target = BUILT_IN_REMINDERS[0];

      await act(async () => {
        await result.current.toggleComplete(target.id);
      });

      const inState = result.current.reminders.find((r) => r.id === target.id)!;
      expect(inState.completions).toHaveLength(1);
      const inStorage = storage.state.reminders.find((r) => r.id === target.id);
      expect(inStorage).toBeDefined();
      expect(inStorage!.completions).toHaveLength(1);
    });

    it('soft-disables a built-in via deleteReminder (first touch persists via upsert)', async () => {
      const storage = createMockStorage();
      const { result } = renderHook(() => useReminders(storage));
      await waitFor(() => expect(result.current.loading).toBe(false));
      const target = BUILT_IN_REMINDERS[0];

      await act(async () => {
        await result.current.deleteReminder(target.id);
      });

      const inState = result.current.reminders.find((r) => r.id === target.id);
      expect(inState).toBeDefined();
      expect(inState!.enabled).toBe(false);
      const inStorage = storage.state.reminders.find((r) => r.id === target.id);
      expect(inStorage).toBeDefined();
      expect(inStorage!.enabled).toBe(false);
    });

    it('reload preserves user state on built-ins; catalog still owns title/schedule', async () => {
      const storage = createMockStorage();
      const target = BUILT_IN_REMINDERS[1];

      const first = renderHook(() => useReminders(storage));
      await waitFor(() => expect(first.result.current.loading).toBe(false));
      await act(async () => {
        await first.result.current.toggleComplete(target.id);
      });

      const reloaded = renderHook(() => useReminders(storage));
      await waitFor(() => expect(reloaded.result.current.loading).toBe(false));
      const r = reloaded.result.current.reminders.find((x) => x.id === target.id)!;
      expect(r.completions).toHaveLength(1);
      expect(r.title).toBe(target.title);
      expect(BUILT_IN_REMINDER_IDS.has(r.id)).toBe(true);
    });
  });
});
