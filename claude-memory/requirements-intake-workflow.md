---
name: requirements-intake-workflow
description: How new requirements are captured — SCATTERED_REQUIREMENTS.md stages them as a drop-in §5D for REQUIREMENTS.md; FR-EX26–40 are specced but not built
metadata:
  type: project
---

Canonical spec is `REQUIREMENTS.md`, using `FR-EX<n>` bold-ID bullets appended as
letter-suffixed sections (§5A/5B/5C). New scattered requirements are first captured
in `SCATTERED_REQUIREMENTS.md` — a standalone intake doc written as a **drop-in
`## 5D.` section** (matching §5B style: `**FR-EXn: Title**` punctuation, `§`
cross-refs) so it can later be pasted into `REQUIREMENTS.md` verbatim. This
staging-then-merge split was the user's explicit choice (2026-07-04).

**As of 2026-07-04, FR-EX26–FR-EX40 are SPEC ONLY — none implemented.** Highlights:
- EX26 Today/This-week view; EX27 Masjid-vs-home salah log (net-new model, feeds unbuilt EX1 pie chart); EX28 pre-prayer "did you pray?" push.
- EX31/EX32 + §5D.5 default reminder catalog (extends `BUILT_IN_REMINDERS` in `packages/shared/src/data/builtInReminders.ts`). EX35 = morning/evening/night adhkar reminders (night → `sleep` routine; prayer-anchored Fajr+30 / Asr+30 / daily 21:30). EX33 memorize-ayah, EX34 tafsir (as-Sa'di), EX37 hadith — the latter two need a **new `ReminderAction` content type + source/license TBD**. EX38 fast-Thursday (Wed 20:00), EX39 cut-nails-Friday, EX40 Jummah grooming.
- **Model gap (EX36/EX38/EX40):** `ReminderSchedule` can't combine a weekday filter with a `prayerAnchor`; anything "Friday + before Maghrib/Dhuhr" needs the model extended or a Friday-only entry. Prayer-anchored scheduling itself is still stubbed (`resolveNextFireAt` returns null for `prayerAnchor`).
- Unresolved open questions are listed at the bottom of `SCATTERED_REQUIREMENTS.md` (7 of them) — check there before implementing any FR-EX item.

Two reference screenshots at repo root (`reference-prayer-reminders-home.png`,
`reference-activity-reminders-completion.png`) are a comparable app's UI used as
visual intent, not our own screens.
