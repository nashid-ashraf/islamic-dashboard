# Islamic Dashboard — Requirements Document

**Version:** 1.0 (MVP)
**Date:** 2026-04-15
**Status:** Draft

---

## 1. Product Overview

### 1.1 Vision
A unified Islamic daily dashboard that combines Quran reading, prayer times, and custom reminders into a single, elegant application — deployed across web, iOS, and Android from a shared codebase.

### 1.2 Target Platforms
| Platform | Delivery |
|----------|----------|
| Web | Progressive Web App (PWA) — installable via browser |
| iOS | Native app via Expo/EAS Build — App Store or sideload |
| Android | Native app via Expo/EAS Build — Play Store or APK |

### 1.3 Technology Strategy
- **Framework:** React Native (Expo SDK) + Expo Web
- **Language:** TypeScript
- **Architecture:** Monorepo with shared business logic
- **Code Reuse Target:** ~80% shared across all platforms

---

## 2. Architecture

### 2.1 Monorepo Structure
```
islamic-dashboard/
├── packages/
│   ├── shared/            # ~80% of code lives here
│   │   ├── api/           # Aladhan, AlQuran Cloud clients
│   │   ├── models/        # TypeScript interfaces & types
│   │   ├── hooks/         # Shared React hooks (useQuran, usePrayer, useReminders)
│   │   ├── storage/       # Abstract storage layer (local now, cloud-ready)
│   │   └── utils/         # Date/time helpers, prayer time parsing
│   ├── mobile/            # Expo app (iOS + Android)
│   │   ├── app/           # Expo Router screens
│   │   ├── components/    # Mobile-specific UI (safe areas, haptics)
│   │   └── services/      # expo-notifications, expo-location
│   └── web/               # React web app (or Expo Web export)
│       ├── src/
│       ├── public/
│       ├── sw.js           # Service worker
│       └── manifest.json   # PWA manifest
├── package.json            # Monorepo root (npm workspaces or Turborepo)
└── tsconfig.base.json
```

### 2.2 Platform-Specific Code (~20%)
| Concern | Mobile (Expo) | Web |
|---------|---------------|-----|
| Notifications | `expo-notifications` | Web Push API + Service Worker |
| Geolocation | `expo-location` | `navigator.geolocation` |
| Navigation | Expo Router (file-based) | React Router or Expo Router web |
| Storage engine | `expo-sqlite` / AsyncStorage | localStorage / IndexedDB |
| App lifecycle | AppState, SplashScreen | visibilitychange, no splash |
| UI chrome | SafeAreaView, StatusBar, haptics | Standard CSS |
| Offline | expo-file-system + SQLite | Service Worker + Cache API |
| Install | App Store / Play Store | PWA "Add to Home Screen" |

### 2.3 External APIs
| API | Purpose | Auth | Base URL |
|-----|---------|------|----------|
| Aladhan | Prayer times by city/coords, Hijri date, calculation methods | None (free, no key) | `https://api.aladhan.com/v1/` |
| AlQuran Cloud | Quran Arabic text + translations, surah metadata | None (free, no key) | `https://api.alquran.cloud/v1/` |

### 2.4 Data Storage Strategy
**v1: Device-local only**
- Abstract all persistence behind a `StorageService` interface
- Implementations: `LocalStorageAdapter` (web), `SQLiteAdapter` (mobile)
- All data models include `id`, `createdAt`, `updatedAt` fields for future sync

**v2 (future): Cloud sync**
- Add `FirebaseAdapter` or `SupabaseAdapter` implementing same `StorageService` interface
- User auth (Google/Apple sign-in)
- Conflict resolution: last-write-wins with timestamps
- No v1 code changes required — just swap the adapter

---

## 3. Feature Requirements

### 3.1 Enhanced Quran Reader

#### 3.1.1 Surah Navigation
- **FR-Q1:** Dropdown selector listing all 114 surahs (English name, Arabic name, ayah count)
- **FR-Q2:** Selecting a surah loads it fresh from the API (Arabic + English Sahih translation)
- **FR-Q3:** Previous/Next surah buttons for sequential reading

#### 3.1.2 Scrollable Ayah Display
- **FR-Q4:** On surah load, display the first 10 ayahs in a scrollable container
- **FR-Q5:** Each ayah block shows: Arabic text (RTL, gold), English translation (LTR, muted), ayah number + surah reference
- **FR-Q6:** "Load 10 More" button appends next 10 ayahs from the cached surah data
- **FR-Q7:** Progress indicator showing `Showing X of Y ayahs · Z% loaded`
- **FR-Q8:** "Load 10 More" button hides when all ayahs are displayed

#### 3.1.3 Auto-Save Reading Position
- **FR-Q9:** IntersectionObserver (60% threshold) tracks which ayah is currently in view
- **FR-Q10:** Current ayah receives a visual highlight (green border)
- **FR-Q11:** Position auto-saves to local storage: `{ surah, ayahNum, timestamp }`
- **FR-Q12:** On app reload, display resume banner: "Last read: [Surah Name] — Ayah [N]" with a "Resume" button
- **FR-Q13:** Resume button loads the saved surah, paginates enough ayahs, and smooth-scrolls to the exact position

#### 3.1.4 Bookmark System
- **FR-Q14:** Every ayah has a bookmark button (star icon, top-right)
- **FR-Q15:** Tapping the bookmark button prompts for an optional label (e.g., "Dua before sleep") and saves to `quranBookmarks` in local storage
- **FR-Q16:** Bookmarked ayahs show the star in a distinct active color (orange)
- **FR-Q17:** Bookmark Manager section below the Quran reader listing all saved bookmarks
- **FR-Q18:** Each bookmark entry shows: label, surah name, ayah number, "Go to" button, delete button
- **FR-Q19:** "Go to" loads the correct surah, paginates to the ayah, and scrolls to it
- **FR-Q20:** Bookmarks and auto-save position are stored separately — bookmarks are permanent, position is transient

---

### 3.2 Smart Prayer Times

#### 3.2.1 Location Detection
- **FR-P1:** On first launch, request GPS permission and auto-detect city/country via device geolocation
- **FR-P2:** Pass coordinates to Aladhan API (`/timings/{lat},{long}`) for precise results
- **FR-P3:** Fallback: manual city/country input fields (pre-filled with detected location if available)
- **FR-P4:** Save last-used location to local storage; use on next load without re-prompting

#### 3.2.2 Prayer Display
- **FR-P5:** Display all 6 prayer times: Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha
- **FR-P6:** Highlight the next upcoming prayer with a distinct badge ("Next")
- **FR-P7:** Countdown timer showing time remaining until the next prayer (e.g., "2h 15m until Asr")
- **FR-P8:** Display Hijri date from API response (weekday, day, month, year AH)

#### 3.2.3 Calculation Methods
- **FR-P9:** Dropdown to select calculation method with at least these options:
  - University of Islamic Sciences, Karachi (1)
  - ISNA — North America (2)
  - Muslim World League (3)
  - Umm Al-Qura, Makkah (4)
  - Egyptian General Authority (5)
  - Gulf Region (8)
  - Diyanet — Turkey (15)
- **FR-P10:** Selected method persists in local storage
- **FR-P11:** Changing method immediately re-fetches prayer times

#### 3.2.4 Notifications
- **FR-P12:** Request notification permission on first load
- **FR-P13:** Schedule a push notification for each prayer time (fires at the exact minute)
- **FR-P14:** Notification content: prayer name + time (e.g., "Time for Fajr — 05:15")
- **FR-P15:** Re-schedule daily (fetch fresh times at midnight or on app open)

#### 3.2.5 Adhan Audio (Optional Enhancement)
- **FR-P16:** Option to play a short adhan audio clip when a prayer notification fires
- **FR-P17:** User toggle to enable/disable adhan audio per prayer

---

### 3.3 Custom Reminders System

#### 3.3.1 CRUD Operations
- **FR-R1:** Create reminder with: title (required), date/time (optional), repeat mode (none / daily / weekly)
- **FR-R2:** Edit existing reminder (title, time, repeat)
- **FR-R3:** Delete reminder with confirmation
- **FR-R4:** Toggle complete/incomplete status (checkbox)
- **FR-R5:** Completed reminders show strikethrough text with muted styling

#### 3.3.2 Display
- **FR-R6:** List all reminders sorted by due time (upcoming first), then untimed
- **FR-R7:** Each entry shows: title, due date/time (or "No time set"), repeat badge, complete checkbox, delete button
- **FR-R8:** Empty state: friendly message ("No reminders yet")

#### 3.3.3 Notifications
- **FR-R9:** If a reminder has a due time, schedule a push notification at that time
- **FR-R10:** Notification content: reminder title + "Time for your activity!"
- **FR-R11:** Repeating reminders re-schedule automatically after firing (daily: +24h, weekly: +7d)
- **FR-R12:** Tapping the notification opens the app to the reminders section

#### 3.3.4 Data Model
```typescript
interface Reminder {
  id: string;
  title: string;
  dueTime: number | null;    // Unix timestamp ms, null if untimed
  repeat: 'none' | 'daily' | 'weekly';
  complete: boolean;
  createdAt: number;
  updatedAt: number;
}
```

---

### 3.4 Offline & PWA Support

#### 3.4.1 Service Worker (Web)
- **FR-O1:** Register a service worker on first web visit
- **FR-O2:** Cache static assets (HTML, CSS, JS, icons) for offline shell loading
- **FR-O3:** Cache last-fetched API responses (prayer times, current surah) with a stale-while-revalidate strategy
- **FR-O4:** When offline, serve cached data with a subtle "Offline — showing cached data" indicator

#### 3.4.2 PWA Manifest (Web)
- **FR-O5:** Provide `manifest.json` with: app name, short name, icons (192px, 512px), theme color (#1e7e5a), background color (#0f1b2d), display: standalone, start_url
- **FR-O6:** App is installable via Chrome/Safari "Add to Home Screen"

#### 3.4.3 Mobile Offline
- **FR-O7:** On mobile, cache prayer times and last-loaded surah in SQLite/AsyncStorage
- **FR-O8:** If network request fails, fall back to cached data with an offline indicator
- **FR-O9:** Quran bookmarks, reminders, and reading position always available offline (local storage)

---

## 4. UI / UX Requirements

### 4.1 Design System
- **Dark theme** as primary (matching existing prototype palette)
  - Background: `#0f1b2d`
  - Card: `#172033`
  - Accent: `#3ecf8e` (green)
  - Gold: `#f5c542` (Arabic text, prayer times)
  - Text: `#e2e8f0`
  - Muted: `#94a3b8`
- Light theme toggle: **out of scope for v1** (design with future toggle in mind)

### 4.2 Layout
- **Mobile:** Single-column, tab-based navigation (Dashboard / Quran / Reminders)
- **Web (wide):** Responsive grid layout — cards rearrange from 1 to 2-3 columns based on viewport
- **Dashboard tab:** Prayer times card + Quran "continue reading" card + upcoming reminders summary
- **Quran tab:** Full reader with surah selector, scrollable ayahs, bookmarks
- **Reminders tab:** Full reminder list with create form

### 4.3 Typography
- Arabic text: Large, RTL, gold color, appropriate Arabic-supporting font (e.g., Amiri or system Arabic)
- English text: System sans-serif (Segoe UI / SF Pro / Roboto based on platform)
- Monospace font not needed

### 4.4 Accessibility
- Minimum contrast ratio: 4.5:1 for body text
- All interactive elements keyboard/screen-reader accessible
- RTL support for Arabic content sections

---

## 5. Non-Functional Requirements

### 5.1 Performance
- **NFR-1:** Initial load < 3 seconds on 3G connection (web)
- **NFR-2:** API calls parallelized (prayer times + Quran fetched concurrently)
- **NFR-3:** Quran pagination (10 ayahs at a time) to avoid rendering 286 ayahs at once for long surahs
- **NFR-4:** Mobile app cold start < 2 seconds

### 5.2 Reliability
- **NFR-5:** Graceful degradation when APIs are unreachable (show cached data)
- **NFR-6:** No data loss — all local writes confirmed before UI updates
- **NFR-7:** Notification scheduling survives app restarts (mobile: expo-notifications persistence, web: service worker)

### 5.3 Privacy
- **NFR-8:** No user tracking or analytics in v1
- **NFR-9:** Location data used only for prayer time API calls, never stored on any server
- **NFR-10:** All user data (bookmarks, reminders, position) stored on-device only

### 5.4 Maintainability
- **NFR-11:** TypeScript strict mode across all packages
- **NFR-12:** Shared business logic tested with Jest (unit tests for API clients, storage, utils)
- **NFR-13:** ESLint + Prettier enforced via pre-commit hooks

---

## 5A. Expanded Daily Practice Requirements (v1.1 candidate — captured, not scoped)

Source: handwritten list (`non-heic.png`, captured 2026-04-21). These items extend the MVP toward a fuller daily Islamic practice tracker. **Status: requirements capture only — no implementation decisions.**

### 5A.1 Salah & Post-Salah

- **FR-EX1: Five Salah visual pie chart** — dashboard widget showing which of the 5 daily fard prayers have been marked complete today, rendered as a pie/ring chart (5 equal segments filling as prayers are logged).
- **FR-EX2: Post-Salah tasbih counter (33× × 3)** — after each fard prayer, prompt/allow the user to count:
  - Subhanallah × 33
  - Alhamdulillah × 33
  - Allahu Akbar × 33
  Tap-to-increment counter UI, per-salah persistence, haptic feedback on mobile, automatic advance between the three phrases.
- **FR-EX3: Salat Ad-Duha (2 rakah)** — **pre-seeded default daily reminder** (not a net-new feature). Ships as a built-in reminder in the catalog (§5A.6 consequence), repeat = daily, window = after sunrise → before Dhuhr (prayer-anchored). User can toggle off but not delete.
- **FR-EX4: Post-Maghrib 2 rakah sunnah** — **pre-seeded default daily reminder** (not a net-new feature). Built-in reminder, repeat = daily, prayer-anchored to Maghrib. User can toggle off but not delete.

### 5A.2 Quran Daily Practice

- **FR-EX5: Daily Quran reading goal (30 minutes)** — time-based goal with today's elapsed reading time tracked (timer integrated with the embedded reader from §3.1).
- **FR-EX6: Surah Kahf on Friday** — **pre-seeded default weekly reminder** (not a net-new feature). Built-in reminder, repeat = weekly, weekdays = [5] (Friday), `actionLink` = in-app Quran reader at Surah 18. User can toggle off but not delete.
- **FR-EX7: Surah Mulk (before sleep)** — **pre-seeded default daily reminder** (not a net-new feature). Built-in reminder, repeat = daily, category = "bedtime", `actionLink` = Quran reader at Surah 67.
- **FR-EX8: Surah Sajdah (before sleep)** — **pre-seeded default daily reminder** (not a net-new feature). Built-in reminder, repeat = daily, category = "bedtime", `actionLink` = Quran reader at Surah 32.
- **FR-EX9: One ayah a day memorization** — surfaces a single ayah each day (rotation or user-selected), tracked as memorized/reviewing.
- **FR-EX10: One hadith a day** — surfaces a single hadith each day from a local dataset (source TBD — Riyad as-Salihin / 40 Nawawi / etc.).

### 5A.3 Adhkar Routines (Hisnul Muslim integration)

External app strategy: the user relies on **Dua & Zikr - Hisnul Muslim** (App Store ID `1402550533`) for full adhkar text, audio, and tasbih counting. This dashboard should **not** reimplement the 326-dua corpus. Instead it tracks *whether* routines were completed and deep-links out when the user taps through.

- **FR-EX11: Morning Adhkar** — checklist item + deep-link to Hisnul Muslim morning section.
- **FR-EX12: Evening Adhkar** — checklist item + deep-link to Hisnul Muslim evening section.
- **FR-EX13: Before-sleep adhkar** — checklist item + deep-link to Hisnul Muslim sleep section.
- **FR-EX14: Waking-up adhkar** — checklist item + deep-link to Hisnul Muslim waking section.
- **FR-EX15: Friday-after-Asr adhkar** — day-gated (Friday only), deep-link to Hisnul Muslim.

### 5A.4 Weekly Sunnah

- **FR-EX16: Thursday fasting** — day-gated checklist on Thursdays, tracks completion history.
- **FR-EX17: Friday nail cutting** — day-gated checklist on Fridays.
- **FR-EX18: Friday perfume & good dress** — day-gated checklist on Fridays.

### 5A.5 Hisnul Muslim — Adhkar Storage Model (analysis)

Analysis of how the reference app (`https://apps.apple.com/us/app/dua-zikr-hisnul-muslim/id1402550533`) organizes adhkars, to inform our deep-link contract and inspire our own routine-tracking model.

**Category taxonomy (~20+ categories):**
Salah · Morning & Evening · Sleep · Ramadan · Fasting · Quranic Duas · Food & Drink · Illness · Death · Ruqyah · Seeking Refuge · Social Manners · Family · Rizq · Gratitude · Repentance · Purification · Clothes · Hajj · Umrah · Travel · Nature.

**Per-dua content fields:**
- Arabic text
- Transliteration
- Translation
- Benefits / virtues
- Source citation (Quran / Hadith reference)
- Audio recitation
- Shareable image

**Per-dua interaction state:**
- Favorite / bookmark flag
- Tasbih counter (repetition count, e.g., "say 3 times", "say 33 times")
- Font size preference (pinch-zoom)

**Navigation & discovery:**
- Expandable chapter listing (category → list of duas)
- Swipeable horizontal navigation between adjacent duas within a category
- Search with highlighting across the full corpus
- Copy / share individual duas (text + audio + image)

**Inferred data model:**
```
Category (id, name, order)
  └── Dua (id, categoryId, order, arabic, transliteration, translation, benefits, source, audioUrl, repetitionCount)
         └── UserState (duaId, isFavorite, lastRead, customFontSize)
```

**Implications for this dashboard:**
- We do **not** store adhkar text — we store *routine completion* keyed by category (morning / evening / sleep / waking / friday-post-asr).
- Deep-link contract: investigate whether Hisnul Muslim exposes a URL scheme (e.g. `hisnulmuslim://category/morning`) or if we fall back to opening the App Store listing / home screen.
- Our tasbih counter (FR-EX2) is **independent** of Hisnul Muslim's counter — it tracks post-salah dhikr in-app for integration with the salah pie chart.
- Fallback UX if Hisnul Muslim is not installed: show "Open in Hisnul Muslim" button → if URL scheme fails, offer App Store install link + plain-text fallback of the routine's key phrases.

### 5A.5b Reclassification: FR-EX3/4/6/7/8 → pre-seeded default reminders (2026-04-21)

User directive: Salat Ad-Duha (FR-EX3), post-Maghrib 2 rakah (FR-EX4), Surah Kahf on Friday (FR-EX6), Surah Mulk (FR-EX7), and Surah Sajdah (FR-EX8) are **not** net-new features — they are **default entries in the built-in reminder catalog** (§5A.6). They require only:
1. The Reminder-model extensions already listed in §5A.6 (weekdays, actionLink, builtIn, prayerAnchor).
2. A seed entry per item in `packages/shared/data/builtInReminders.ts`.
3. No bespoke UI, no dedicated domain entity, no new hook.

Impact: collapses 5 of the 18 FR-EX items into pure catalog data once the Reminder refactor lands. Combined with the 7 other ✅ items in the §5A.6 table (FR-EX9–18 excluding EX19+), **12 of 18 FR-EX items become zero-code-feature seeds** — only the Reminder refactor + content-rotation primitive remain.

### 5A.6 Consolidation insight — most FR-EX items collapse into "sticky reminders"

On review of §3.3 (Custom Reminders) vs §5A.1–5A.4, a large fraction of the 18 handwritten items do **not** need bespoke features. They are fundamentally *pre-seeded recurring reminders* keyed by day-of-week or time-of-day:

| FR-EX | Reducible to a sticky reminder? | Notes |
|-------|--------------------------------|-------|
| FR-EX3 Duha | ✅ daily reminder, window sunrise→Dhuhr | needs prayer-time-anchored scheduling |
| FR-EX4 Post-Maghrib 2 rakah | ✅ daily reminder, anchored to Maghrib | prayer-anchored |
| FR-EX5 Quran 30 min goal | ⚠️ hybrid — reminder + timer integration | daily reminder + session timer state |
| FR-EX6 Kahf Friday | ✅ weekly reminder (Friday) | deep-link into reader |
| FR-EX7 Mulk sleep | ✅ daily reminder (bedtime) | deep-link into reader |
| FR-EX8 Sajdah sleep | ✅ daily reminder (bedtime) | deep-link into reader |
| FR-EX9 Ayah of the day | ✅ daily reminder | content rotation |
| FR-EX10 Hadith of the day | ✅ daily reminder | content rotation |
| FR-EX11–14 Adhkar routines | ✅ daily reminders | see §5B.3 (now imported, not deep-linked) |
| FR-EX15 Friday-post-Asr adhkar | ✅ weekly reminder (Friday) | |
| FR-EX16 Thursday fasting | ✅ weekly reminder (Thursday) | |
| FR-EX17 Friday nail cutting | ✅ weekly reminder (Friday) | |
| FR-EX18 Friday perfume & dress | ✅ weekly reminder (Friday) | |
| FR-EX1 Five Salah pie chart | ❌ bespoke visualization | reads salah log, not a reminder |
| FR-EX2 Post-salah tasbih 33×3 | ❌ bespoke counter UI | prayer-anchored dhikr primitive |

**Architectural consequence:** The Reminder model (FR-R1–R12) needs extension to support:
- **Pre-seeded / built-in reminders** — user can enable/disable but not delete (or can hide but not remove from catalog).
- **Day-of-week repeat mode** — current repeat is `none | daily | weekly` with no day selector; need `weekday: 0–6` or `weekdays: number[]` for "Friday only" / "Thursday only".
- **Prayer-anchored scheduling** — reminders whose trigger is relative to a prayer time (e.g. "15 min after Maghrib") rather than a wall-clock time.
- **Action/deep-link payload** — a reminder may link to an in-app surface (Quran reader at Surah 18, adhkar detail screen) rather than just showing text.
- **Category/group** — to render "Bedtime routine" as a bundle, reminders need a `category` field.

### 5A.7 Open Questions (for future planning, not v1)

- Does Hisnul Muslim expose a deep-link URL scheme? (needs device-level investigation)
- Should the daily hadith (FR-EX10) be a bundled static dataset or fetched from an API (e.g. sunnah.com)?
- Reset semantics for day-gated items — local midnight vs. Fajr vs. user-configurable?
- Should completion history be visualized (streak, heatmap) or kept as simple today-only state?
- Does the tasbih counter (FR-EX2) auto-advance between the three phrases at 33, or require manual tap-to-next?

---

## 5B. Updated Requirements (from `raw-updated-reqs.md`, 2026-04-21)

Three new directives from the user that **supersede or extend** earlier decisions. Captured here; no implementation yet.

### 5B.1 Full-Quran offline cache (permission-gated)

- **FR-EX19: Full Quran local cache on explicit opt-in** — on first load, prompt the user with a permission dialog. If accepted, bulk-download all editions × 114 surahs to the platform storage port and serve subsequent reads cache-first.
- **Supersedes:** `FR-O3` stale-while-revalidate model for the Quran reader — once the corpus is present, Quran reads are **cache-first**, not network-first.
- **Consent UX:** dismissible (session-only) or permanent decline. Declining keeps §3.4 stale-while-revalidate path active.
- **Editions cached (scaffolded 2026-04-22):**
  - `ar-uthmani` — Arabic Uthmani (AlQuran.cloud `quran-uthmani`)
  - `en-sahih` — Saheeh International (AlQuran.cloud `en.sahih`)
  - `en-khattab` — The Clear Quran, Mustafa Khattab (fawazahmed0/quran-api JSDelivr CDN `eng-mustafakhattaba`)
  - `bn-muhiuddin` — Bengali, Muhiuddin Khan (AlQuran.cloud `bn.bengali`)
- **IndoPak rendering is a font swap, not a cached edition.** The Quran Reader's script selector toggles `data-quran-script="indopak"` on `<html>`, which flips the `--quran-arabic-font` CSS variable. No extra download.
- **Scaffold status (2026-04-22):** Port `QuranOfflineCorpus` + web IndexedDB adapter (via `idb-keyval`) landed. `useQuran` accepts an optional corpus; `QuranReader` passes it. `QuranCorpusConsent` component handles the one-time prompt + silent re-hydrate after ITP eviction. Mobile adapter deferred to Phase 4.
- **Mobile note:** On mobile, the corpus payload will live on `expo-file-system` (not AsyncStorage) due to size.

### 5B.2 Weekly reminders recap & completion visualization

Extends §3.3 Custom Reminders with analytics:

- **FR-EX20: Weekly view of reminders** — a new screen (or dashboard widget) showing the current week's reminders, grouped by day, with completed vs. missed status for each.
- **FR-EX21: Weekly completion %** — aggregate metric across all reminders due this week: "X / Y activities completed this week (N%)".
- **FR-EX22: Daily recap on each day's row** — e.g., "Monday: 7/10 activities completed today" shown inline in the weekly grid.
- **Data dependency:** requires each reminder to carry a completion history (`completions: { date: string; completedAt: number }[]`), not just a boolean `complete` — the current §3.3.4 model must be extended (see §5C architecture notes).

### 5B.3 Hisnul Muslim adhkars — imported, not deep-linked

**Reversal of §5A.3 strategy.** Earlier capture assumed deep-link-out to the Hisnul Muslim app. User has clarified: *only the adhkar content* should be imported into this app and work fully offline. The full Hisnul Muslim app (audio, search, categories beyond daily adhkars) is NOT to be reimplemented.

- **FR-EX23: Import adhkar corpus for the daily routines** — bundle into `packages/shared/src/data/adhkar/` the Arabic + translation + repetition count for the adhkar categories the dashboard actually surfaces:
  - Morning adhkar
  - Evening adhkar
  - Before-sleep adhkar
  - Waking-up adhkar
  - Friday-after-Asr adhkar (deferred to v1.1b)
  - Post-salah adhkar (deferred to v1.1b — ships alongside FR-EX2 tasbih counter)
- **FR-EX24: In-app adhkar reader** — tap a routine → see list of its adhkars → each with Arabic / translation / count / tap-to-count tasbih. No audio, no search, no shareable images. Works offline.
- **FR-EX25: Licensing** — adhkar text is public-domain (Quran / sahih hadith), but transliteration & translation are editorial. Bundled content must attribute source and respect open licensing. Darussalam editions (including Mohiuddin Khan / Abu Bakr Zakaria Bengali translations) are NOT redistributable.

**Shipped status (2026-04-22, v1.1a):** `packages/shared/src/models/adhkar.ts` + `packages/shared/src/data/adhkar/` with four routine files (morning, evening, sleep, waking) plus `LICENSES.md` and `ADHKAR_INVENTORY.md` (repo root) as the locked curator worklist.

**14 Quran-referenced entries ship with full inline Arabic + three translations** (Sahih International, Mustafa Khattab "The Clear Quran", Bengali Muhiuddin Khan) — populated once via `packages/shared/scripts/populate-quran-text.mjs` from AlQuran.cloud and the fawazahmed0 CDN, then bundled into the JS output. The adhkar reader works fully offline from first app install with no consent prompt or corpus dependency.

**51 hadith-derived entries remain pending** per the locked inventory in `ADHKAR_INVENTORY.md`. Curator pass sources each from sunnah.com (CC-BY 3.0) or Seen-Arabic/Morning-And-Evening-Adhkar-DB (MIT). Bengali for hadith entries is blocked on sourcing — no permissive Bengali Hisnul Muslim corpus has been identified; reader falls back to English via `pickTranslation`.

`useAdhkarRoutine(id)` hook (synchronous, no corpus) + `pickTranslation(dua, preferred)` helper with fallback hierarchy + `/adhkar/:routine` route with per-language selector land in the web package. Mobile UI follows in Phase 4; the bundled JSON is shared unchanged.

- **Supersedes §5A.3** and parts of §5A.5: we no longer need a deep-link contract to Hisnul Muslim; drop open question "does Hisnul Muslim expose a URL scheme?". The Hisnul Muslim *data model* analysis in §5A.5 now informs our **own** data model, not an external integration.

---

## 5C. Consolidated Architectural Implications (for backend-architect review)

Summarizing what the combined v1 + §5A + §5B scope demands of the existing hexagonal architecture:

1. **Reminder model extension** (§5A.6 + §5B.2) — add `weekdays`, `category`, `actionLink`, `builtIn`, `completions[]`, `prayerAnchor?` fields. Breaks the simple §3.3.4 model.
2. **Pre-seeded reminder catalog** — new concept: reminders shipped with the app, user can toggle but not delete.
3. **Prayer-anchored scheduling** — NotificationOrchestrator currently schedules absolute times; needs to resolve "15 min after Maghrib" dynamically as prayer times change day-to-day.
4. **Full-Quran offline cache** (§5B.1) — new port concern: bulk-download + integrity check + cache-first reads. Current two-tier API cache is designed for small payloads, not ~8 MB bundles.
5. **Adhkar data module** (§5B.3) — new bundled dataset, new read model, new tasbih state per adhkar per day.
6. **Salah log & tasbih log** (FR-EX1, FR-EX2) — new domain entities: per-day salah completion (5 booleans + optional sunnah), per-day tasbih counts per salah per phrase.
7. **Weekly analytics view** (§5B.2) — new read model / aggregator over reminder completion history.
8. **Content rotation primitive** (FR-EX9, FR-EX10) — deterministic daily selection of ayah/hadith from a dataset, seeded by date so the same day always shows the same content even if the app is reopened.

---

## 6. Out of Scope (v1)

The following are explicitly **not** in v1 but may be added in future versions:
- User accounts and cloud sync (v2 — storage layer is pre-architected)
- Qibla compass
- Dhikr / Tasbeeh counter
- Hadith of the Day
- Light theme toggle
- Multiple Quran translations (v1 is Arabic + English Sahih only)
- Audio recitation of Quran ayahs
- Social features (sharing ayahs, community)
- Widget support (iOS/Android home screen widgets)
- Apple Watch / Wear OS companion

---

## 7. Glossary

| Term | Definition |
|------|-----------|
| Ayah | A verse of the Quran |
| Surah | A chapter of the Quran (114 total) |
| Hijri | The Islamic lunar calendar |
| Fajr | Pre-dawn prayer |
| Dhuhr | Noon prayer |
| Asr | Afternoon prayer |
| Maghrib | Sunset prayer |
| Isha | Night prayer |
| Adhan | The Islamic call to prayer |
| Dhikr | Remembrance of Allah through repeated phrases |
| Tasbeeh | Counting dhikr, traditionally with prayer beads |
| Qibla | Direction of the Kaaba in Mecca (faced during prayer) |
| PWA | Progressive Web App |
| EAS | Expo Application Services (cloud build service) |
