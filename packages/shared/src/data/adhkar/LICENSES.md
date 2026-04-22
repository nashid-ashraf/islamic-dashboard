# Adhkar content sources — licensing and attribution

The adhkar JSON in this directory is bundled into the Islamic Dashboard app (web + mobile) and must remain redistributable under the repository's license. This file tracks the provenance of every piece of content so that license drift is caught at review.

## Current bundle (v1.1a scaffold)

| File | Source of Arabic | Source of translations | License | Notes |
|------|------------------|------------------------|---------|-------|
| `morning.json` | Quran (public domain, universal) — resolved via `quranRef` → `QuranOfflineCorpus` at render time | None bundled; rendered via Quran corpus when hydrated | Public domain / re-use permitted for Quran text | Hadith-derived entries not yet curated |
| `evening.json` | Same as above | Same as above | Same | Hadith-derived entries not yet curated |
| `sleep.json` | Same as above | Same as above | Same | Hadith-derived entries not yet curated |
| `waking.json` | — | — | — | **Empty pending curation.** No Quran-referenced duas canonically part of this routine |

The scaffold deliberately ships only entries whose Arabic text is **Quran** — the Quran is universally public domain and we hold it via the existing `QuranOfflineCorpus`. No editorial content (hadith Arabic wordings, transliterations, or translations) is bundled in this scaffold.

## What NOT to bundle without an explicit audit

- **Darussalam publications** (Hisn al-Muslim, any "Fortress of the Muslim" printed edition) — commercially licensed, not redistributable, even under the guise of "attribution".
- **Mohiuddin Khan, Abu Bakr Zakaria Bengali translations** — same publisher, same restrictions.
- Any dataset that does not carry an explicit open license (MIT / Apache-2.0 / CC-BY / CC-BY-SA / public domain). No license ⇒ all rights reserved. Cannot bundle.

## Approved upstream sources for future curation passes

| Source | License | Coverage | URL |
|--------|---------|----------|-----|
| **sunnah.com** | CC-BY 3.0 | Full hadith corpus with English; some categorical tagging of adhkar | https://sunnah.com |
| **Seen-Arabic/Morning-And-Evening-Adhkar-DB** | MIT | Morning + evening only (≈30 entries). Arabic + English + transliteration + count + source | https://github.com/Seen-Arabic/Morning-And-Evening-Adhkar-DB |
| **fitrahive/dua-dhikr** | MIT | Multilingual API; uneven completeness. Useful cross-reference | https://github.com/fitrahive/dua-dhikr |

## Curation checklist (per entry added)

1. Arabic text verified against the cited hadith on sunnah.com or the Quran (when `quranRef`).
2. Translation sourced from an explicitly permissive dataset or composed from scratch. Never copy-paste from a printed edition without license confirmation.
3. `source` field points to a specific hadith (book + number) or ayah.
4. Repetition count matches the source attestation.
5. This file updated to reflect the new provenance.

## Current status

- **Morning, evening, sleep**: Quran-derived seeds only; ~3–5 entries each. Hadith-derived entries are the next curation pass.
- **Waking-up**: empty pending first curation pass.
- **Friday-after-Asr, post-salah**: out of scope for v1.1a; see `REQUIREMENTS.md` §5B.3.
