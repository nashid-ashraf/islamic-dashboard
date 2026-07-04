# Islamic Dashboard — Scattered Requirements Intake (§5D draft)

**Version:** 1.0 (draft)
**Date:** 2026-07-04
**Status:** Draft — intake capture, pending review
**Origin:** Formalized from a raw user dictation of 6 loosely-organized requirements.

---

## About this file

These requirements were dictated informally and captured here so they can be
scheduled and implemented later. The body below is authored as a **drop-in
`## 5D.` section**: heading levels, ID punctuation (`**FR-EXn: Title**`), and
`§` cross-references match `REQUIREMENTS.md` §5B, so this block can be pasted
into `REQUIREMENTS.md` verbatim once reviewed. IDs continue sequentially from
the current max (**FR-EX25**), i.e. **FR-EX26–FR-EX40**.

Each requirement is followed by an indented **Reconciliation** (what already
exists and is reused), **Gap** (net-new work), and/or **Open question** note.
The items flagged as **Open question** are decisions deferred to the user,
not assumptions baked in.

**UI references** (screenshots of a comparable app, copied to the repo root as
visual intent — not our own screens):
- `reference-prayer-reminders-home.png` — home screen: horizontally-scrolling
  prayer cards (Qiyam / Fajr ✓ / Sunrise …) with a completion tick, dua tiles,
  and the bottom nav. Informs FR-EX26–FR-EX27.
- `reference-activity-reminders-completion.png` — the activity/reminders list:
  "Complete Quran → Recite 30 minutes daily → Continue from At-Tawba:37", "Dua
  of the day", "Listen to Al-Quran (30 minutes)", "Recite Surah Mulk before
  sleeping", each with a per-item completion circle. This is effectively the
  visual spec for the default catalog (FR-EX31, FR-EX32, §5D.5).

---

## 5D. Weekly Progress, Salah Tracking & Reminder Ergonomics

### 5D.1 Weekly progress navigation

- **FR-EX26: Today / This-week navigation tabs** — provide a way to switch
  between a **Today** scope and a **This Week** scope so the user can compare
  their progress on tracked activities across the week, not just for the current
  day.
  - **Reconciliation:** the bottom tab-bar already exists on both platforms
    (`packages/web/src/App.tsx` `.tab-bar`; mobile
    `packages/mobile/app/_layout.tsx` `<Tabs>`). Per-day history also already
    exists — `Reminder.completions[]` keyed by `date:'YYYY-MM-DD'`
    (`packages/shared/src/models/reminder.ts`) — so a weekly aggregate is
    computable from data already persisted, without a new store.
  - **Gap:** no "this week" view or aggregation currently exists; everything is
    today-scoped (`isCompletedToday`, Dashboard "Upcoming Reminders"). This is
    net-new UI. Relates to the open FR-EX21 (§5B.2 "weekly completion %") and
    the streak/heatmap open question at §5B.2.
  - **Open question:** is Today/This-week a **scope toggle inside a screen**
    (e.g. a segmented control on the Dashboard) or a **new top-level tab** in the
    bottom bar? Recommend the in-screen toggle to avoid crowding the tab-bar;
    confirm before building.

### 5D.2 Salah completion tracking

- **FR-EX27: Five-salah Masjid-vs-home completion tracking** — for each of the
  five daily fard prayers, let the user mark **where** it was prayed via two
  checkboxes: prayed-at-home and prayed-at-Masjid. Semantics: home checked =
  prayed at home; Masjid checked = prayed in congregation; **both empty = missed
  prayer**.
  - **Gap:** **no salah-completion log model exists** anywhere in the codebase
    (grep: zero `masjid`/`mosque`/`jamaah`/`congregation` hits). This requires a
    new model + a new storage key, e.g.
    `SalahLog { date: 'YYYY-MM-DD', prayer: PrayerName, location: 'home' | 'masjid' | null }`,
    added alongside the existing `islamic_*` keys in
    `packages/web/src/services/localStorageAdapter.ts`. Prayer *times* are
    already built (`usePrayerTimes.ts`, `api/aladhan.ts`,
    `models/prayer.ts` `PRAYER_NAMES`), but there is no completion log to read.
  - **Reconciliation:** this log is the missing data source for the still-unbuilt
    **FR-EX1** five-salah pie chart, which §5A specifies "would read a salah
    log." FR-EX27 supplies that log.
  - **Open question:** are home and Masjid **mutually exclusive** (one location
    per prayer — effectively a 3-state control: home / Masjid / missed) or
    genuinely **both-checkable**? The `location: 'home' | 'masjid' | null` model
    above assumes mutually-exclusive with both-empty = missed. Confirm before
    building; if both must be checkable the model becomes two booleans.
  - **UI reference:** see `reference-prayer-reminders-home.png` — the prayer
    cards there show a single per-prayer completion tick; FR-EX27 extends that to
    the two-checkbox (home/Masjid) variant.

### 5D.3 Notifications & scheduling

- **FR-EX28: Pre-prayer "did you pray?" reminder** — send a push notification a
  configurable interval (≈30 min, exact offset TBD) **before the following
  prayer**, prompting the user to confirm/log whether they prayed the current
  prayer.
  - **Reconciliation:** the `Reminder` model already supports
    `schedule: { kind: 'prayerAnchor', anchor: { prayer, offsetMinutes } }`
    (`packages/shared/src/models/reminder.ts`); a negative/"before" offset fits
    this shape directly with no model change.
  - **Gap:** prayer-anchored scheduling is **stubbed** — `resolveNextFireAt`
    returns `null` for `prayerAnchor`
    (`packages/shared/src/utils/reminderSchedule.ts`), and
    `packages/web/src/NotificationOrchestrator.tsx` comments that anchored
    reminders are "not yet implemented." Building this means materializing the
    anchor → a concrete `whenMs` against live `usePrayerTimes` output. Also note
    the web scheduler is in-memory only and lost on reload
    (`packages/web/src/services/notifications.ts`), and no mobile
    (expo-notifications) scheduler exists yet — persistence is a prerequisite for
    this to fire reliably.
  - **Ties to FR-EX27:** the notification's action should be "log this salah,"
    writing into the FR-EX27 `SalahLog`.

- **FR-EX29: Device-local time as the scheduling basis** — the app runs off the
  device clock, and all custom reminders / push notifications are scheduled and
  displayed in that local time.
  - **Reconciliation:** this is **already true de facto** — `new Date()` /
    `Date.now()` are used throughout (`localDateKey`, `nowMinutes`,
    `utils/dateHelpers.ts`); Aladhan returns a `meta.timezone` string but the app
    otherwise assumes device-local time. This FR-EX mainly **ratifies existing
    behavior** so it is not re-designed; it should require little or no new code.
  - **Gap (out of scope):** there is no cross-timezone / travel handling (e.g.
    reminders following the user across timezones). Noted as explicitly out of
    scope for now.

- **FR-EX30: Relative preferred-time shortcuts (Today / Tomorrow)** — reminder
  time entry currently forces a full date + time, which is too much to fill in.
  Add relative quick-picks ("Today", "Tomorrow", etc.) alongside a time, to cut
  input friction.
  - **Reconciliation:** recurring reminders **already** use a lightweight
    `timeOfDay: 'HH:mm'` local string, not a full datetime — only
    `schedule: { kind: 'once', dueTime }` uses an absolute Unix-ms timestamp
    (`packages/shared/src/models/reminder.ts`). So the full-datetime friction is
    specific to the **one-off (`once`)** flow.
  - **Scope:** FR-EX30 is a relative-date picker that resolves
    Today/Tomorrow + `HH:mm` → the `once` schedule's `dueTime`. Do **not** change
    the recurring (`daily`/`weekly`) model, which is already lightweight.

### 5D.4 Default reminder catalog & Quran reconciliation

- **FR-EX31: Expanded default, user-deletable reminder catalog** — ship a
  pre-loaded list of common reminders/goals so the user starts with a useful set,
  and let the user **delete** any that are not relevant to them.
  - **Reconciliation:** a built-in catalog already exists —
    `BUILT_IN_REMINDERS` + `mergeWithBuiltInCatalog` in
    `packages/shared/src/data/builtInReminders.ts` (currently Duha, post-Maghrib
    sunnah, Friday Kahf, Mulk & Sajdah before sleep). The expansion adds more
    seeded entries (see FR-EX32) to this same catalog.
  - **Gap / behavioral change:** today built-ins are **soft-deletable only** —
    they can be toggled off (`enabled: false`) but **cannot be truly removed**
    (`packages/shared/src/hooks/useReminders.ts`). The user explicitly wants them
    **deletable**. This **supersedes** the built-in soft-delete rule: either
    allow a hard-dismiss of built-ins (persist a "dismissed" set so they don't
    re-seed via `mergeWithBuiltInCatalog`) or otherwise let deletion stick across
    reloads. This is the key behavioral decision in FR-EX31.

- **FR-EX32: "Recite Quran 30 min" default reminder + bookmark reconciliation** —
  seed a daily "complete Quran — 30 minutes" reminder with an **editable
  preferred time**, whose action opens the Quran at a bookmark. The bookmark is
  **auto** (the user's last-read position) **plus** an optional **manual**
  override if one is specified.
  - **Reconciliation:** `Reminder.action` already supports
    `{ kind: 'quran', surah, ayah? }` deep-links
    (`packages/shared/src/models/reminder.ts`). The Quran feature already has
    **both** bookmark concepts: auto `ReadingPosition`
    (`packages/shared/src/hooks/useReadingPosition.ts`, surfaced as "Continue
    Reading") and manual `Bookmark[]`
    (`packages/shared/src/hooks/useBookmarks.ts`), both in
    `packages/shared/src/models/quran.ts`. So the "auto from last read PLUS
    manual" ask is **already satisfied by existing data** — the remaining work is
    wiring the seeded reminder's action to resolve to *(manual bookmark if set,
    else last-read position)* at fire/tap time.
  - **Note:** the "30 minutes" is a **soft goal label**, not enforced timing —
    the reminder fires at the preferred time; it does not run a timer or track
    elapsed reading duration. The preferred time uses the existing recurring
    `timeOfDay: 'HH:mm'` field (see FR-EX30 reconciliation).
  - **UI reference:** `reference-activity-reminders-completion.png` renders this
    exact card — "Complete Quran / Recite 30 minutes daily / Daily reminder at
    2:20 PM" with a **"Continue from At-Tawba:37"** button (the resolved
    bookmark) and a completion circle.

### 5D.5 Default reminder catalog (authoritative list)

- **FR-EX33: Memorize one ayah per day** — a once-daily reminder to memorize a
  single ayah.
  - **Reconciliation:** fits `schedule: { kind: 'daily', timeOfDay }`; can seed
    into `BUILT_IN_REMINDERS` like the others. Action likely `{ kind: 'quran',
    surah, ayah }`.
  - **Open question (user-flagged, TBD):** should the ayah be **tied to the
    user's last-recited position** (advance one ayah from `ReadingPosition` each
    day) or independent? Undecided — do not build the tie-in until confirmed. If
    tied, it reuses `useReadingPosition.ts`.

- **FR-EX34: One Tafsir ayah per day (Tafsir as-Sa'di)** — a once-daily reminder
  that surfaces an ayah plus its tafsir from **Tafsir as-Sa'di**.
  - **Gap:** **no tafsir content or action type exists.** `ReminderAction` is
    only `{ kind: 'quran' | 'adhkar' }` (`packages/shared/src/models/reminder.ts`)
    — this needs a **new `{ kind: 'tafsir', … }` action variant** and a tafsir
    text source. Aladhan/AlQuran Cloud provide translations, not as-Sa'di tafsir.
  - **License — RESOLVED (see `TAFSIR_SOURCING.md`, 2026-07-04):** the source
    question is answered. **Arabic original is public domain** (as-Sa'di d. 1957;
    Saudi life+50 → PD since 2008) and shippable on PD grounds. **English is
    blocked** — every English edition (IIPH, Darussalam) is all-rights-reserved
    and no openly-licensed English translation exists; kalamullah.com hosts the
    IIPH edition without a license grant and is NOT usable. Product decision:
    ship **Arabic-only** Saadi now, or **defer** the English tafsir pending a
    license (contact IIPH for a non-commercial app license, or commission a
    CC-BY translation of the PD Arabic — both detailed in `TAFSIR_SOURCING.md`).
    Content is the blocker, not the code; the `{ kind: 'tafsir' }` action +
    date-seeded rotation reuse the daily-hadith `pickDaily` primitive
    (see `HADITH_INVENTORY.md`).

- **FR-EX35: Default morning / evening / night adhkar reminders** — three seeded
  reminders that, when tapped, open the corresponding scaffolded adhkar list; each
  independently toggleable on/off.
  - **Reconciliation:** `ReminderAction` already supports
    `{ kind: 'adhkar', routine }` and the routines are scaffolded in
    `packages/shared/src/data/adhkar/` (`ADHKAR_ROUTINES`) with a reader hook
    `useAdhkarRoutine.ts`. Mapping (confirmed with user): **morning → `'morning'`,
    evening → `'evening'`, night → `'sleep'`** (the before-bed adhkar; there is no
    separate `'night'` routine and none is being added).
  - **Default timing (confirmed with user): prayer-anchored** to match when these
    adhkar are traditionally recited — all editable afterward:
    - morning → `{ kind: 'prayerAnchor', anchor: { prayer: 'Fajr', offsetMinutes: 30 } }`
    - evening → `{ kind: 'prayerAnchor', anchor: { prayer: 'Asr', offsetMinutes: 30 } }`
    - night → `{ kind: 'daily', timeOfDay: '21:30' }` (before sleep)
  - **Depends on FR-EX28:** the two prayer-anchored entries only *fire* once
    `prayerAnchor` scheduling is materialized (currently stubbed — see FR-EX28).

- **FR-EX36: Surah al-Kahf — second Friday push (before Maghrib)** — in addition
  to the existing Friday-morning Kahf reminder, push again on Friday **≈2 hours
  before Maghrib/sunset**, so the recitation isn't missed.
  - **Reconciliation:** the morning push already exists —
    `builtin-friday-kahf`, `schedule: { kind: 'weekly', weekdays: [5],
    timeOfDay: '06:00' }`, `action: { kind: 'quran', surah: 18 }` (FR-EX6).
  - **Gap (model limitation):** the afternoon push is "**Friday** *and*
    **Maghrib − 120 min**", but the `ReminderSchedule` union
    (`packages/shared/src/models/reminder.ts`) cannot combine a **weekday filter**
    with a **prayer anchor** — `prayerAnchor` has no weekday constraint, and
    `weekly` has no prayer anchor. Options: (a) extend `prayerAnchor` with an
    optional `weekdays` filter; or (b) model it as a second reminder the scheduler
    fires only on Fridays. Flag for a scheduling decision. Also depends on the
    FR-EX28 prayer-anchor materialization.

- **FR-EX37: Learn one hadith per day** — a once-daily reminder surfacing a
  single hadith to read/learn.
  - **Gap:** same shape as FR-EX34 (tafsir) — there is **no hadith content or
    action type**. `ReminderAction` is only `{ kind: 'quran' | 'adhkar' }`
    (`packages/shared/src/models/reminder.ts`); a "hadith of the day" needs a
    **new action variant + a hadith text source**. Note the repo already bundles
    some **hadith-derived adhkar sourced from sunnah.com (CC-BY 3.0)** — see the
    adhkar data and `LICENSES.md` — which may be a reusable source/precedent, but
    a curated daily-hadith set does not exist yet.
  - **Open question (TBD):** hadith source & collection scope (e.g. a fixed
    curated set vs a collection like Riyad as-Salihin) and its license. Resolve
    before building; reuse the FR-EX25 / §5B.3 licensing discipline.

- **FR-EX38: Fast on Thursdays (Wednesday-evening reminder)** — remind the user
  on **Wednesday evening** to prepare for the Sunnah Thursday fast (intention /
  suhoor).
  - **Reconciliation:** plain `schedule: { kind: 'weekly', weekdays: [3],
    timeOfDay }` (3 = Wednesday) — the reminder fires the *evening before* the
    fast, deliberately not on Thursday itself. No action; it's a nudge.
  - **Default time:** a fixed evening clock time (e.g. `20:00`), user-editable.
    Deliberately a clock time, **not** Maghrib-anchored, to avoid the FR-EX36
    weekday-plus-prayer-anchor model gap; if a Maghrib anchor is later wanted it
    inherits that same limitation.
  - **Note:** the classic Sunnah pairs Mondays *and* Thursdays; only Thursday was
    requested. A parallel Monday reminder (Sunday-evening) could be added later if
    wanted — not seeded now.

- **FR-EX39: Cut nails on Friday (Friday-morning reminder)** — a weekly Friday
  reminder to trim nails, grouped with the other Friday-morning reminders.
  - **Reconciliation:** `schedule: { kind: 'weekly', weekdays: [5],
    timeOfDay: '06:00' }` (5 = Friday), mirroring `builtin-friday-kahf`'s morning
    slot so the Friday-morning items cluster together. No action.

- **FR-EX40: Jummah grooming — dress well & apply perfume** — a Friday reminder
  to dress well and apply perfume ahead of Jumu'ah prayer.
  - **Reconciliation:** `schedule: { kind: 'weekly', weekdays: [5],
    timeOfDay: '12:00' }` (Friday noon), user-editable so it can be moved earlier
    relative to the local Jumu'ah time. No action.
  - **Note:** noon is a static default; the true Jumu'ah time tracks Dhuhr, but
    (per FR-EX36) `weekly` can't anchor to Dhuhr. A fixed editable noon avoids the
    model gap; anchoring to Dhuhr-on-Friday would inherit that same limitation.

#### 5D.5.1 Catalog contents (the shipped default set)

The default catalog = the user's enumerated list **plus** the already-shipped
post-Maghrib sunnah (kept per user). Entries already in
`BUILT_IN_REMINDERS` are reused as-is unless a default value change is noted.

| Default reminder | Status | Maps to | Schedule |
| --- | --- | --- | --- |
| Recite Quran (30 min daily) | net-new | FR-EX32 | `daily` HH:mm (editable); action → Quran bookmark |
| Morning adhkar | net-new | FR-EX35 | `prayerAnchor` Fajr +30; action → adhkar `morning` |
| Evening adhkar | net-new | FR-EX35 | `prayerAnchor` Asr +30; action → adhkar `evening` |
| Night adhkar (before sleep) | net-new | FR-EX35 | `daily` 21:30; action → adhkar `sleep` |
| Salat ad-Duha | **exists** | `builtin-duha` (FR-EX3) | `prayerAnchor` Sunrise +30 (configurable) |
| Surah al-Kahf (Friday, morning) | **exists** | `builtin-friday-kahf` (FR-EX6) | `weekly [Fri]` 06:00; action → Quran 18 |
| Surah al-Kahf (Friday, pre-Maghrib) | net-new | FR-EX36 | Friday + `Maghrib −120` (model gap) |
| Memorize one ayah/day | net-new | FR-EX33 | `daily` (tie-to-last-read TBD) |
| One tafsir ayah/day (as-Sa'di) | net-new | FR-EX34 | `daily` (new action type; source RESOLVED — Arabic PD ship-able / English blocked, see `TAFSIR_SOURCING.md`) |
| Learn one hadith/day | net-new | FR-EX37 | `daily` (new action type; source RESOLVED — sunnah.com CC-BY, see `HADITH_INVENTORY.md`) |
| Fast on Thursdays | net-new | FR-EX38 | `weekly [Wed]` 20:00 (evening-before nudge) |
| Cut nails on Friday | net-new | FR-EX39 | `weekly [Fri]` 06:00 (with Friday-morning items) |
| Jummah: dress well & perfume | net-new | FR-EX40 | `weekly [Fri]` 12:00 (editable) |
| Surah al-Mulk before sleep | **exists** | `builtin-mulk-bedtime` (FR-EX7) | `daily` — default **21:00** (was 21:30) |
| Surah as-Sajdah before sleep | **exists** | `builtin-sajdah-bedtime` (FR-EX8) | `daily` — default **21:00** (was 21:30) |
| Post-Maghrib sunnah (2 rakah) | **exists** | `builtin-post-maghrib-sunnah` (FR-EX4) | `prayerAnchor` Maghrib +5 (kept per user) |

**Minor value change:** the user specified al-Mulk and as-Sajdah at "9 pm", so
their catalog default shifts from the current **21:30 → 21:00** in
`builtInReminders.ts`. All bedtime times remain user-editable.

---

## Reconciliation summary

| FR-EX | Reuses existing | Net-new work |
| --- | --- | --- |
| EX26 Today/This-week tabs | tab-bar; `Reminder.completions[]` per-day history | weekly aggregation + view; scope-toggle vs tab decision |
| EX27 Masjid-vs-home salah | prayer times (`usePrayerTimes`, `PRAYER_NAMES`) | **new `SalahLog` model + storage key**; feeds FR-EX1 chart |
| EX28 Pre-prayer reminder | `prayerAnchor` schedule shape | materialize anchor → `whenMs`; persistent + mobile scheduler |
| EX29 Device-local time | already device-local throughout | ~none (ratifies behavior); no timezone/travel handling |
| EX30 Today/Tomorrow picker | recurring `timeOfDay:'HH:mm'` | relative-date picker for the one-off `once` `dueTime` |
| EX31 Deletable defaults | `BUILT_IN_REMINDERS` + merge | **supersede built-in soft-delete** → hard-dismiss that sticks |
| EX32 Quran 30-min reminder | `action:{kind:'quran'}`; auto `ReadingPosition` + manual `Bookmark[]` | seed the reminder; resolve action to manual-else-last-read |
| EX33 Memorize one ayah/day | `daily` schedule; `action:{kind:'quran'}` | seed entry; optional tie to `ReadingPosition` (TBD) |
| EX34 Tafsir ayah/day (as-Sa'di) | daily-hadith `pickDaily` rotation primitive | **new `action:{kind:'tafsir'}` type + tafsir content**; license RESOLVED (`TAFSIR_SOURCING.md`): Arabic PD ship-able, English blocked |
| EX35 Morning/evening/night adhkar | `action:{kind:'adhkar'}`; scaffolded `ADHKAR_ROUTINES` | seed 3 entries; prayer-anchored timing (needs EX28) |
| EX36 Kahf 2nd Friday push | `builtin-friday-kahf`; `prayerAnchor` | **schedule can't do weekday + anchor** — extend model or 2nd entry (needs EX28) |
| EX37 Learn one hadith/day | bundled sunnah.com hadith-derived adhkar (CC-BY 3.0) as precedent | **new content action type + curated hadith source**; scoped in `HADITH_INVENTORY.md` (Nawawi 40, sunnah.com CC-BY — license clear, 42-entry curation pending) |
| EX38 Fast on Thursdays | `weekly [Wed]` schedule | seed entry (evening-before nudge; no action) |
| EX39 Cut nails on Friday | `weekly [Fri]` schedule | seed entry (no action) |
| EX40 Jummah dress & perfume | `weekly [Fri]` schedule | seed entry (editable noon; no action) |

**Open questions to resolve before implementation:** (1) FR-EX26 scope-toggle vs
new tab; (2) FR-EX27 home/Masjid mutually-exclusive vs both-checkable; (3)
FR-EX31 exact delete semantics for built-ins (hard-dismiss persistence);
(4) FR-EX33 tie memorize-ayah to last-read position or not; (5) FR-EX34 Tafsir
as-Sa'di — license RESOLVED (`TAFSIR_SOURCING.md`); remaining product call is
**Arabic-only (ship now) vs. wait for a licensed English edition**; (6) FR-EX36
how to model "Friday + prayer-anchor" (extend `prayerAnchor` with weekdays, or a
Friday-only second entry); (7) FR-EX37 hadith source & license RESOLVED
(`HADITH_INVENTORY.md`, Nawawi 40 via sunnah.com CC-BY); remaining work is the
42-entry curation pass.
