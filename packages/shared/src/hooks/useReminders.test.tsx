import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReminders } from './useReminders';
import { createMockStorage } from '../test/mockStorage';
import type { Reminder } from '../models/reminder';

const FIXED_NOW = 1_700_000_000_000;

function reminder(overrides: Partial<Reminder>): Reminder {
  return {
    id: 'r' + Math.random().toString(36).slice(2),
    title: 'Untitled',
    dueTime: null,
    repeat: 'none',
    complete: false,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    ...overrides,
  };
}

describe('useReminders', () => {
  it('loads, sorts, and exposes reminders from storage', async () => {
    const storage = createMockStorage({
      reminders: [
        reminder({ id: 'c', title: 'Done thing', complete: true, dueTime: FIXED_NOW + 1000 }),
        reminder({ id: 'b', title: 'Later', dueTime: FIXED_NOW + 10_000 }),
        reminder({ id: 'a', title: 'Soon', dueTime: FIXED_NOW + 1000 }),
        reminder({ id: 'd', title: 'Untimed', dueTime: null }),
      ],
    });
    const { result } = renderHook(() => useReminders(storage));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Expected order: incomplete-timed (soonest first), incomplete-untimed, complete
    expect(result.current.reminders.map((r) => r.id)).toEqual(['a', 'b', 'd', 'c']);
  });

  it('adds a new reminder, persists it, and re-sorts', async () => {
    const storage = createMockStorage();
    const { result } = renderHook(() => useReminders(storage));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addReminder({
        title: 'Read 1 page of Quran',
        dueTime: FIXED_NOW + 60_000,
        repeat: 'daily',
      });
    });

    expect(result.current.reminders).toHaveLength(1);
    expect(result.current.reminders[0]).toMatchObject({
      title: 'Read 1 page of Quran',
      repeat: 'daily',
      complete: false,
    });
    expect(storage.state.reminders).toHaveLength(1);
  });

  it('toggles a reminder to complete and pushes it to the end of the list', async () => {
    const storage = createMockStorage({
      reminders: [
        reminder({ id: 'a', title: 'Thing A', dueTime: FIXED_NOW + 1000 }),
        reminder({ id: 'b', title: 'Thing B', dueTime: FIXED_NOW + 2000 }),
      ],
    });
    const { result } = renderHook(() => useReminders(storage));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggleComplete('a');
    });

    const ids = result.current.reminders.map((r) => r.id);
    expect(ids).toEqual(['b', 'a']);
    expect(result.current.reminders.find((r) => r.id === 'a')?.complete).toBe(true);
  });

  it('deletes a reminder and removes it from storage', async () => {
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
});
