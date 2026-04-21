// Pure helpers that resolve a `Reminder.schedule` into a concrete next-fire timestamp.
// Kept separate from the hook so the NotificationOrchestrator and any other caller
// can reason about scheduling without React.

import type { Reminder, ReminderSchedule, Weekday } from '../models/reminder';
import { isCompletedOn, localDateKey } from '../models/reminder';

function parseHHmm(hhmm: string): { hours: number; minutes: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

function atLocal(ms: number, hours: number, minutes: number): number {
  const d = new Date(ms);
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

/**
 * Returns the next absolute fire timestamp for a reminder, or `null` if the
 * reminder will not fire (untimed, already completed for its current window, or
 * a `prayerAnchor` — which requires external prayer-timing data and is resolved
 * separately by the NotificationOrchestrator).
 *
 * Only looks forward up to 7 days. For `weekly` schedules with no matching
 * weekday this means `null`.
 */
export function resolveNextFireAt(
  reminder: Reminder,
  now: number = Date.now(),
): number | null {
  if (!reminder.enabled) return null;
  return resolveFromSchedule(reminder.schedule, reminder, now);
}

function resolveFromSchedule(
  schedule: ReminderSchedule,
  reminder: Reminder,
  now: number,
): number | null {
  switch (schedule.kind) {
    case 'none':
      return null;

    case 'once':
      if (schedule.dueTime <= now) return null;
      if (isCompletedOn(reminder, localDateKey(schedule.dueTime))) return null;
      return schedule.dueTime;

    case 'daily': {
      if (!schedule.timeOfDay) return null;
      const parsed = parseHHmm(schedule.timeOfDay);
      if (!parsed) return null;
      const todayFire = atLocal(now, parsed.hours, parsed.minutes);
      const todayKey = localDateKey(now);
      if (todayFire > now && !isCompletedOn(reminder, todayKey)) return todayFire;
      // Fall through to tomorrow.
      const tomorrow = now + 24 * 60 * 60 * 1000;
      const tomorrowFire = atLocal(tomorrow, parsed.hours, parsed.minutes);
      const tomorrowKey = localDateKey(tomorrowFire);
      if (isCompletedOn(reminder, tomorrowKey)) return null;
      return tomorrowFire;
    }

    case 'weekly': {
      if (!schedule.timeOfDay || schedule.weekdays.length === 0) return null;
      const parsed = parseHHmm(schedule.timeOfDay);
      if (!parsed) return null;
      const weekdaySet = new Set<Weekday>(schedule.weekdays);
      // Scan today + next 7 days for the first matching weekday whose fire
      // time is in the future and hasn't been completed.
      for (let offset = 0; offset < 8; offset++) {
        const candidate = now + offset * 24 * 60 * 60 * 1000;
        const dayOfWeek = new Date(candidate).getDay() as Weekday;
        if (!weekdaySet.has(dayOfWeek)) continue;
        const fire = atLocal(candidate, parsed.hours, parsed.minutes);
        if (fire <= now) continue;
        if (isCompletedOn(reminder, localDateKey(fire))) continue;
        return fire;
      }
      return null;
    }

    case 'prayerAnchor':
      // Prayer-anchored reminders are materialized by the NotificationOrchestrator
      // against live prayer timings; they cannot be resolved from the reminder alone.
      return null;
  }
}
