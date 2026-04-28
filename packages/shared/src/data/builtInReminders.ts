// Built-in reminder catalog (v1.1).
//
// Pre-seeded entries that ship with the app and require no user setup. Each is
// addressed by a stable `builtin-*` id. Storage merges with this catalog on
// load: persisted state owns the user-mutable fields (enabled, completions,
// updatedAt) while the catalog owns presentational/scheduling fields (title,
// schedule, action, category) so future shipped changes propagate without
// requiring storage migrations.
//
// Covers REQUIREMENTS.md §5A.5b — FR-EX3, FR-EX4, FR-EX6, FR-EX7, FR-EX8 —
// reclassified as catalog data rather than bespoke features.

import type { Reminder } from '../models/reminder';

/**
 * Stable epoch for built-in catalog timestamps. Keeps `createdAt`/`updatedAt`
 * deterministic across installs so re-seeding never produces churn or moves
 * built-ins around relative to user-created reminders. Value is arbitrary;
 * 2026-01-01 UTC is chosen for human readability when inspecting storage.
 */
export const BUILTIN_REMINDER_EPOCH = Date.UTC(2026, 0, 1);

function builtIn(
  slug: string,
  fields: Pick<Reminder, 'title' | 'category' | 'schedule' | 'action'>,
): Reminder {
  return {
    id: `builtin-${slug}`,
    version: 1,
    title: fields.title,
    category: fields.category,
    schedule: fields.schedule,
    action: fields.action,
    builtIn: true,
    enabled: true,
    completions: [],
    createdAt: BUILTIN_REMINDER_EPOCH,
    updatedAt: BUILTIN_REMINDER_EPOCH,
  };
}

/**
 * The shipped catalog. Display order is the array order — `mergeWithBuiltInCatalog`
 * preserves it, and JS's stable sort keeps adjacent same-fire-time entries in
 * this order downstream.
 */
export const BUILT_IN_REMINDERS: readonly Reminder[] = [
  // FR-EX3 — Salat ad-Duha. Window opens after sunrise + offset (clears the
  // ~15 minute karahat after sunrise; 30 min is a safe default).
  builtIn('duha', {
    title: 'Salat ad-Duha (2 rakah)',
    category: 'sunnah-prayer',
    schedule: { kind: 'prayerAnchor', anchor: { prayer: 'Sunrise', offsetMinutes: 30 } },
    action: null,
  }),

  // FR-EX4 — Post-Maghrib 2 rakah sunnah, anchored to Maghrib.
  builtIn('post-maghrib-sunnah', {
    title: 'Post-Maghrib sunnah (2 rakah)',
    category: 'sunnah-prayer',
    schedule: { kind: 'prayerAnchor', anchor: { prayer: 'Maghrib', offsetMinutes: 5 } },
    action: null,
  }),

  // FR-EX6 — Surah al-Kahf on Friday. Friday = 5 in JS getDay().
  // Default time 06:00 puts the reminder before the Jumu'ah window for early-morning recitation;
  // user can adjust.
  builtIn('friday-kahf', {
    title: 'Surah al-Kahf (Friday)',
    category: 'quran-weekly',
    schedule: { kind: 'weekly', weekdays: [5], timeOfDay: '06:00' },
    action: { kind: 'quran', surah: 18 },
  }),

  // FR-EX7 — Surah al-Mulk before sleep (Tirmidhi 2890). Default 21:30; user adjusts.
  builtIn('mulk-bedtime', {
    title: 'Surah al-Mulk before sleep',
    category: 'bedtime',
    schedule: { kind: 'daily', timeOfDay: '21:30' },
    action: { kind: 'quran', surah: 67 },
  }),

  // FR-EX8 — Surah as-Sajdah before sleep (paired with al-Mulk per Tirmidhi/Ahmad).
  builtIn('sajdah-bedtime', {
    title: 'Surah as-Sajdah before sleep',
    category: 'bedtime',
    schedule: { kind: 'daily', timeOfDay: '21:30' },
    action: { kind: 'quran', surah: 32 },
  }),
] as const;

/** Fast lookup of the catalog id set, used by the merge to detect orphans. */
export const BUILT_IN_REMINDER_IDS: ReadonlySet<string> = new Set(
  BUILT_IN_REMINDERS.map((r) => r.id),
);

/**
 * Merge persisted reminders with the built-in catalog.
 *
 * Rules:
 * - For each catalog entry: if storage has a record at the same id, take the
 *   user-mutable fields (`enabled`, `completions`, `updatedAt`) from storage
 *   and the rest from the catalog. Otherwise, seed the catalog entry as-is.
 * - User-created reminders (anything not in the catalog) are appended in their
 *   original order.
 * - Stored entries flagged `builtIn: true` whose ids are no longer in the
 *   catalog are dropped (orphaned by app updates).
 */
export function mergeWithBuiltInCatalog(persisted: Reminder[]): Reminder[] {
  const persistedById = new Map(persisted.map((r) => [r.id, r]));
  const merged: Reminder[] = [];

  for (const seed of BUILT_IN_REMINDERS) {
    const stored = persistedById.get(seed.id);
    if (stored) {
      merged.push({
        ...seed,
        enabled: stored.enabled,
        completions: stored.completions,
        updatedAt: stored.updatedAt,
      });
      persistedById.delete(seed.id);
    } else {
      merged.push(seed);
    }
  }

  for (const r of persistedById.values()) {
    if (r.builtIn) continue; // orphaned built-in (no longer in catalog) — drop
    merged.push(r);
  }

  return merged;
}
