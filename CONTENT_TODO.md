# Content Sourcing — Resume / To-Do

**Handoff doc for picking up the content-sourcing work in a later session.** Scope: Quran, adhkar, hadith, tafsir content + their licensing. Last worked: 2026-07-04.

**Start here on resume:** read the repo-root [`LICENSES.md`](LICENSES.md) (master licensing register). Deep docs: [`TAFSIR_SOURCING.md`](TAFSIR_SOURCING.md), [`HADITH_INVENTORY.md`](HADITH_INVENTORY.md), `packages/shared/src/data/adhkar/LICENSES.md`.

---

## ✅ DECIDED (do not re-litigate)

| Area | Decision | Status |
|------|----------|--------|
| **Quran — 4 editions** | Arabic Uthmani (PD), Sahih Intl (permissive), Khattab **CC BY-NC-ND 4.0 / Al-Furqaan**, Muhiuddin Khan BN (PD). All cleared for **non-commercial** use. | ✅ Shipped (API + offline corpus) |
| **Khattab licensing** | CC BY-NC-ND 4.0, © Al-Furqaan Foundation. Verbatim + attribution + non-commercial only. Corrected the repo's earlier wrong note. | ✅ Documented |
| **Adhkar** (65 entries) | Arabic PD; EN from sunnah.com CC-BY 3.0 + Seen-Arabic MIT; Bengali-for-hadith intentionally absent. | ✅ Shipped (3 entries deferred for citation verification — see `ADHKAR_INVENTORY.md`) |
| **Daily hadith** — collection | **40 Hadith an-Nawawi (42 entries)** via sunnah.com CC-BY 3.0. Riyad as-Salihin = future expansion. | ✅ Scoped, license clear |
| **Tafsir as-Sa'di** — license | Arabic = public domain (ship-able). English = all-rights-reserved, **no free source**. kalamullah.com unusable. | ✅ Researched |
| **Forbidden sources** | Darussalam Hisnul Muslim, kalamullah IIPH scans, unlicensed datasets, Muhiuddin Khan's *Hisnul Muslim* (his Quran is fine). | ✅ Logged in `LICENSES.md` |

---

## ⚠️ OPEN DECISIONS (yours to make — these gate the next build)

1. **Tafsir: ship Arabic-only now, wait for licensed English, or commission a translation?**
   - **A — Arabic-only now:** unblocked. Bundle PD Arabic (e.g. QUL Arabic resource ID 24; confirm the file isn't a copyrighted typeset). Fastest.
   - **B — Wait for English:** email IIPH (`editorial@iiph.com`) for a free non-commercial license; ~6-week turnaround, fee "may be charged," not guaranteed. Draft email is in `TAFSIR_SOURCING.md`.
   - **C — Commission a CC-BY English translation** of the PD Arabic (you own the license). Highest effort; only path to a *reusable* open English Saadi. Could scope to a curated daily-rotation subset.
   - *No build until this is chosen.*

2. **Is the app staying free/non-commercial?** Several permissions (Khattab, Sahih Intl) are **NC-only** and void on monetization. If commercial is ever on the table, trigger the **commercial-release checklist** in `LICENSES.md` first (contact Al-Furqaan `tcqapps@furqaan.org` for Khattab).

3. **Daily-content rotation tie-ins** (from `SCATTERED_REQUIREMENTS.md` open questions):
   - FR-EX9 ayah/day and FR-EX33 memorize-ayah/day — tie to user's last-read `ReadingPosition` or independent? (undecided)

---

## 📋 NEXT STEPS (once decisions above are made)

### Daily hadith (fully unblocked — no decision needed to start)
- [ ] **Curate 42 Nawawi hadith** from `sunnah.com/nawawi40:N` — the real work. Per-entry: Arabic (PD) + `en-sahih` (CC-BY verbatim) + narrator/reference/grade/sourceUrl. Verify grading on borderline #30, #33, #41 (reject/flag Da'if). Worklist table in `HADITH_INVENTORY.md`.
- [ ] `models/hadith.ts` + `data/hadith/nawawi40.json` + typed barrel `data/hadith/index.ts` (mirror adhkar shape).
- [ ] `data/hadith/LICENSES.md` (per-entry provenance) + `hadith.validate.test.ts`.
- [ ] Add `{ kind: 'hadith'; collection }` to `ReminderAction` (`models/reminder.ts`).
- [ ] Shared **`pickDaily`** date-seeded rotation primitive + tests (also unblocks FR-EX9 ayah/day and FR-EX34 tafsir).
- [ ] Built-in `daily-hadith` seed in `data/builtInReminders.ts` + hadith reader UI + **visible sunnah.com attribution** (CC-BY requires it).

### Tafsir (blocked on Open Decision #1)
- [ ] Resolve decision A/B/C.
- [ ] If A: source clean PD Arabic; add `{ kind: 'tafsir' }` action + reuse `pickDaily`; bundle + LICENSES row documenting PD basis (do NOT cite spa5k "MIT" — that's code-only).
- [ ] If B/C: send outreach / commission; park the build until text is in hand.

### Housekeeping
- [ ] Resolve the 3 deferred adhkar entries (citation verification) — see `ADHKAR_INVENTORY.md`.
- [ ] Before any public release: manually eyeball [theclearquran.org/copyright-information](https://theclearquran.org/copyright-information/) in a browser to confirm CC BY-NC-ND verbatim (site blocks automated fetch; the identification is well-corroborated but unread at source).

---

## Key contacts (licensing)
- **Al-Furqaan Foundation** (Khattab / The Clear Quran, commercial): `tcqapps@furqaan.org` · `info@theclearquran.org` · +1 (630) 914-5015.
- **IIPH** (Tafsir as-Sa'di English): `editorial@iiph.com` · fax +966 1 463 3489 · ~6-week turnaround.
- **sunnah.com** — CC-BY 3.0, no contact needed; just keep attribution visible.
