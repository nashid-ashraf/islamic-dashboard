import { useState, useEffect, useCallback } from 'react';
import type { Reminder, CreateReminderInput } from '../models/reminder';
import { isCompletedToday, localDateKey, migrateReminders } from '../models/reminder';
import type { StorageService } from '../ports/storage';
import { generateId } from '../utils/dateHelpers';
import { resolveNextFireAt } from '../utils/reminderSchedule';

export interface RemindersState {
  reminders: Reminder[];
  loading: boolean;
}

export interface RemindersActions {
  addReminder: (input: CreateReminderInput) => Promise<Reminder>;
  /** Toggle today's completion entry for a reminder. */
  toggleComplete: (id: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
}

/**
 * Sort order: incomplete with a next fire-time (soonest first), then incomplete
 * without a fire-time (untimed / unscheduled), then completed-today (by most
 * recent completion). `now` is injected for deterministic tests.
 */
export function sortReminders(reminders: Reminder[], now: number = Date.now()): Reminder[] {
  const decorated = reminders.map((r) => ({
    r,
    completedToday: isCompletedToday(r, now),
    nextFire: resolveNextFireAt(r, now),
  }));

  decorated.sort((a, b) => {
    if (a.completedToday !== b.completedToday) return a.completedToday ? 1 : -1;
    if (a.nextFire !== null && b.nextFire === null) return -1;
    if (a.nextFire === null && b.nextFire !== null) return 1;
    if (a.nextFire !== null && b.nextFire !== null) return a.nextFire - b.nextFire;
    return b.r.createdAt - a.r.createdAt;
  });

  return decorated.map((d) => d.r);
}

export function useReminders(storage: StorageService): RemindersState & RemindersActions {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.getReminders().then((saved) => {
      // Storage is the trust boundary; migrate defensively in case any adapter
      // returns legacy records directly.
      setReminders(sortReminders(migrateReminders(saved)));
      setLoading(false);
    });
  }, [storage]);

  const addReminder = useCallback(
    async (input: CreateReminderInput): Promise<Reminder> => {
      const now = Date.now();
      const reminder: Reminder = {
        id: generateId(),
        version: 1,
        title: input.title,
        category: input.category ?? null,
        schedule: input.schedule,
        action: input.action ?? null,
        builtIn: false,
        enabled: true,
        completions: [],
        createdAt: now,
        updatedAt: now,
      };
      await storage.saveReminder(reminder);
      setReminders((prev) => sortReminders([...prev, reminder], now));
      return reminder;
    },
    [storage],
  );

  const toggleComplete = useCallback(
    async (id: string): Promise<void> => {
      const now = Date.now();
      const todayKey = localDateKey(now);
      let toPersist: Reminder | null = null;

      setReminders((prev) => {
        const updated = prev.map((r) => {
          if (r.id !== id) return r;
          const alreadyDone = r.completions.some((c) => c.date === todayKey);
          const completions = alreadyDone
            ? r.completions.filter((c) => c.date !== todayKey)
            : [...r.completions, { date: todayKey, completedAt: now }];
          const next: Reminder = { ...r, completions, updatedAt: now };
          toPersist = next;
          return next;
        });
        return sortReminders(updated, now);
      });

      if (toPersist) await storage.updateReminder(toPersist);
    },
    [storage],
  );

  const deleteReminder = useCallback(
    async (id: string): Promise<void> => {
      // Built-in reminders come from the shipped catalog and must never be hard-deleted —
      // disable them via the enabled flag instead.
      const target = reminders.find((r) => r.id === id);
      if (target?.builtIn) {
        const updated: Reminder = { ...target, enabled: false, updatedAt: Date.now() };
        await storage.updateReminder(updated);
        setReminders((prev) => sortReminders(prev.map((r) => (r.id === id ? updated : r))));
        return;
      }
      await storage.deleteReminder(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    },
    [storage, reminders],
  );

  return { reminders, loading, addReminder, toggleComplete, deleteReminder };
}
