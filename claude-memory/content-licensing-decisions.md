---
name: content-licensing-decisions
description: Where content-licensing decisions live and the key resolved verdicts (Quran/adhkar/hadith/tafsir/fonts).
metadata:
  type: project
---

Content-licensing decisions are consolidated in the repo-root **`LICENSES.md`** (master register: every source → license → decision → commercial status → pointer to a deep doc). Created 2026-07-04. The fonts README already pointed at this root path before it existed. Deep logs stay in their own files: `packages/shared/src/data/adhkar/LICENSES.md` (per-entry adhkar audit, CI-referenced), `TAFSIR_SOURCING.md`, `HADITH_INVENTORY.md`.

Resolved verdicts:
- **The Clear Quran (Khattab, `en-khattab`)** = **CC BY-NC-ND 4.0**, © **Al-Furqaan Foundation** (NOT "The Book Foundation" — the old adhkar note was wrong on rightsholder and omitted NoDerivatives; corrected this session). OK now (free/non-commercial/**verbatim**+attribution). Commercial → license from Al-Furqaan (`tcqapps@furqaan.org`).
- **Tafsir as-Sa'di (FR-EX34)**: Arabic = public domain (as-Sa'di d.1957, Saudi life+50 → PD 2008), ship-able. English = all-rights-reserved (IIPH/Darussalam); **no free English exists**; kalamullah.com hosts the IIPH scan without a license grant — unusable. IIPH permissions: `editorial@iiph.com`. Pending product call: Arabic-only now vs. wait for licensed English.
- **Daily hadith (FR-EX10/EX37)**: scoped as **40 Hadith an-Nawawi (42 entries)** via sunnah.com **CC-BY 3.0**. License clear; 42-entry curation pending. Reuses a shared date-seeded `pickDaily` rotation primitive (also unblocks FR-EX9 ayah/day).
- Adhkar (65 entries) shipped; fonts on SIL OFL. Forbidden: Darussalam Hisnul Muslim, unlicensed datasets. Muhiuddin Khan's *Quran* translation is free (used); his *Hisnul Muslim* is Darussalam (forbidden) — do not conflate.

Commercial release voids the NC-only grants (Khattab; re-verify Sahih International) — see the commercial-release checklist in `LICENSES.md`. Relates to [[requirements-intake-workflow]] (FR-EX34/EX37 live in `SCATTERED_REQUIREMENTS.md`).

**To resume this work:** start from repo-root `CONTENT_TODO.md` — the handoff doc listing what's DECIDED, the 3 OPEN product decisions (tafsir A/B/C; commercial-or-not; rotation tie-ins), and the next-step checklists (daily hadith is fully unblocked; tafsir is parked on the tafsir decision).
