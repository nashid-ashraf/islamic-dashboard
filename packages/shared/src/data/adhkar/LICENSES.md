# Adhkar content sources — per-entry provenance

Every piece of text bundled in this directory — Arabic, transliteration, and each translation — MUST be traceable to a redistributable source. This file is the audit log and the gate the CI validator cross-references.

## Overall licensing summary

| Kind | License posture |
|------|-----------------|
| Quran Arabic (Uthmani) | Universally public domain. |
| **Sahih International** English translation | Released for free dissemination by the translators; widely redistributed in open-source Muslim software. Permissive. |
| **Mustafa Khattab — The Clear Quran** | Licensed by The Book Foundation for free personal and non-commercial distribution with attribution. This open-source project qualifies. If this project ever becomes commercial (paid app, revenue-generating), the Khattab edition must be re-evaluated under commercial license terms. Not before. |
| **Bengali — Muhiuddin Khan** (Quran translation) | Public domain / freely redistributable in Bangladesh; long-standing open use across Muslim open-source software. (Note: Muhiuddin Khan's **Hisnul Muslim** translation is separately Darussalam-licensed and is NOT used here — only his Quran translation, sourced via AlQuran.cloud.) |
| Hadith Arabic text | Universally public domain (transmitted since the 7th century, recorded in the 9th). |
| sunnah.com English | CC-BY 3.0 (by USC-MSA Center); must credit source URL per entry. |
| Seen-Arabic/Morning-And-Evening-Adhkar-DB | MIT. |

## Per-entry provenance log

Format: `dua-id | source | Arabic | en-sahih | en-khattab | bn-muhiuddin | Fetch URL`

### Morning (`morning.json`) — Quran-referenced

| Dua ID | Source | Arabic | en-sahih | en-khattab | bn-muhiuddin |
|--------|--------|--------|----------|------------|--------------|
| morning-001 | Quran 2:255 (Ayat al-Kursi) | PD (Quran Uthmani via AlQuran.cloud) | Sahih Intl via AlQuran.cloud (permissive) | Khattab / The Clear Quran via fawazahmed0 CDN (non-commercial OK) | Muhiuddin Khan Quran via AlQuran.cloud (PD) |
| morning-002 | Quran 112 (Al-Ikhlas) | PD | Sahih Intl via AlQuran.cloud | Khattab via fawazahmed0 CDN | Muhiuddin Khan via AlQuran.cloud |
| morning-003 | Quran 113 (Al-Falaq) | PD | same | same | same |
| morning-004 | Quran 114 (An-Nas) | PD | same | same | same |

### Evening (`evening.json`) — Quran-referenced

| Dua ID | Source | Arabic | en-sahih | en-khattab | bn-muhiuddin |
|--------|--------|--------|----------|------------|--------------|
| evening-001 | Quran 2:255 | PD | Sahih Intl via AlQuran.cloud | Khattab via fawazahmed0 CDN | Muhiuddin Khan via AlQuran.cloud |
| evening-002 | Quran 112 | PD | same | same | same |
| evening-003 | Quran 113 | PD | same | same | same |
| evening-004 | Quran 114 | PD | same | same | same |

### Sleep (`sleep.json`) — Quran-referenced

| Dua ID | Source | Arabic | en-sahih | en-khattab | bn-muhiuddin |
|--------|--------|--------|----------|------------|--------------|
| sleep-001 | Quran 2:255 | PD | Sahih Intl via AlQuran.cloud | Khattab via fawazahmed0 CDN | Muhiuddin Khan via AlQuran.cloud |
| sleep-002 | Quran 2:285-286 | PD | same | same | same |
| sleep-003 | Quran 112 | PD | same | same | same |
| sleep-004 | Quran 113 | PD | same | same | same |
| sleep-005 | Quran 114 | PD | same | same | same |

### Upon Waking (`waking.json`) — Quran-referenced

| Dua ID | Source | Arabic | en-sahih | en-khattab | bn-muhiuddin |
|--------|--------|--------|----------|------------|--------------|
| waking-002 | Quran 3:190-200 | PD | Sahih Intl via AlQuran.cloud | Khattab via fawazahmed0 CDN | Muhiuddin Khan via AlQuran.cloud |

**Text populated by:** `packages/shared/scripts/populate-quran-text.mjs`. Re-run this script whenever ayah ranges change or a new Quran-referenced entry is added.

## Rules for adding hadith-derived entries (future curator passes)

Every hadith entry MUST be matched by a row in the per-entry table above. `adhkar.validate.test.ts` enforces the shape at CI; provenance cross-check is a manual PR-review gate.

Per entry, the curator records:
1. **Arabic** — license: "Public domain (hadith)"; URL: specific sunnah.com page (e.g. `https://sunnah.com/bukhari:6306`).
2. **Transliteration** — if copied from Seen-Arabic MIT, record license "MIT" + source URL. If authored by the curator, "Original work".
3. **Each translation** — per `TranslationEditionId` key used in the JSON, one row citing the exact source and license:
   - `en-sahih` copied verbatim from sunnah.com → "CC-BY 3.0 via sunnah.com" + direct URL.
   - `en-khattab` will typically be ABSENT on hadith entries — Khattab translated the Quran only, not hadith-derived adhkar. Do not invent entries.
   - `bn-muhiuddin` is blocked — no permissive Bengali source for hadith-derived adhkar has been identified. Leave absent; the reader's `pickTranslation` helper falls back to English.

If a translation cannot be sourced permissively, **omit it entirely** — don't paraphrase, don't "rewrite in your own words," don't approximate. Absence is valid representation.

## Forbidden sources

Never bundle content derived from any of these, even with attribution:

- **Darussalam Publishers** editions of Hisn al-Muslim / Fortress of the Muslim (English, Arabic-with-tashkeel printings, transliterations, Bengali translations by Muhiuddin Khan or Abu Bakr Zakaria *of Hisnul Muslim*).
- **The "Dua & Zikr - Hisnul Muslim" iOS app** (App Store ID 1402550533). The app content is licensed for personal reading, not redistribution.
- Any dataset that lacks an explicit redistribution license. "No license stated" ⇒ all rights reserved.

Note disambiguation: Muhiuddin Khan translated BOTH the Quran and Hisnul Muslim. His **Quran translation** (used here, sourced via AlQuran.cloud) is freely redistributable. His **Hisnul Muslim translation** (Darussalam) is NOT. Do not mix them.

## Approved upstream sources

| Source | License | Coverage | Field uses | URL |
|--------|---------|----------|-----------|-----|
| **AlQuran.cloud** | Per-edition (PD Quran + permissive translations) | All 114 surahs in dozens of editions | Quran-referenced Arabic, Sahih, Bengali Muhiuddin | https://alquran.cloud/api |
| **fawazahmed0/quran-api** (JSDelivr CDN) | Per-edition (aggregator's own licensing + upstream) | Includes Khattab's Clear Quran (`eng-mustafakhattaba`) | en-khattab for Quran-referenced entries | https://github.com/fawazahmed0/quran-api |
| **sunnah.com** | CC-BY 3.0 | Full hadith corpus + English translations | Arabic + `en-sahih` for hadith-derived entries | https://sunnah.com |
| **Seen-Arabic/Morning-And-Evening-Adhkar-DB** | MIT | Morning + evening only (≈30 entries) | Arabic + transliteration + `en-sahih` | https://github.com/Seen-Arabic/Morning-And-Evening-Adhkar-DB |
| **fitrahive/dua-dhikr** | MIT | Multilingual API; useful cross-reference | Audit per-entry before copying | https://github.com/fitrahive/dua-dhikr |

## Bengali asymmetry

Bengali translation coverage is asymmetric:
- **Quran-referenced duas**: `bn-muhiuddin` bundled inline from Muhiuddin Khan's Quran translation (free via AlQuran.cloud).
- **Hadith-derived duas**: no permissively-licensed Bengali translation of the canonical Hisnul Muslim hadith set has been identified. Absence is the correct representation; the reader's fallback chain shows English instead.

If the user (or a collaborator) commissions an original Bengali translation of hadith-derived adhkar, record it here with license "Original work, CC-BY-4.0" (or whichever license the translator chooses) and a link to the translator's attribution.
