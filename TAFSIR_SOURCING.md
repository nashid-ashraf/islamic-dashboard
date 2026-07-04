# Tafsir Sourcing & Licensing Record (FR-EX34)

**Created 2026-07-04.** Resolves the open license question flagged in `SCATTERED_REQUIREMENTS.md` §FR-EX34 ("tafsir source/license is undetermined"). This is the durable record of what was investigated and the verdict.

**Feature.** FR-EX34 — "one Tafsir ayah per day (Tafsir as-Sa'di)": a once-daily reminder surfacing an ayah plus its tafsir. Requires a new `{ kind: 'tafsir', … }` `ReminderAction` variant **and** a tafsir text source. The existing Quran stack (AlQuran.cloud, Aladhan) provides translations, **not** as-Sa'di tafsir — so this is net-new content, not a Quran-corpus extension.

---

## Verdict at a glance

| Layer | Status | Shippable? |
|-------|--------|-----------|
| **Arabic original** (Taysir al-Karim al-Rahman, as-Sa'di) | **Public domain** | ✅ Yes, on PD grounds |
| **English translations** (IIPH, Darussalam) | All rights reserved | ❌ No free source exists |
| **Open datasets/APIs** serving Saadi | No content license; none carry English | ⚠️ Arabic only, PD-basis, verify file provenance |

**Product decision, not a research one:** ship **Arabic-only** Saadi on public-domain grounds, or **defer tafsir** until an English edition is licensed. There is no free English Tafsir as-Sa'di to bundle.

---

## 1. Arabic original — PUBLIC DOMAIN (by law, not by grant)

- Sheikh Abd al-Rahman ibn Nasir **as-Sa'di died 1957**.
- Saudi copyright term is **life + 50 years** (Copyright Law, Royal Decree No. M/41, 2 Rajab 1424 / 30 Aug 2003; the 2018 amendment, Council of Ministers Decision No. 536, did not extend the term for ordinary literary works).
- 1957 + 50 → the Arabic original **entered the public domain on 1 Jan 2008**.
- Sources: [WIPO Lex — Saudi Copyright Law](https://www.wipo.int/wipolex/en/legislation/details/19412) · [Wikimedia Commons — Copyright rules by territory, Saudi Arabia](https://commons.wikimedia.org/wiki/Commons:Copyright_rules_by_territory/Saudi_Arabia)
- **Caveat:** this is the *underlying work's* status. A specific typeset/annotated Arabic edition may carry its own thin copyright on added apparatus; the base text is PD regardless.

## 2. English translations — ALL RIGHTS RESERVED (no open license exists)

- Two mainstream English editions, both commercial and closed:
  - **IIPH** (International Islamic Publishing House) — 10-vol, trans. Nasiruddin al-Khattab, ed. Huda Khattab (Riyadh 2018). Copyright page: *"All rights reserved… No part of this book may be reproduced or transmitted in any form… without written permission from the Publisher."* [iiph.com](https://iiph.com/product/tafseer-as-sa-di-vol-1-10/)
  - **Darussalam** — 10-vol full tafsir, likewise all-rights-reserved. [darussalam.com](https://darussalam.com/tafseer-as-sadi-10-volumes-full-tafsir-as-sadi/)
- **A translation carries its own fresh copyright** even when the source Arabic is public domain. The PD status of as-Sa'di's Arabic does **not** free any English translation of it.
- **No redistributable / openly-licensed English translation of Tafsir as-Sa'di was found anywhere.**

## 3. Open datasets / APIs — none grant a usable license

| Source | Saadi coverage | License posture |
|--------|----------------|-----------------|
| **QUL / Quranic Universal Library** (qul.tarteel.ai, Tarteel) | Arabic, Albanian, Russian, Urdu, Indonesian, Turkish, Persian — **no English** | FAQ: resources "vary in copyright status… review the licensing terms for each." Individual Saadi resource pages show **no license field** — download-only. Treat as "unstated → verify." [qul.tarteel.ai/faq](https://qul.tarteel.ai/faq) |
| **spa5k/tafsir_api** (GitHub) | Russian, Arabic, Urdu, Persian, Turkish — **no English** | Repo `LICENSE` is **MIT for the CODE only**. No license attached to the tafsir *content* (pulled from quran.com / altafsir.com / qul). MIT-on-code ≠ content license. [github.com/spa5k/tafsir_api](https://github.com/spa5k/tafsir_api) |
| **quran.com / Quran Foundation API** | Saadi in mostly non-English languages | **No content license / usage terms** published for tafsir resources. Absence of a stated license = all rights reserved. [quran.com/developers](https://quran.com/developers) |
| **QuranEnc / KFGQPC** (quranenc.com, IslamHouse) | Saadi entry **not confirmed** | "Free electronic reference" access language, but no explicit open redistribution *license* located, and no confirmed Saadi entry. Unverified. |
| **AlQuran.cloud** | Saadi edition not confirmed | Not a viable source here. |

**Rule applied throughout:** "No license stated" ⇒ all rights reserved. A dataset being on GitHub or free-to-read does **not** make its content freely licensed.

## 4. kalamullah.com — NOT a usable source

User-proposed source ([kalamullah.com/tafseer-as-sadi.html](https://www.kalamullah.com/tafseer-as-sadi.html)). Investigated 2026-07-04.

- **What it hosts:** the **complete IIPH English 10-volume edition** as PDFs (`Tafseer-As-Sadi-Volume-1..10-Juz-*.pdf`) — i.e. the *exact* all-rights-reserved Nasiruddin al-Khattab translation from §2.
- **Its copyright stance** ([kalamullah.com/copyright.html](https://kalamullah.com/copyright.html)) is a **religious-ethics argument, not a license grant**: it holds that scholars' works "cannot be copyrighted," and that copying copyrighted material "to learn or teach or spread Da'wah" is permissible "as long as… not… used for profit." Some hosted books carry a line like *"Any or all parts of this book may be used for educational purposes as long as… not… used for profit."*
- **Why that fails as a source for this project:**
  1. The permission must come from the **copyright holder (IIPH)**, not from a redistributor. Kalamullah does not claim to have obtained IIPH's permission; it asserts a *theological* opinion that such permission is unnecessary. That opinion does not bind IIPH and does not create a legal redistribution license.
  2. Even taken at face value, its own stated condition is **non-commercial / educational only** — which fails the moment this app has any commercial dimension, exactly like the Khattab-Quran caveat already tracked in the adhkar `LICENSES.md`.
  3. Bundling these PDFs is materially the same as scraping the IIPH edition. **Do not use.**

---

## How to obtain a real license (if English is required)

Ranked by practicality for this project:

1. **License the IIPH edition directly.** IIPH holds rights to the standard English 10-vol translation. Contact them for a **digital/app redistribution license** (scope: bundling ayah-level excerpts in a free app; ask specifically about per-ayah excerpting vs. full-text). This is the cleanest path to the *recognized* English text. Expect a fee and an attribution/scope clause; get the non-commercial-vs-commercial terms in writing since the app's monetization status governs everything. Contact via [iiph.com](https://iiph.com/).
2. **Ask for / use a *waqf* edition.** Some Islamic translations are released as *waqf* (endowment — donated for free distribution). Ask IIPH/Darussalam whether a waqf or "free electronic distribution" edition of Saadi exists; if so, get the waqf terms in writing (waqf usually permits free copying but forbids sale/alteration — compatible with a free app, not a paid one).
3. **KFGQPC / QuranEnc / IslamHouse route.** The King Fahd Complex distributes many translations as free electronic references. Confirm directly whether they carry an English Saadi tafsir and, if so, obtain their explicit redistribution terms (not just "free to read"). Unverified as of this record.
4. **Commission an original English translation of the PD Arabic.** Since the Arabic is public domain, a freshly commissioned translation is unencumbered by IIPH/Darussalam rights, and *you* choose its license (e.g. release it **CC-BY-4.0**, mirroring how the adhkar `LICENSES.md` treats commissioned Bengali). Highest cost/effort, but the only path that yields a *reusable, openly-licensed* English Saadi that also benefits the wider ecosystem. Scope could be limited to a curated daily-rotation subset rather than all 6,236 ayahs.

**If Arabic-only suffices** (§1), none of the above is needed — ship the PD Arabic. Source a clean Arabic copy (e.g. QUL Arabic resource ID 24), **document the public-domain basis yourself**, and do **not** cite "MIT" (that's spa5k's code) or imply any dataset licensed it to you. Before shipping, confirm with QUL whether their Arabic Saadi file is a specific copyrighted typeset edition vs. the plain PD text.

---

## Confidence & open items

- **High confidence:** Saudi life+50 term and the 1957→PD-2008 Arabic conclusion; the all-rights-reserved status of IIPH/Darussalam English; spa5k's MIT = code-only; no English Saadi in any open dataset checked; kalamullah hosts the IIPH edition under a self-declared (non-binding) copyright theory.
- **To confirm before shipping:**
  1. Provenance/rights of QUL's Arabic Saadi *file* (PD underlying work, but possibly a copyrighted typeset) — ask QUL via GitHub/Discord.
  2. Whether QuranEnc/KFGQPC actually carries an English Saadi and its precise terms.
  3. If distributing outside life+50 jurisdictions, verify the local term (a 1957 death generally clears life+70 too, but confirm for the target geography).

## Licensing IIPH — contact & process (researched 2026-07-04)

If pursuing path 1 (license the IIPH English edition for **free non-commercial** app use), this is the concrete route. IIPH holds the rights to al-Khattab's English translation — the exact text needed — so IIPH is the correct rightsholder to approach.

**Primary contact:** `editorial@iiph.com` — the address IIPH's own [Rights and Permissions](https://iiph.com/rights-and-permissions/) page routes permission requests to (also the [Contact Us](https://iiph.com/contactnew/) publishing address). There is **no separate `rights@`/`permissions@` mailbox**; permissions and subsidiary rights (incl. digital/electronic) go through editorial.

| Channel | Detail |
|---------|--------|
| Permissions/rights email | **`editorial@iiph.com`** |
| Sales email | `sales@iiph.com` |
| Phone | +966 11 491 4289 · Mobile +966 55 477 9343 |
| Fax (rights page) | +966 1 463 3489 |
| Address | King Fahd Rd, Olaya, Riyadh 11534, KSA; P.O. Box 55195 *(third-party directory — unverified, confirm before postal mail)* |
| Social | FB /IIPHbookstore · X @IIPHbooks · LinkedIn /international-islamic-publishing-house |

**Documented process** (from the Rights and Permissions page):
- All material is copyright-protected; **written permission required**, submitted **in writing (email or fax)**.
- Request must include: full **title, author, ISBN**; exact material + page numbers; your publisher/project name & description; **territory**; **format & publication details**; full contact info.
- **"A permission (or copyright) fee may be charged"** — a free grant is possible but **not guaranteed**; they decide what counts as fair use.
- Processing: **up to 6 weeks**. No online form, no app/da'wah-specific carve-out → this is cold outreach against the general permissions process.

**Draft outreach message:**

> **Subject: Permission request — non-commercial reuse of Tafseer as-Sa'di (English) in a free Islamic app**
>
> Assalamu alaikum,
>
> I am developing a **free, non-commercial Islamic app** (no ads, no paid features) that displays the Qur'an ayah-by-ayah with a short tafsir excerpt for each verse. I would like to request written permission to include per-ayah excerpts from IIPH's English translation of **Tafseer as-Sa'di** (10-volume set, trans. Nasiruddin al-Khattab, IIPH), with **full attribution to the author, translator, and IIPH** on every excerpt.
>
> Details: the app shows only a brief tafsir passage per ayah (not continuous full-volume text), is distributed free of charge for educational/da'wah purposes, and generates no revenue. I am happy to display any copyright/attribution notice you require, limit excerpt length, and provide the app for your review.
>
> Could you let me know whether IIPH would grant a royalty-free non-commercial license for this use, and what terms or documentation you need? I can supply title/ISBN, the exact material, format, and distribution territory (worldwide, digital) on request.
>
> JazakumAllahu khairan,
> [Name / contact details]

**Confidence:** high on `editorial@iiph.com`, the process, phones/fax/social (all from iiph.com). Unverified: the street address/P.O. Box (third-party directory), any official WhatsApp/Instagram, and whether IIPH has ever granted a *free* app license (fees "may be charged").

## Impact on FR-EX34 build

- **Content is the blocker, not the code.** The `{ kind: 'tafsir' }` action variant + a date-seeded rotation (shared with FR-EX9 / the daily-hadith `pickDaily` primitive — see `HADITH_INVENTORY.md`) are straightforward.
- **Recommendation:** if the product accepts **Arabic-only** tafsir, FR-EX34 is unblocked on PD grounds. If **English** is required, FR-EX34 stays **deferred** pending a license (path 1 or 4 above) — unlike daily-hadith, which is fully unblocked via sunnah.com CC-BY.
