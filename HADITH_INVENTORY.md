# Daily-Hadith Curator Inventory (v1 — CREATED 2026-07-04)

**Purpose.** The worklist for `packages/shared/src/data/hadith/nawawi40.json`, the bundled corpus behind the "hadith of the day" reminder (**FR-EX10** "one hadith a day" / **FR-EX37** "learn one hadith per day" — the two collapse into a single date-seeded rotation feature). For each hadith in the chosen collection, records the reference, narrator, sahih grade, and JSON status.

**Source of the set.** The **40 Hadith of Imam an-Nawawi** (*al-Arba'in al-Nawawiyyah*) — a canonical, closed collection of **42 hadith** compiled by Imam Yahya ibn Sharaf an-Nawawi (d. 676 AH). Chosen for v1 because it is (a) small enough to hand-curate in one pass, (b) universally famous, (c) fully indexed on sunnah.com at `https://sunnah.com/nawawi40`, and (d) covered by the same CC-BY 3.0 license already vetted for the hadith-derived adhkar. Rotating over 42 entries gives ~6 weeks before repeat.

**Why not Riyad as-Salihin.** ~1,900 hadith — too large for a hand-curated v1. It is the intended *future* expansion once this pipeline is proven; the `collection` field on the content model exists so it can be added without rework.

**What this document does NOT contain.** No Arabic text, no translations. Those are curated per-entry from sunnah.com (CC-BY 3.0), with provenance recorded in `packages/shared/src/data/hadith/LICENSES.md` (to be created alongside the JSON). Arabic is public domain; English is taken verbatim from sunnah.com under CC-BY 3.0.

---

## Architecture

New content model `packages/shared/src/models/hadith.ts`, deliberately parallel to `adhkar.ts` so the reader and translation-fallback logic (`pickTranslation`) are reusable.

```ts
export interface Hadith {
  id: string;                    // 'nawawi40-001'
  order: number;                 // 1-based display / rotation order
  collection: 'nawawi40';
  reference: string;             // "40 Hadith Nawawi 1"
  narrator?: string;             // "Umar ibn al-Khattab (RA)"
  grade?: string;                // "Sahih" — reject Da'if
  arabic: string;                // required; public domain (hadith narration)
  translations: Partial<Record<TranslationEditionId, string>>; // en-sahih from sunnah.com
  sourceUrl: string;             // https://sunnah.com/nawawi40:1 — CC-BY attribution
}
```

- **Reuses `TranslationEditionId`** from `models/editions.ts` — same translation-edition union as adhkar, so the reader's English-fallback path works unchanged.
- **Bengali (`bn-muhiuddin`) is absent** — same asymmetry as hadith-derived adhkar; no permissive Bengali source identified. Reader falls back to English. Not a blocker.
- **Khattab (`en-khattab`) is absent** — Khattab translated the Quran only, not hadith.
- Bundled as `data/hadith/nawawi40.json` + typed barrel `data/hadith/index.ts`, mirroring `data/adhkar/index.ts`.

## Action type + rotation primitive

**(a) New `ReminderAction` variant** in `models/reminder.ts`:

```ts
| { kind: 'hadith'; collection: 'nawawi40' }
```

Carries the *collection*, not a specific hadith id — because "hadith of the day" is a rotation, not a fixed pointer (contrast `{ kind: 'quran', surah }`, which is fixed).

**(b) Date-seeded rotation selector** — the shared **content-rotation primitive** already called out in `REQUIREMENTS.md:460` for both FR-EX9 (ayah of the day) and FR-EX10 (hadith of the day). Build once, reuse for both:

```ts
// pickDaily<T>(items, dateKey) → deterministic index from a 'YYYY-MM-DD' key,
// so the same day always shows the same hadith even after the app is reopened.
pickDailyHadith('nawawi40', localDateKey()) → Hadith
```

`localDateKey()` already exists in `models/reminder.ts`.

**(c) Built-in reminder seed** appended to `data/builtInReminders.ts`:

```ts
builtIn('daily-hadith', {
  title: 'Hadith of the day',
  category: 'learning',
  schedule: { kind: 'daily', timeOfDay: '08:00' },  // user-adjustable
  action: { kind: 'hadith', collection: 'nawawi40' },
})
```

---

## Nawawi 40 worklist (`nawawi40.json`)

**Target 42 entries.** Currently **0 shipped**. All CC-BY via sunnah.com; retrieval kind is `hadith-inline` for every entry. Fetch URL pattern: `https://sunnah.com/nawawi40:<N>`.

| # | Theme / opening | Narrator | Primary attestation | Status |
|---|------------------|----------|---------------------|--------|
| 1 | Actions are by intentions (*innama al-a'malu bi'l-niyyat*) | Umar ibn al-Khattab | Bukhari 1, Muslim 1907 | ⬜ `nawawi40-001` |
| 2 | Hadith of Jibril — islam, iman, ihsan | Umar ibn al-Khattab | Muslim 8 | ⬜ `nawawi40-002` |
| 3 | Islam built on five pillars | Ibn Umar | Bukhari 8, Muslim 16 | ⬜ `nawawi40-003` |
| 4 | Creation in the womb; deeds sealed by their endings | Ibn Mas'ud | Bukhari 3208, Muslim 2643 | ⬜ `nawawi40-004` |
| 5 | Rejecting innovations (*man ahdatha fi amrina*) | Aisha | Bukhari 2697, Muslim 1718 | ⬜ `nawawi40-005` |
| 6 | Halal is clear, haram is clear (the doubtful matters) | al-Nu'man ibn Bashir | Bukhari 52, Muslim 1599 | ⬜ `nawawi40-006` |
| 7 | Religion is sincerity (*al-din al-nasiha*) | Tamim al-Dari | Muslim 55 | ⬜ `nawawi40-007` |
| 8 | Ordered to fight until they testify | Ibn Umar | Bukhari 25, Muslim 22 | ⬜ `nawawi40-008` |
| 9 | Do what you can; avoid what is forbidden | Abu Hurayrah | Bukhari 7288, Muslim 1337 | ⬜ `nawawi40-009` |
| 10 | Allah is Good and accepts only what is good | Abu Hurayrah | Muslim 1015 | ⬜ `nawawi40-010` |
| 11 | Leave what makes you doubt (*da' ma yaribuka*) | al-Hasan ibn Ali | Tirmidhi 2518 | ⬜ `nawawi40-011` |
| 12 | Excellence of Islam: leaving what does not concern one | Abu Hurayrah | Tirmidhi 2317 | ⬜ `nawawi40-012` |
| 13 | None believes until he loves for his brother | Anas ibn Malik | Bukhari 13, Muslim 45 | ⬜ `nawawi40-013` |
| 14 | Blood of a Muslim is lawful only in three cases | Ibn Mas'ud | Bukhari 6878, Muslim 1676 | ⬜ `nawawi40-014` |
| 15 | Speak good or be silent; honour the guest | Abu Hurayrah | Bukhari 6018, Muslim 47 | ⬜ `nawawi40-015` |
| 16 | Do not become angry (*la taghdab*) | Abu Hurayrah | Bukhari 6116 | ⬜ `nawawi40-016` |
| 17 | Allah prescribed excellence (*ihsan*) in all things | Shaddad ibn Aws | Muslim 1955 | ⬜ `nawawi40-017` |
| 18 | Fear Allah wherever you are; follow a bad deed with a good one | Abu Dharr & Mu'adh | Tirmidhi 1987 | ⬜ `nawawi40-018` |
| 19 | Be mindful of Allah and He will protect you | Ibn Abbas | Tirmidhi 2516 | ⬜ `nawawi40-019` |
| 20 | If you feel no shame, do as you wish (*al-haya'*) | Abu Mas'ud al-Ansari | Bukhari 3483 | ⬜ `nawawi40-020` |
| 21 | Say "I believe in Allah" then be steadfast (*istiqamah*) | Sufyan ibn Abdullah | Muslim 38 | ⬜ `nawawi40-021` |
| 22 | The path to Paradise (obligations, halal/haram) | Jabir ibn Abdullah | Muslim 15 | ⬜ `nawawi40-022` |
| 23 | Purity is half of faith (*al-tuhuru shatr al-iman*) | Abu Malik al-Ash'ari | Muslim 223 | ⬜ `nawawi40-023` |
| 24 | Hadith Qudsi: "O My servants, I have forbidden oppression…" | Abu Dharr | Muslim 2577 | ⬜ `nawawi40-024` |
| 25 | The wealthy took the rewards (tasbih as charity) | Abu Dharr | Muslim 1006 | ⬜ `nawawi40-025` |
| 26 | Every joint owes a charity each day | Abu Hurayrah | Bukhari 2989, Muslim 1009 | ⬜ `nawawi40-026` |
| 27 | Righteousness is good character (*al-birr husn al-khuluq*) | al-Nawwas ibn Sam'an & Wabisah | Muslim 2553 | ⬜ `nawawi40-027` |
| 28 | Hold fast to the Sunnah; beware innovations | al-Irbad ibn Sariyah | Abu Dawud 4607, Tirmidhi 2676 | ⬜ `nawawi40-028` |
| 29 | Deeds that admit to Paradise / gates of good | Mu'adh ibn Jabal | Tirmidhi 2616 | ⬜ `nawawi40-029` |
| 30 | Allah set limits — do not transgress them | Abu Tha'labah al-Khushani | Daraqutni (hasan) | ⬜ `nawawi40-030` |
| 31 | Renounce the world and Allah will love you (*zuhd*) | Sahl ibn Sa'd | Ibn Majah 4102 | ⬜ `nawawi40-031` |
| 32 | No harming and no reciprocating harm (*la darar wa la dirar*) | Abu Sa'id al-Khudri | Ibn Majah 2341 | ⬜ `nawawi40-032` |
| 33 | Burden of proof on the claimant; oath on the denier | Ibn Abbas | Bayhaqi (hasan) | ⬜ `nawawi40-033` |
| 34 | Whoever sees an evil, let him change it | Abu Sa'id al-Khudri | Muslim 49 | ⬜ `nawawi40-034` |
| 35 | Do not envy one another; be brothers | Abu Hurayrah | Muslim 2564 | ⬜ `nawawi40-035` |
| 36 | Whoever relieves a believer's distress | Abu Hurayrah | Muslim 2699 | ⬜ `nawawi40-036` |
| 37 | Allah records good and bad deeds (multiplied rewards) | Ibn Abbas | Bukhari 6491, Muslim 131 | ⬜ `nawawi40-037` |
| 38 | Hadith Qudsi: drawing near through nawafil (*wali*) | Abu Hurayrah | Bukhari 6502 | ⬜ `nawawi40-038` |
| 39 | Allah pardoned my nation for mistakes, forgetfulness, coercion | Ibn Abbas | Ibn Majah 2045 | ⬜ `nawawi40-039` |
| 40 | Be in the world as a stranger or wayfarer | Ibn Umar | Bukhari 6416 | ⬜ `nawawi40-040` |
| 41 | None believes until his desire follows what I brought | Abdullah ibn Amr | (recorded in an-Nawawi w/ chain; grade to verify) | ⬜ `nawawi40-041` |
| 42 | Hadith Qudsi: "O son of Adam, as long as you call upon Me…" | Anas ibn Malik | Tirmidhi 3540 | ⬜ `nawawi40-042` |

> **Note on #41.** Imam an-Nawawi graded it *sahih* in his compilation, but modern scholarship considers its chain weak. Curator must verify grading on sunnah.com and either ship with a grade note or defer. Do not ship a Da'if hadith silently.

---

## Summary

| Collection | Target | Shipped | Pending |
|------------|--------|---------|---------|
| Nawawi 40 (`nawawi40.json`) | 42 | 0 | 42 (all to curate) |

**Sourcing posture** (identical to hadith-derived adhkar): Arabic is public-domain (hadith narration); English is taken verbatim from sunnah.com (CC-BY 3.0, USC-MSA Center) with per-entry `sunnah.com/nawawi40:<N>` URLs recorded in `packages/shared/src/data/hadith/LICENSES.md`. **CC-BY requires visible attribution to sunnah.com in the hadith reader UI**, not just the license log. `en-khattab` and `bn-muhiuddin` are intentionally absent (Khattab = Quran only; no permissive Bengali source) — reader falls back to English via `pickTranslation`.

## Curator workflow (per entry)

1. Open `https://sunnah.com/nawawi40:<N>`.
2. Confirm the collection grade note; **reject Da'if** — for the few borderline entries (#30, #33, #41) verify grading and either ship with an explicit `grade` note or defer.
3. Copy Arabic (public domain from the hadith narration).
4. Copy the CC-BY English translation verbatim into `translations['en-sahih']`.
5. Leave `en-khattab` and `bn-muhiuddin` absent.
6. Record `narrator`, `reference`, `grade`, and `sourceUrl`.
7. Add a provenance row to `packages/shared/src/data/hadith/LICENSES.md`.
8. `npm run -w packages/shared test` — a `hadith.validate.test.ts` (to be added, mirroring `adhkar.validate.test.ts`) enforces entry shape and that every entry has a `sourceUrl`.

## Build tasks (code, separate from curation)

| Task | Blocker? |
|------|----------|
| `models/hadith.ts` + `data/hadith/index.ts` typed barrel | none |
| Add `{ kind: 'hadith'; collection }` to `ReminderAction` in `models/reminder.ts` | none |
| `pickDaily` date-seeded rotation primitive + tests (also unblocks FR-EX9 ayah/day) | none |
| `data/hadith/LICENSES.md` + `hadith.validate.test.ts` | none |
| Built-in `daily-hadith` seed + hadith reader UI + sunnah.com attribution | none |

**No open license question** — unlike Tafsir as-Sa'di (FR-EX34, source/license TBD), this feature is fully unblocked. The only substantive cost is the 42-entry curation pass, which follows the adhkar template exactly.

## Out of scope for v1

- **Riyad as-Salihin** (~1,900 hadith) — future expansion once the `nawawi40` pipeline is proven; the `collection` field is designed to accommodate it.
- **40 Hadith Qudsi** — optional second small set later.
- **Bengali translations** for daily hadith — no permissive source identified (same asymmetry as adhkar).
- **User bookmarking / "learned" tracking** of individual hadith beyond the reminder `completions[]` mechanism.
