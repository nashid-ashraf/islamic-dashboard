import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReminders } from './useReminders';
import { createMockStorage } from '../test/mockStorage';
import { localDateKey } from '../models/reminder';
import type { Reminder, ReminderSchedule } from '../models/reminder';

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

describe('useReminders', () => {
  it('loads, sorts, and exposes reminders from storage', async () => {
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

    // Expected order: incomplete-timed (soonest first), incomplete-untimed, completed-today
    expect(result.current.reminders.map((r) => r.id)).toEqual(['a', 'b', 'd', 'c']);
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

    expect(result.current.reminders).toHaveLength(1);
    const r = result.current.reminders[0];
    expect(r.version).toBe(1);
    expect(r.schedule).toEqual({ kind: 'once', dueTime: now + 60_000 });
    expect(r.completions).toEqual([]);
  });

  it('adds a new reminder, persists it, and re-sorts', async () => {
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

    expect(result.current.reminders).toHaveLength(1);
    expect(result.current.reminders[0]).toMatchObject({
      title: 'Read 1 page of Quran',
      version: 1,
      builtIn: false,
      enabled: true,
    });
    expect(storage.state.reminders).toHaveLength(1);
  });

  it('toggles today`s completion on and pushes to the end of the list', async () => {
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

    const ids = result.current.reminders.map((r) => r.id);
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
    await waitFor(() => expect(result.current.reminders).toHaveLength(1));

    await act(async () => {
      await result.current.deleteReminder('x');
    });

    expect(result.current.reminders).toHaveLength(0);
    expect(storage.state.reminders).toHaveLength(0);
  });

  it('soft-disables a built-in reminder instead of hard-deleting it', async () => {
    const storage = createMockStorage({
      reminders: [reminder({ id: 'seed', title: 'Morning adhkar', builtIn: true })],
    });
    const { result } = renderHook(() => useReminders(storage));
    await waitFor(() => expect(result.current.reminders).toHaveLength(1));

    await act(async () => {
      await result.current.deleteReminder('seed');
    });

    expect(result.current.reminders).toHaveLength(1);
    expect(result.current.reminders[0].enabled).toBe(false);
    expect(storage.state.reminders).toHaveLength(1);
    expect(storage.state.reminders[0].enabled).toBe(false);
  });
});
