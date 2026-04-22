# Adhkar Curator Inventory (v1.1a — LOCKED 2026-04-22)

**Purpose.** The worklist for `packages/shared/src/data/adhkar/{morning,evening,sleep,waking}.json`. For each dua in the canonical daily-routine set, records the scholarly identifier, primary-source citation, attested repetition count, retrieval kind, and JSON status.

**Source of the set.** The canonical daily-routine adhkar attested across Islamic scholarly tradition — the same set that appears in Imam an-Nawawi's *al-Adhkar*, Ibn al-Qayyim's *al-Wabil al-Sayyib*, Sheikh Sa'id al-Qahtani's *Hisn al-Muslim*, and modern compilations like Sheikh Abdullah al-Jibreen's *al-Kalim al-Tayyib*. Citations point to primary hadith collections (Bukhari, Muslim, Abu Dawud, etc.), not to any specific compilation.

**What this document does NOT contain.** No Arabic text, no transliterations, no translations. Those are either (a) bundled directly into the JSON via `packages/shared/scripts/populate-quran-text.mjs` for Quran-referenced entries or (b) curated per-entry from sunnah.com (CC-BY 3.0) or Seen-Arabic/Morning-And-Evening-Adhkar-DB (MIT) for hadith-derived entries, with provenance recorded in `packages/shared/src/data/adhkar/LICENSES.md`.

**Architecture (post-2026-04-22 refactor).** Every dua carries inline `arabic: string` plus per-edition `translations: Partial<Record<TranslationEditionId, string>>`. No runtime fetch, no dependency on the opt-in Quran offline corpus. `quranRef` is optional metadata that records source attribution and enables "open in Quran reader →" deep-links.

---

## Current retrieval shape

```ts
{
  id: "morning-001",
  order: 1,
  repetitions: 1,
  source: "Quran 2:255",
  arabic: "...",                       // inline, public domain
  translations: {
    "en-sahih": "...",
    "en-khattab": "...",
    "bn-muhiuddin": "..."
  },
  quranRef?: { surah: 2, ayahFrom: 255, ayahTo: 255 }   // optional metadata
}
```

Khattab English is populated only on Quran-ref entries (he translates Quran, not hadith). Bengali for hadith is blocked on sourcing.

---

## Morning Adhkar (`morning.json`)

**Target 25 entries.** Currently **4 Quran-ref entries shipped with full inline text + 3 translations**. 21 hadith-derived entries pending curator pass.

| # | Identifier | Primary source | Reps | Retrieval | Status |
|---|------------|----------------|------|-----------|--------|
| 1 | Ayat al-Kursi | Quran 2:255 | 1 | quranRef | ✅ `morning-001` |
| 2 | Surah al-Ikhlas | Quran 112 | 3 | quranRef | ✅ `morning-002` |
| 3 | Surah al-Falaq | Quran 113 | 3 | quranRef | ✅ `morning-003` |
| 4 | Surah an-Nas | Quran 114 | 3 | quranRef | ✅ `morning-004` |
| 5 | Asbahna wa asbaha al-mulku lillah | Muslim 2723 | 1 | hadith-inline | curate |
| 6 | Sayyid al-Istighfar | Bukhari 6306 | 1 | hadith-inline | curate |
| 7 | Allahumma bika asbahna | Abu Dawud 5068; Tirmidhi 3391 | 1 | hadith-inline | curate |
| 8 | Radhitu billahi Rabban | Abu Dawud 5072; Tirmidhi 3389 | 3 | hadith-inline | curate |
| 9 | Allahumma inni as'aluka afwa wa afiyah | Abu Dawud 5074; Ibn Majah 3871 | 1 | hadith-inline | curate |
| 10 | Allahumma afini fi badani | Abu Dawud 5090 | 3 | hadith-inline | curate |
| 11 | Hasbiya Allahu la ilaha illa huwa | Abu Dawud 5081 | 7 | hadith-inline | curate |
| 12 | A'udhu bi kalimat Allah at-tammat | Muslim 2708 | 3 | hadith-inline | curate |
| 13 | Bismillah alladhi la yadurru | Abu Dawud 5088; Tirmidhi 3388 | 3 | hadith-inline | curate |
| 14 | Allahumma salli wa sallim ala nabiyyina Muhammad | Tabarani (authenticated al-Albani) | 10 | hadith-inline | curate |
| 15 | Subhan Allah wa bi-hamdihi | Muslim 2692 | 100 | hadith-inline | curate |
| 16 | La ilaha illa Allah wahdahu la sharika lah (full formula) | Bukhari 6403; Muslim 2691 | 100 | hadith-inline | curate |
| 17 | Subhan Allah wa bi-hamdihi adada khalqih | Muslim 2726 | 3 | hadith-inline | curate |
| 18 | Allahumma inni as'aluka ilman nafi'an | Ibn Majah 925 | 1 | hadith-inline | curate |
| 19 | Allahumma inni as'aluka khayra hadha al-yawm (goodness of this day) | Abu Dawud 5084 | 1 | hadith-inline | curate |
| 20 | Astaghfir Allah wa atubu ilayh | Bukhari 6307 | 100 | hadith-inline | curate |
| 21 | Allahumma ma asbaha bi min ni'matin | Abu Dawud 5073 | 1 | hadith-inline | curate |
| 22 | Ya Hayyu ya Qayyum | al-Hakim 1870 (authenticated al-Albani) | 1–3 | hadith-inline | curate |
| 23 | Hasbiya Allah wa ni'ma'l-wakil | Abu Dawud 3627 | 7 | hadith-inline | curate |
| 24 | La hawla wa la quwwata illa billah | Bukhari 6384; Muslim 2704 | 1–3 | hadith-inline | curate |
| 25 | Allahumma inni a'udhu bika min al-kufri wa'l-faqri | Abu Dawud 5090 (morning) | 3 | hadith-inline | curate |

---

## Evening Adhkar (`evening.json`)

**Target 24 entries.** Currently **4 Quran-ref entries shipped**. 20 hadith-derived entries pending.

| # | Identifier | Primary source | Reps | Retrieval | Status |
|---|------------|----------------|------|-----------|--------|
| 1 | Ayat al-Kursi | Quran 2:255 | 1 | quranRef | ✅ `evening-001` |
| 2 | Surah al-Ikhlas | Quran 112 | 3 | quranRef | ✅ `evening-002` |
| 3 | Surah al-Falaq | Quran 113 | 3 | quranRef | ✅ `evening-003` |
| 4 | Surah an-Nas | Quran 114 | 3 | quranRef | ✅ `evening-004` |
| 5 | Amsayna wa amsa al-mulku lillah | Muslim 2723 | 1 | hadith-inline | curate |
| 6 | Sayyid al-Istighfar (evening instance) | Bukhari 6306 | 1 | hadith-inline | curate |
| 7 | Allahumma bika amsayna | Abu Dawud 5068; Tirmidhi 3391 | 1 | hadith-inline | curate |
| 8 | Radhitu billahi Rabban | Abu Dawud 5072; Tirmidhi 3389 | 3 | hadith-inline | curate |
| 9 | Allahumma inni as'aluka afwa wa afiyah | Abu Dawud 5074 | 1 | hadith-inline | curate |
| 10 | Allahumma afini fi badani | Abu Dawud 5090 | 3 | hadith-inline | curate |
| 11 | Hasbiya Allahu la ilaha illa huwa | Abu Dawud 5081 | 7 | hadith-inline | curate |
| 12 | A'udhu bi kalimat Allah at-tammat (min sharri ma khalaq) | Muslim 2708 | 3 | hadith-inline | curate |
| 13 | Bismillah alladhi la yadurru | Abu Dawud 5088 | 3 | hadith-inline | curate |
| 14 | Allahumma salli ala nabiyyina Muhammad | Tabarani | 10 | hadith-inline | curate |
| 15 | Subhan Allah wa bi-hamdihi | Muslim 2692 | 100 | hadith-inline | curate |
| 16 | La ilaha illa Allah wahdahu la sharika lah (full formula) | Muslim 2692 | 100 | hadith-inline | curate |
| 17 | Reduced-count evening-specific protection | Abu Dawud 5077; Nasa'i al-Sunan al-Kubra | 10 | hadith-inline | curate |
| 18 | Subhan Allah wa bi-hamdihi adada khalqih | Muslim 2726 | 3 | hadith-inline | curate |
| 19 | Allahumma inni as'aluka khayra hadhihi al-laylah (goodness of this night) | Abu Dawud 5084 | 1 | hadith-inline | curate |
| 20 | Astaghfir Allah wa atubu ilayh | Bukhari 6307 | 100 | hadith-inline | curate |
| 21 | Allahumma anta khalaqtani | Abu Dawud 5070 | 1 | hadith-inline | curate |
| 22 | A'udhu bi kalimat Allah at-tammat allati la yujawizuhunna barrun wa la fajir | Ibn Majah 3853 | 3 | hadith-inline | curate |
| 23 | Ya Hayyu ya Qayyum | al-Hakim 1870 | 1–3 | hadith-inline | curate |
| 24 | A'udhu bi kalimat Allah at-tammat min ghadabihi wa iqabih | Abu Dawud 3893; Tirmidhi 3528 | 3 | hadith-inline | curate |

---

## Before-Sleep Adhkar (`sleep.json`)

**Target 12 entries.** Currently **5 Quran-ref entries shipped**. 7 hadith-derived entries pending.

Dropped per user decision: old tasbih compilation (33/33/34 before sleep). Surah al-Mulk (Tirmidhi 2890) and as-Sajdah live as **pre-seeded reminders** (FR-EX7 / FR-EX8) only, not in the adhkar reader.

| # | Identifier | Primary source | Reps | Retrieval | Status |
|---|------------|----------------|------|-----------|--------|
| 1 | Ayat al-Kursi | Bukhari 5010 | 1 | quranRef | ✅ `sleep-001` |
| 2 | Last two ayahs of al-Baqarah | Bukhari 5008; Muslim 807 | 1 | quranRef | ✅ `sleep-002` |
| 3 | Surah al-Ikhlas (blown into cupped hands) | Bukhari 5017 | 3 | quranRef | ✅ `sleep-003` |
| 4 | Surah al-Falaq | Bukhari 5017 | 3 | quranRef | ✅ `sleep-004` |
| 5 | Surah an-Nas | Bukhari 5017 | 3 | quranRef | ✅ `sleep-005` |
| 6 | Allahumma bi-ismika amutu wa ahya | Bukhari 6324 | 1 | hadith-inline | curate |
| 7 | Allahumma aslamtu nafsi ilayk | Bukhari 6313 | 1 | hadith-inline | curate |
| 8 | Allahumma inni a'udhu bika min adhab al-qabr | Muslim 588 | 1 | hadith-inline | curate |
| 9 | Allahumma qini adhabaka yawma tab'athu ibadak | Abu Dawud 5045; Tirmidhi 3398 | 3 | hadith-inline | curate |
| 10 | Bismika rabbi wada'tu janbi | Bukhari 6320; Muslim 2714 | 1 | hadith-inline | curate |
| 11 | Al-hamdu lillahi alladhi at'amana wa saqana | Abu Dawud 5053 | 1 | hadith-inline | curate — optional |
| 12 | A'udhu bi kalimat Allah at-tammat min sharri ma khalaq | Muslim 2708 | 3 | hadith-inline | curate |

---

## Upon-Waking Adhkar (`waking.json`)

**Target 4 entries.** Currently **1 Quran-ref entry shipped**. 3 hadith-derived entries pending.

Dropped per user decision: miswak Sunnah action (not a recited dua).

| # | Identifier | Primary source | Reps | Retrieval | Status |
|---|------------|----------------|------|-----------|--------|
| 1 | Al-hamdu lillahi alladhi ahyana ba'da ma amatana | Bukhari 6312; Muslim 2711 | 1 | hadith-inline | curate |
| 2 | Last ten ayahs of Aal-Imran (Quran 3:190–200) | Bukhari 4569; Muslim 763 | 1 | quranRef | ✅ `waking-002` |
| 3 | La ilaha illa Allah wahdahu la sharika lah + istighfar (night-waking) | Bukhari 1154 | 1 | hadith-inline | curate |
| 4 | Alhamdulillah alladhi afani fi jasadi | Tirmidhi 3401 | 1 | hadith-inline | curate — optional |

---

## Summary

| Routine | Target | Shipped (Quran-ref, inline) | Pending (hadith curator pass) |
|---------|--------|------------------------------|-------------------------------|
| Morning | 25 | 4 | 21 |
| Evening | 24 | 4 | 20 |
| Sleep | 12 | 5 | 7 |
| Waking | 4 | 1 | 3 |
| **Total** | **65** | **14** | **51** |

**What ships today** (as of the refactor commit):
- 14 Quran-referenced duas with full Arabic + Sahih International + Mustafa Khattab (Clear Quran) + Bengali Muhiuddin Khan translations, all inline in the JSON bundle. Works offline from first app install with no consent prompts or corpus downloads.

**What's next** (curator pass, per-entry workflow):
1. Locate hadith on sunnah.com by book+number.
2. Verify grade is Sahih (or Hasan — reject Da'if).
3. Copy Arabic (public domain from hadith narration).
4. Copy CC-BY English translation of the dua portion.
5. If Bengali is available permissively, copy + attribute; else leave absent.
6. Transliteration optional (Seen-Arabic MIT where available).
7. Record per-entry provenance in `packages/shared/src/data/adhkar/LICENSES.md`.
8. `npm run -w packages/shared test` — the validator enforces entry shape.

**Out of scope for v1.1a:**
- `friday-post-asr` routine (post-Asr Friday adhkar)
- `post-salah` routine (tasbih 33×3 + other post-prayer adhkar) — will ship with FR-EX2 tasbih counter feature
- Bengali translations for hadith-derived entries (no permissive source identified)
- Adhkar tap-count persistence (counter is ephemeral; follow-up alignment with Reminder `completions[]`)
