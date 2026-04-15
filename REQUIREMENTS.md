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
