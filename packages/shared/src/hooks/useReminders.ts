import { useState, useEffect, useCallback } from 'react';
import type { Reminder, CreateReminderInput } from '../models/reminder';
import type { StorageService } from '../storage/types';
import { generateId } from '../utils/dateHelpers';

export interface RemindersState {
  reminders: Reminder[];
  loading: boolean;
}

export interface RemindersActions {
  addReminder: (input: CreateReminderInput) => Promise<Reminder>;
  toggleComplete: (id: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
}

/**
 * Sort reminders: incomplete timed (soonest first), incomplete untimed, completed.
 */
function sortReminders(reminders: Reminder[]): Reminder[] {
  return [...reminders].sort((a, b) => {
    // Completed items go last
    if (a.complete !== b.complete) return a.complete ? 1 : -1;
    // Timed items before untimed
    if (a.dueTime !== null && b.dueTime === null) return -1;
    if (a.dueTime === null && b.dueTime !== null) return 1;
    // Sort timed items by due time (soonest first)
    if (a.dueTime !== null && b.dueTime !== null) return a.dueTime - b.dueTime;
    // Untimed items by creation date (newest first)
    return b.createdAt - a.createdAt;
  });
}

export function useReminders(storage: StorageService): RemindersState & RemindersActions {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.getReminders().then((saved) => {
      setReminders(sortReminders(saved));
      setLoading(false);
    });
  }, [storage]);

  const addReminder = useCallback(async (input: CreateReminderInput): Promise<Reminder> => {
    const now = Date.now();
    const reminder: Reminder = {
      id: generateId(),
      title: input.title,
      dueTime: input.dueTime,
      repeat: input.repeat,
      complete: false,
      createdAt: now,
      updatedAt: now,
    };
    await storage.saveReminder(reminder);
    setReminders((prev) => sortReminders([...prev, reminder]));
    return reminder;
  }, [storage]);

  const toggleComplete = useCallback(async (id: string) => {
    setReminders((prev) => {
      const updated = prev.map((r) => {
        if (r.id !== id) return r;
        const toggled = { ...r, complete: !r.complete, updatedAt: Date.now() };
        storage.updateReminder(toggled);
        return toggled;
      });
      return sortReminders(updated);
    });
  }, [storage]);

  const deleteReminder = useCallback(async (id: string) => {
    await storage.deleteReminder(id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }, [storage]);

  return { reminders, loading, addReminder, toggleComplete, deleteReminder };
}
