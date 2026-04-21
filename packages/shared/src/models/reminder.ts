// Reminder domain model (v1).
//
// Supports pre-seeded catalog entries, day-of-week scheduling, prayer-anchored
// timings, deep-link actions, and completion history. Previous v0 shape (boolean
// `complete` + `repeat: none|daily|weekly` + flat `dueTime`) is migrated on read
// via `migrateReminders` and must not be written anywhere.

import type { PrayerName } from './prayer';

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday

export interface PrayerAnchor {
  prayer: PrayerName;
  /** Negative = before the prayer time, positive = after. */
  offsetMinutes: number;
}

export type ReminderSchedule =
  | { kind: 'none' }
  | { kind: 'once'; dueTime: number }
  | { kind: 'daily'; timeOfDay: string | null }        // 'HH:mm' or null if untimed
  | { kind: 'weekly'; weekdays: Weekday[]; timeOfDay: string | null }
  | { kind: 'prayerAnchor'; anchor: PrayerAnchor };

export type AdhkarRoutine =
  | 'morning'
  | 'evening'
  | 'sleep'
  | 'waking'
  | 'friday-post-asr'
  | 'post-salah';

export type ReminderAction =
  | { kind: 'quran'; surah: number; ayah?: number }
  | { kind: 'adhkar'; routine: AdhkarRoutine };

export interface ReminderCompletion {
  /** Local calendar date, formatted `YYYY-MM-DD`. */
  date: string;
  /** Unix ms when the completion was recorded. */
  completedAt: number;
}

export interface Reminder {
  id: string;
  version: 1;
  title: string;
  category: string | null;
  schedule: ReminderSchedule;
  action: ReminderAction | null;
  /** True for pre-seeded catalog entries (cannot be deleted, only toggled off). */
  builtIn: boolean;
  /** User toggle — primarily used to hide built-in items. User-created default true. */
  enabled: boolean;
  completions: ReminderCompletion[];
  createdAt: number;
  updatedAt: number;
}

export interface CreateReminderInput {
  title: string;
  schedule: ReminderSchedule;
  category?: string;
  action?: ReminderAction;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers

/** Local-calendar `YYYY-MM-DD` key. Uses the host timezone. */
export function localDateKey(ms: number = Date.now()): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isCompletedOn(reminder: Reminder, dateKey: string): boolean {
  return reminder.completions.some((c) => c.date === dateKey);
}

export function isCompletedToday(reminder: Reminder, now: number = Date.now()): boolean {
  return isCompletedOn(reminder, localDateKey(now));
}

// ──────────────────────────────────────────────────────────────────────────────
// v0 → v1 migration

/** Legacy shape shipped in v1.0 storage. Kept for migration only — never written. */
export interface ReminderV0 {
  id: string;
  title: string;
  dueTime: number | null;
  repeat: 'none' | 'daily' | 'weekly';
  complete: boolean;
  createdAt: number;
  updatedAt: number;
}

function formatHHmm(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function isReminderV0(r: unknown): r is ReminderV0 {
  if (!r || typeof r !== 'object') return false;
  const o = r as Record<string, unknown>;
  return typeof o.complete === 'boolean' && !('version' in o);
}

export function migrateReminderV0ToV1(v0: ReminderV0): Reminder {
  let schedule: ReminderSchedule;
  if (v0.dueTime === null) {
    if (v0.repeat === 'none') schedule = { kind: 'none' };
    else if (v0.repeat === 'daily') schedule = { kind: 'daily', timeOfDay: null };
    else schedule = { kind: 'weekly', weekdays: [], timeOfDay: null };
  } else if (v0.repeat === 'none') {
    schedule = { kind: 'once', dueTime: v0.dueTime };
  } else if (v0.repeat === 'daily') {
    schedule = { kind: 'daily', timeOfDay: formatHHmm(v0.dueTime) };
  } else {
    const weekdays: Weekday[] = [new Date(v0.dueTime).getDay() as Weekday];
    schedule = { kind: 'weekly', weekdays, timeOfDay: formatHHmm(v0.dueTime) };
  }

  const completions: ReminderCompletion[] = v0.complete
    ? [{ date: localDateKey(v0.updatedAt), completedAt: v0.updatedAt }]
    : [];

  return {
    id: v0.id,
    version: 1,
    title: v0.title,
    category: null,
    schedule,
    action: null,
    builtIn: false,
    enabled: true,
    completions,
    createdAt: v0.createdAt,
    updatedAt: v0.updatedAt,
  };
}

/** Migrate any mix of v0 / v1 / malformed records to v1. Idempotent. */
export function migrateReminders(input: unknown[]): Reminder[] {
  const out: Reminder[] = [];
  for (const r of input) {
    if (isReminderV0(r)) out.push(migrateReminderV0ToV1(r));
    else if (r && typeof r === 'object' && (r as Reminder).version === 1) {
      out.push(r as Reminder);
    }
    // else: malformed — drop silently; storage layer is the trust boundary.
  }
  return out;
}
