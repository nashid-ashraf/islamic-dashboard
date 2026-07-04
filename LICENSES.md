# Content Licensing Register (repo root)

**Master decision register for every piece of bundled/served content** — Quran editions, adhkar, hadith, tafsir, and fonts. This is the index and the record of decisions already made. Deep per-entry logs live in the linked docs; this file does **not** duplicate them.

The repo already points here: `packages/web/public/fonts/README.md` instructs that the chosen Arabic font be documented in "`LICENSES.md` (repo root)". This is that file.

**Last updated:** 2026-07-04.

**Governing rule (from FR-EX25):** every bundled string must trace to a redistributable source. "No license stated" ⇒ all rights reserved. Public-domain status of an *underlying work* never frees a *translation* of it (translations carry their own fresh copyright).

**Project posture:** currently a **free, non-commercial, open-source** app. Several permissions below hold *only* under that posture and **lapse on any commercial/monetized release** — those are flagged ⚠️ **commercial-gated** with the re-licensing contact.

---

## Master table

| Content | Source | License | Decision | Commercial? | Detail |
|---------|--------|---------|----------|-------------|--------|
| **Quran — Arabic Uthmani** (`ar-uthmani`) | AlQuran.cloud | Public domain | ✅ Use freely | OK | — |
| **Quran — Sahih International EN** (`en-sahih`) | AlQuran.cloud; sunnah.com (for hadith adhkar) | Released for free dissemination; widely redistributed (not a formal open license) | ✅ Use w/ attribution | ⚠️ re-verify before commercial | adhkar `LICENSES.md` |
| **Quran — The Clear Quran / Khattab EN** (`en-khattab`) | fawazahmed0 CDN (`eng-mustafakhattaba`) | **CC BY-NC-ND 4.0**, © Al-Furqaan Foundation | ✅ Use — verbatim + attribution + non-commercial | ⚠️ **commercial-gated** — see §Khattab | this file, §Khattab |
| **Quran — Muhiuddin Khan BN** (`bn-muhiuddin`) | AlQuran.cloud | Public domain / freely redistributable (his *Quran* translation) | ✅ Use | OK | adhkar `LICENSES.md` |
| **Adhkar** (morning/evening/sleep/waking) | sunnah.com (CC-BY 3.0); Seen-Arabic DB (MIT); Quran editions above | Arabic PD; EN = CC-BY 3.0 / MIT | ✅ Shipped (65 entries) | ⚠️ Khattab-on-Quran-refs gated | `packages/shared/src/data/adhkar/LICENSES.md` |
| **Daily Hadith** (Nawawi 40) | sunnah.com | Arabic PD; EN = **CC-BY 3.0** (USC-MSA) | 🟡 Scoped, license clear, **42-entry curation pending** | OK (CC-BY allows commercial w/ attribution) | `HADITH_INVENTORY.md` |
| **Tafsir as-Sa'di** (FR-EX34) | — | Arabic = **public domain**; English = all-rights-reserved (IIPH/Darussalam) | 🔴 Arabic ship-able / **English blocked** | Arabic OK; English needs license | `TAFSIR_SOURCING.md` |
| **Fonts — Amiri** (default Uthmani) | Google Fonts / system | SIL OFL 1.1 | ✅ Use | OK | fonts `README.md` |
| **Fonts — IndoPak** (Scheherazade New / Noto Naskh) | SIL | SIL OFL 1.1 | ✅ Safe default when shipped | OK | fonts `README.md` |
| **Fonts — Al Majeed / Me_Quran** | — | Unclear | ⛔ Investigate before shipping | — | fonts `README.md` |

Legend: ✅ cleared · 🟡 cleared but work pending · 🔴 partially blocked · ⛔ do not ship yet.

---

## The Clear Quran (Khattab) — full detail {#khattab}

Researched 2026-07-04. **This corrects the earlier note in the adhkar `LICENSES.md`**, which mis-attributed the rightsholder ("The Book Foundation") and omitted the NoDerivatives term.

- **Rightsholder:** **Al-Furqaan Foundation USA** (© 2003–present). Authorized publishers are the **Book of Signs Foundation** and the **Furqaan Institute of Quranic Education (FIQE)**, both divisions of Al-Furqaan Foundation. ("The Book Foundation" in the old note was an error.)
- **License:** **Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0).** The Clear Quran files are "free to use, share, and distribute for non-commercial purposes with appropriate credit and without modifications or creating derivatives."
  - Sources: [theclearquran.org/copyright-information](https://theclearquran.org/copyright-information/) · [fiqe.org/the-clear-quran-series](https://fiqe.org/the-clear-quran-series/) · CC deed [creativecommons.org/licenses/by-nc-nd/4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)
- **What each term means for this app:**
  - **BY** — must attribute: credit *Dr. Mustafa Khattab, The Clear Quran, © Al-Furqaan Foundation*, show the license + a link, and state no changes were made. Surface this in the Quran reader / an about-licenses screen.
  - **NC** — **non-commercial only.** Fine while the app is free with no ads/paid tiers. **Any monetization voids the CC grant** → need a separate commercial license.
  - **ND (NoDerivatives)** — may redistribute **verbatim** copies only. Displaying the exact ayah text unmodified (format-shifted into JSON / shown ayah-by-ayah) is fine; **editing, paraphrasing, or merging it into a composite/blended translation is NOT.** Keep the text byte-verbatim.
- **Verdict for THIS project:** ✅ **compliant** — free, non-commercial, verbatim display with attribution. The "fine for now" holds, with the ND term now explicit: never alter the text.
- ⚠️ **Commercial pre-emption:** to monetize, obtain a commercial license from Al-Furqaan Foundation *before* shipping paid.

### Al-Furqaan Foundation — licensing contact
| Channel | Detail |
|---------|--------|
| General email | `info@theclearquran.org` |
| **App-specific email** (best channel) | `tcqapps@furqaan.org` |
| Address | Al-Furqaan Foundation, 642 Forestwood Dr, Romeoville, IL 60446, USA |
| Phone | +1 (630) 914-5015 · +1 (888) 273-2755 |
| Sites | [theclearquran.org](https://theclearquran.org) · [furqaan.org](https://furqaan.org) · [fiqe.org](https://fiqe.org) |

> ⚠️ Disambiguation: **"The Clear Quran" by Dr. Mustafa Khattab** (Al-Furqaan Foundation, the edition used here, slug `eng-mustafakhattaba`) is a **different work** from **Talal Itani's "ClearQuran" / "Quran: English Translation"** (clearquran.com). Do not conflate their licenses or contacts. Also ignore the placeholder contact data ("123 Quran Avenue, Toronto", "+1 555-123-4567") that appears on some template pages — it is not real.

### Draft commercial-license outreach (if the app ever monetizes)
> **Subject: Commercial license request — The Clear Quran in a Quran app**
>
> Assalamu alaikum, I develop a Quran app that currently bundles The Clear Quran (Dr. Mustafa Khattab) verbatim, ayah-by-ayah, with full attribution, under CC BY-NC-ND 4.0 for non-commercial use. We are considering a commercial release and want to license the text properly first. Could you advise on terms/fees for commercial use of The Clear Quran text in a paid or ad-supported app, worldwide, digital, verbatim with attribution? JazakumAllahu khairan — [name/contact].

---

## Forbidden sources (never bundle, even with attribution)

- **Darussalam Publishers** editions of Hisn al-Muslim / Fortress of the Muslim (English, Arabic-with-tashkeel, transliterations, Bengali by Muhiuddin Khan or Abu Bakr Zakaria *of Hisnul Muslim*).
- **"Dua & Zikr — Hisnul Muslim" iOS app** (App Store ID 1402550533) — personal reading only.
- **IIPH / Darussalam English Tafsir as-Sa'di**, including the **kalamullah.com** PDFs (they host the IIPH edition under a self-declared, non-binding copyright theory — not a license grant). See `TAFSIR_SOURCING.md`.
- Any dataset with **no explicit redistribution license** ("no license stated" ⇒ all rights reserved) — incl. quran.com/QUL/spa5k tafsir *content* (their code MIT ≠ content license).
- **Disambiguation trap:** Muhiuddin Khan translated BOTH the Quran (free, used here) AND Hisnul Muslim (Darussalam, forbidden). Only his Quran translation is permitted.

## Commercial-release checklist (⚠️ before any monetization)

Permissions below are **non-commercial-only** and must be re-cleared before charging money / adding ads:
1. **The Clear Quran (Khattab)** — obtain commercial license from Al-Furqaan Foundation (contact above). *Or* drop `en-khattab`.
2. **Sahih International** — re-verify its terms for commercial redistribution (free-dissemination grant is informal).
3. **Tafsir as-Sa'di** — English already blocked even non-commercially; commercial only widens the gap (IIPH license or commissioned CC translation).
4. **sunnah.com CC-BY 3.0** (adhkar EN, daily hadith) — CC-BY *does* permit commercial use with attribution; no change needed, just keep attribution.
5. **Fonts** — SIL OFL permits commercial use; safe.

## Related detail docs
- `packages/shared/src/data/adhkar/LICENSES.md` — per-entry adhkar provenance (the authoritative audit log; CI cross-references it).
- `HADITH_INVENTORY.md` — daily-hadith (Nawawi 40) worklist + sourcing.
- `TAFSIR_SOURCING.md` — Tafsir as-Sa'di verdict, IIPH contact, acquisition paths.
- `packages/web/public/fonts/README.md` — Arabic font options + licenses.
- `REQUIREMENTS.md` §FR-EX25 — original licensing discipline statement.
