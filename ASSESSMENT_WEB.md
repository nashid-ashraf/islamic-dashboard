# Web Deployment Assessment — Islamic Dashboard PWA

**Date:** 2026-04-15
**Scope:** Web platform build, deployment, offline, and cross-platform code sharing

---

## 1. PWA Build Pipeline: Expo Web vs Standalone React App

### Option A: Expo Web (react-native-web)

| Factor | Detail |
|--------|--------|
| How it works | Expo's bundler (Metro) compiles React Native components to DOM via `react-native-web`. You run `npx expo export --platform web` to produce a static bundle. |
| Pros | Single component tree for mobile + web. Shared navigation (Expo Router supports web). Huge code reuse — potentially 90%+. No separate webpack/Vite config. |
| Cons | Bundle size overhead (~40-60 KB gzipped for react-native-web runtime). Some RN primitives behave subtly differently on web. Service worker setup requires manual ejection from the default Expo web config. Limited control over HTML template and meta tags without customization. Expo Router's web support is stable but less mature than React Router for web-specific patterns. |

### Option B: Standalone React App in `packages/web/`

| Factor | Detail |
|--------|--------|
| How it works | A Vite + React app in `packages/web/` that imports shared logic from `packages/shared/`. UI components are web-native (plain React + CSS). |
| Pros | Full control over bundler, HTML, service worker, PWA manifest. Smallest possible bundle (no react-native-web overhead). Mature PWA tooling (vite-plugin-pwa / Workbox). Web-optimized CSS (Tailwind, CSS modules, etc.). Simpler mental model — web code is just React. |
| Cons | UI components are not shared with mobile — you write web-specific `<div>`s instead of `<View>`s. ~20-30% more UI code to maintain. Two component libraries to keep visually consistent. |

### Recommendation: Option B — Standalone Vite + React in `packages/web/`

**Rationale:**

The requirements document already allocates ~20% platform-specific code and explicitly lists different UI concerns per platform (SafeAreaView vs CSS, Expo Router vs React Router, etc.). The shared value lives in `packages/shared/` (API clients, hooks, models, storage interfaces, utils) — this is where 80% of the logic is, and it works identically in both approaches.

For web specifically, the PWA requirements (service worker, manifest, offline caching, Web Push) demand fine-grained control that Expo Web makes harder, not easier. Expo Web's service worker story requires Workbox injection into a Metro-generated bundle, which is fragile. Vite's `vite-plugin-pwa` (built on Workbox) is battle-tested and gives you a `sw.js` with full control.

The bundle size argument seals it: react-native-web adds ~50 KB gzipped of runtime for mapping `<View>` to `<div>` — overhead that buys nothing when you are writing `<div>` directly.

**Concrete structure:**

```
packages/web/
├── index.html              # Entry point with PWA meta tags
├── vite.config.ts          # Vite + vite-plugin-pwa
├── tsconfig.json           # Extends ../../tsconfig.base.json
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── icons/              # 192px, 512px, maskable
│   └── favicon.ico
├── src/
│   ├── main.tsx            # React entry, SW registration
│   ├── App.tsx             # Router shell
│   ├── pages/              # Dashboard, Quran, Reminders
│   ├── components/         # Web-specific UI components
│   ├── hooks/              # Thin wrappers around shared hooks (if needed)
│   ├── services/
│   │   ├── notifications.ts  # Web Push API wrapper
│   │   └── geolocation.ts    # navigator.geolocation wrapper
│   └── styles/             # CSS modules or Tailwind config
└── sw/
    └── service-worker.ts   # Custom SW logic (Workbox)
```

---

## 2. Service Worker Strategy

### Tool: Workbox via `vite-plugin-pwa`

Use `vite-plugin-pwa` with `injectManifest` mode (not `generateSW`). This gives you a custom service worker file where you control every caching decision, while Workbox still handles the precache manifest injection.

### What to Cache

| Asset Type | Strategy | Rationale |
|------------|----------|-----------|
| **App shell** (HTML, JS, CSS, icons) | **Precache** (build-time manifest) | These are versioned at build time. Workbox precaches them and serves from cache on every load. Updates happen in the background. |
| **Google Fonts / Amiri font** | **Cache-first**, max-age 1 year | Fonts rarely change. Cache them aggressively. |
| **Aladhan prayer times** (`/v1/timingsByCity`, `/v1/timings/`) | **Stale-while-revalidate**, TTL 6 hours | Prayer times change daily but not within the day. Serve cached instantly, revalidate in background. Key: cache key should include `city+country+method+date` so today's response does not collide with tomorrow's. |
| **AlQuran surah data** (`/v1/surah/{n}`, `/v1/surah/{n}/en.sahih`) | **Cache-first**, no expiration | Quran text never changes. Once cached, a surah stays cached forever. This also satisfies the offline requirement — the user's last-read surah is always available. |
| **Aladhan Hijri date** (embedded in prayer response) | Same as prayer times — comes in the same response. |

### Cache Invalidation

- **Static assets:** Workbox precache handles this automatically. Each build produces a new manifest hash; old assets are evicted when the new SW activates.
- **Prayer times:** Use a Workbox `ExpirationPlugin` with `maxAgeSeconds: 21600` (6 hours). The stale-while-revalidate strategy serves the cached version immediately and fetches a fresh one in the background. The next page load gets the fresh data.
- **Quran data:** No expiration needed. The Quran does not change. If storage pressure occurs (rare), the browser will evict least-recently-used caches. To guard against this on iOS, store the most important surahs (user's bookmarked and last-read) in IndexedDB as a secondary backup.

### Concrete Workbox Config

```typescript
// sw/service-worker.ts
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Precache app shell (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST);

// Aladhan API — stale-while-revalidate, 6h TTL
registerRoute(
  ({ url }) => url.origin === 'https://api.aladhan.com',
  new StaleWhileRevalidate({
    cacheName: 'aladhan-api',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxAgeSeconds: 6 * 60 * 60, maxEntries: 30 }),
    ],
  })
);

// AlQuran API — cache-first, no expiration
registerRoute(
  ({ url }) => url.origin === 'https://api.alquran.cloud',
  new CacheFirst({
    cacheName: 'alquran-api',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 120 }), // 114 surahs * 2 (ar + en) ≈ 228, keep 120 most recent
    ],
  })
);
```

### Offline Indicator

When a fetch fails and the SW serves from cache, set a response header (`X-From-Cache: true`) or use the `navigator.onLine` event in the app to display:

> "Offline — showing cached data"

as a subtle top banner.

---

## 3. Hosting & Deployment Options

### Comparison

| Factor | **Cloudflare Pages** | Vercel | Netlify | GitHub Pages |
|--------|---------------------|--------|---------|--------------|
| **Free tier** | Unlimited sites, 500 builds/mo, unlimited bandwidth | 100 GB bandwidth/mo, 100 builds/hr | 100 GB bandwidth/mo, 300 build min/mo | Unlimited for public repos, 100 GB bandwidth/mo |
| **Custom domain** | Yes, free | Yes, free | Yes, free | Yes (manual DNS) |
| **HTTPS** | Automatic (Cloudflare cert) | Automatic (Let's Encrypt) | Automatic (Let's Encrypt) | Automatic (Let's Encrypt) |
| **CDN** | Cloudflare's global edge (300+ cities) — fastest | Vercel Edge (limited PoPs) | Netlify CDN (decent) | GitHub/Fastly CDN (good) |
| **CI/CD** | Git push triggers build | Git push triggers build | Git push triggers build | GitHub Actions (manual setup) |
| **Monorepo support** | Root directory setting + build command | Root directory + `installCommand` override | Root directory + build command | Manual in workflow file |
| **Headers control** | `_headers` file (full control for cache, CSP) | `vercel.json` | `_headers` file | None (limited) |
| **Service worker** | Full support | Full support | Full support | Full support |
| **Build config** | `wrangler.toml` or dashboard | `vercel.json` | `netlify.toml` | `.github/workflows/*.yml` |
| **Preview deploys** | Yes, per PR | Yes, per PR | Yes, per PR | No (requires extra config) |

### Recommendation: Cloudflare Pages

**Rationale:**

1. **CDN performance:** Cloudflare's edge network is the largest in the world. For a dashboard used at prayer times (5x daily, time-sensitive), sub-100ms TTFB globally matters. Users in Bangladesh, Saudi Arabia, Turkey, Egypt, and North America (the likely audience based on the calculation methods offered) all get excellent latency.

2. **Truly unlimited free tier:** No bandwidth caps, no build minute anxiety. This is a personal/community project — cost should be zero.

3. **Headers control:** Critical for service workers. You need `Cache-Control` headers on `sw.js` to be `no-cache` (so the browser always checks for SW updates), while static assets get long `max-age`. Cloudflare Pages' `_headers` file gives full control.

4. **Preview deploys per PR:** Essential for verifying PWA behavior before merging.

5. **Cloudflare Workers (future):** If you ever need a push notification backend (VAPID server), you can add a Cloudflare Worker in the same project at zero cost.

**Setup:**

```toml
# wrangler.toml (optional — can also configure via dashboard)
name = "islamic-dashboard"
pages_build_output_dir = "packages/web/dist"

[build]
command = "npm run build:web"
```

```
# packages/web/public/_headers
/sw.js
  Cache-Control: no-cache

/assets/*
  Cache-Control: public, max-age=31536000, immutable
```

---

## 4. PWA Installation Flow

### Requirements for "Add to Home Screen" (A2HS)

#### Chrome on Android

Chrome shows the install prompt automatically when ALL of these are met:

1. Valid `manifest.json` with: `name`, `short_name`, `start_url`, `display` (must be `standalone`, `fullscreen`, or `minimal-ui`), at least one icon >= 192px, at least one icon >= 512px.
2. Served over HTTPS (Cloudflare Pages handles this).
3. Registered service worker with a `fetch` event handler.
4. User has visited the site at least twice, with at least 5 minutes between visits (this heuristic changes; the `beforeinstallprompt` event fires when Chrome is ready).

**Implementation:** Listen for `beforeinstallprompt`, prevent the default, and show a custom install banner:

```typescript
let deferredPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallBanner(); // Your custom UI
});

function handleInstallClick() {
  deferredPrompt?.prompt();
  deferredPrompt?.userChoice.then((result) => {
    if (result.outcome === 'accepted') hideInstallBanner();
    deferredPrompt = null;
  });
}
```

#### Safari on iOS (16.4+)

Safari does NOT fire `beforeinstallprompt`. The user must manually tap Share > Add to Home Screen. You cannot programmatically trigger this.

**What you can do:**
- Detect iOS Safari: `navigator.standalone === undefined && /iPhone|iPad/.test(navigator.userAgent)`
- Show a manual instruction banner: "Tap the Share button, then 'Add to Home Screen' to install this app."
- Detect if already running as PWA: `window.matchMedia('(display-mode: standalone)').matches` — hide the banner if true.

### iOS-Specific PWA Limitations (Critical)

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| **Web Push only on iOS 16.4+** | Users on iOS < 16.4 get no notifications at all. | Show a clear "Update iOS for notifications" message. |
| **Storage eviction after ~7 days of non-use** | If the user doesn't open the PWA for 7 days, Safari may delete all cached data (localStorage, IndexedDB, Cache API). | (1) Encourage daily use (prayer times are daily). (2) Store critical data (bookmarks, reminders) in IndexedDB with the `persistent` storage API: `navigator.storage.persist()`. (3) Show a re-sync message if data is lost. |
| **No background sync** | `SyncManager` / Background Sync API is not supported in Safari. You cannot schedule tasks to run when the PWA is closed. | Prayer notifications are the main concern — addressed via Web Push (see section 5). |
| **No `beforeinstallprompt`** | Cannot show a custom install button. | Manual instruction banner as described above. |
| **50 MB total storage** | Quran data for all 114 surahs (~15 MB JSON) fits, but be mindful. | Cache surahs on-demand, not all at once. |
| **No splash screen customization** | iOS uses `apple-touch-startup-image` meta tags, which are finicky. | Provide the required images in multiple sizes. Use `media` queries for each device. |

### Required Manifest

```json
{
  "name": "Islamic Daily Dashboard",
  "short_name": "Islamic Dashboard",
  "description": "Quran reader, prayer times, and daily reminders",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#1e7e5a",
  "background_color": "#0f1b2d",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Plus these meta tags in `index.html`:

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#1e7e5a" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

---

## 5. Web Push Notifications

### The Problem

The prototype uses `setTimeout` + `new Notification()` for prayer time alerts. This only works while the tab is open. Close the tab, and notifications stop. For a prayer times app, this is unacceptable — users need notifications even when the browser is closed.

### Two-Tier Approach

#### Tier 1: Local Scheduling (No Backend Required)

For **same-session** notifications (tab is open), continue using `setTimeout` as the prototype does. This covers the case where the user has the dashboard open during the day.

Enhancement: Use the service worker's `self.registration.showNotification()` instead of `new Notification()` — this ensures the notification appears even if the user has navigated away from the tab (but the SW is still alive).

```typescript
// In the service worker
self.addEventListener('message', (event) => {
  if (event.data.type === 'SCHEDULE_PRAYER') {
    const { prayer, time, delay } = event.data;
    setTimeout(() => {
      self.registration.showNotification(`Time for ${prayer}`, {
        body: time,
        icon: '/icons/icon-192.png',
        tag: `prayer-${prayer}`,
        requireInteraction: true,
      });
    }, delay);
  }
});
```

**Limitation:** `setTimeout` inside a service worker is unreliable. The browser can terminate the SW after ~30 seconds of inactivity. This is NOT a reliable notification mechanism.

#### Tier 2: Server-Sent Push (Backend Required, Recommended for v1)

For **background** notifications (tab closed, browser closed on Android), you need the Push API with a VAPID server.

**How it works:**

1. The web app subscribes the user to push notifications via `PushManager.subscribe()`.
2. The subscription (endpoint URL + keys) is sent to your backend.
3. Your backend sends push messages at prayer times using the Web Push protocol.
4. The service worker receives the push event and shows the notification — even if the browser is closed.

**Backend options (cheapest to most complex):**

| Option | Cost | Complexity | Recommendation |
|--------|------|------------|----------------|
| **Cloudflare Worker + Cron Trigger** | Free (100K requests/day) | Low | **Use this** |
| Supabase Edge Functions + pg_cron | Free tier | Medium | Good alternative |
| Self-hosted Node.js on Railway/Fly.io | Free tier | Medium | Overkill |
| Firebase Cloud Messaging (FCM) | Free | Medium | Adds Google dependency |

**Recommended: Cloudflare Worker**

Since we are already deploying to Cloudflare Pages, add a Cloudflare Worker that:

1. Stores push subscriptions in Cloudflare KV (free, key-value store).
2. Runs on a Cron Trigger every day at midnight (UTC) to fetch prayer times from Aladhan for each subscription's saved location.
3. Schedules push messages at each prayer time using `scheduler.wait()` (Cloudflare's built-in delay API) or by using multiple cron triggers at common prayer time windows.

Alternatively, a simpler approach: run the Worker every 15 minutes, check if any prayer time is within the next 15 minutes for any subscription, and send the push.

```typescript
// Cloudflare Worker (simplified)
import webpush from 'web-push';

export default {
  async scheduled(event, env, ctx) {
    const subscriptions = await env.PUSH_KV.list();
    const now = new Date();

    for (const key of subscriptions.keys) {
      const sub = await env.PUSH_KV.get(key.name, 'json');
      const prayerTimes = await fetchPrayerTimes(sub.location);

      for (const [prayer, time] of Object.entries(prayerTimes)) {
        if (isWithinNext15Minutes(time, now)) {
          await webpush.sendNotification(sub.pushSubscription, JSON.stringify({
            title: `Time for ${prayer}`,
            body: time,
          }));
        }
      }
    }
  },
};
```

**VAPID key generation:**

```bash
npx web-push generate-vapid-keys
```

Store the keys in Cloudflare Worker environment variables (secrets).

### iOS Safari Push — Specific Limitations

| Constraint | Detail |
|------------|--------|
| **Requires iOS 16.4+** | Older devices are completely excluded. |
| **User must install the PWA first** | Push permission can only be requested from a home-screen-installed PWA, not from Safari. |
| **User gesture required** | `PushManager.subscribe()` must be called from a click/tap handler, not on page load. |
| **No silent push** | Every push must show a visible notification. You cannot wake the SW silently. |
| **Provisional authorization not available** | Unlike native iOS apps, there is no "deliver quietly" trial — the user sees a full permission prompt. |
| **Badge API not supported** | You cannot update the app icon badge count from a push. |

**Practical impact:** Show a dedicated "Enable Notifications" button on the Reminders/Prayer card. When tapped, subscribe to push. Do not request permission on page load — it will be denied on iOS and will annoy users on all platforms.

---

## 6. CI/CD Pipeline

### Tool: GitHub Actions

GitHub Actions is the clear choice: free for public repos, 2,000 minutes/month for private repos, and Cloudflare Pages has an official GitHub Action.

### Workflow

```yaml
# .github/workflows/deploy-web.yml
name: Deploy Web

on:
  push:
    branches: [main]
    paths:
      - 'packages/web/**'
      - 'packages/shared/**'
  pull_request:
    branches: [main]
    paths:
      - 'packages/web/**'
      - 'packages/shared/**'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      - name: Typecheck shared
        run: npm run typecheck --workspace=packages/shared

      - name: Typecheck web
        run: npm run typecheck --workspace=packages/web

      - name: Lint
        run: npm run lint --workspace=packages/web

      - name: Test shared
        run: npm test --workspace=packages/shared

      - name: Build web
        run: npm run build --workspace=packages/web

      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v12
        with:
          uploadArtifacts: true
          configPath: ./lighthouserc.json

      - name: Deploy to Cloudflare Pages
        if: github.ref == 'refs/heads/main'
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy packages/web/dist --project-name=islamic-dashboard

      - name: Deploy preview
        if: github.event_name == 'pull_request'
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy packages/web/dist --project-name=islamic-dashboard --branch=${{ github.head_ref }}
```

### Key Points

- **Path filtering:** Only triggers when `packages/web/` or `packages/shared/` changes. Mobile-only changes do not trigger web deploys.
- **Lighthouse CI:** Runs on every PR to enforce performance budget (see section 7). Fails the check if scores drop below thresholds.
- **Preview deploys:** Every PR gets a unique preview URL (e.g., `pr-42.islamic-dashboard.pages.dev`) for testing.
- **Typecheck before build:** Catches type errors in shared code that could break the web build.

### Monorepo Build Order

Use npm workspaces (already in requirements). The `packages/shared` package should be built first (if it needs compilation), then `packages/web` imports from it.

In `package.json` at the root:

```json
{
  "workspaces": ["packages/*"],
  "scripts": {
    "build:shared": "npm run build --workspace=packages/shared",
    "build:web": "npm run build:shared && npm run build --workspace=packages/web",
    "build:mobile": "npm run build:shared && cd packages/mobile && npx expo export"
  }
}
```

If the project grows, swap `npm workspaces` scripts for **Turborepo** — it adds dependency-aware build ordering and caching. For v1 with 3 packages, npm workspaces is sufficient.

---

## 7. Performance Budget

### Bundle Size Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Total JS (gzipped)** | < 80 KB | Achievable with Vite + React (no react-native-web). React 18 is ~42 KB gzipped. Leaves ~38 KB for app code + dependencies. |
| **Initial CSS** | < 15 KB | Minimal — dark theme, a few card layouts, typography. |
| **First Contentful Paint** | < 1.5s on 4G | App shell renders from cache; data loads async. |
| **Time to Interactive** | < 3.0s on 3G | Per NFR-1 in requirements. |
| **Lighthouse Performance** | >= 90 | Enforce in CI. |
| **Largest Contentful Paint** | < 2.5s | The prayer times card or dashboard heading. |

### Code Splitting Strategy

Vite supports code splitting via dynamic `import()` out of the box. Split on **route boundaries**:

```typescript
// App.tsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const QuranReader = lazy(() => import('./pages/QuranReader'));
const Reminders = lazy(() => import('./pages/Reminders'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Router>
        <Route path="/" element={<Dashboard />} />
        <Route path="/quran" element={<QuranReader />} />
        <Route path="/reminders" element={<Reminders />} />
      </Router>
    </Suspense>
  );
}
```

This produces 3 chunks:
- **Main chunk:** React, router, shared utilities, app shell (~45 KB gzip)
- **Dashboard chunk:** Prayer card, continue-reading card (~8 KB gzip)
- **Quran chunk:** Surah selector, ayah renderer, bookmark manager (~15 KB gzip)
- **Reminders chunk:** CRUD form, reminder list (~8 KB gzip)

### Lazy Loading for Quran Module Specifically

The Quran reader is the heaviest feature:
- Surah metadata list (114 items, ~5 KB)
- Ayah rendering with Arabic RTL + English LTR
- IntersectionObserver logic for position tracking
- Bookmark CRUD

Strategy:
1. **Route-level split** (as above) — the Quran chunk only loads when the user navigates to `/quran`.
2. **Data-level pagination** — already in requirements (FR-Q4/Q6): load 10 ayahs at a time, "Load 10 More" button. This keeps DOM size small.
3. **Surah metadata prefetch** — The 114-surah dropdown list is small. Prefetch it on app load (not on route navigate) so the dropdown is instant:
   ```typescript
   // In main.tsx or Dashboard
   const prefetchSurahList = () => import('./data/surahList');
   requestIdleCallback(prefetchSurahList);
   ```
4. **Amiri font loading** — Load the Arabic font with `font-display: swap` so text renders immediately in the system Arabic font, then swaps when Amiri loads.

### Enforcement in CI

```json
// lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }],
        "categories:pwa": ["error", { "minScore": 0.9 }],
        "total-byte-weight": ["error", { "maxNumericValue": 250000 }],
        "interactive": ["error", { "maxNumericValue": 3000 }]
      }
    }
  }
}
```

---

## 8. Keeping Web Synced with Mobile — Shared Code Strategy

### Package Structure

```
packages/shared/
├── package.json          # "name": "@islamic-dashboard/shared"
├── tsconfig.json         # Extends ../../tsconfig.base.json
├── src/
│   ├── api/
│   │   ├── aladhan.ts        # Prayer times client
│   │   └── alquran.ts        # Quran client
│   ├── models/
│   │   ├── prayer.ts         # Prayer interfaces
│   │   ├── quran.ts          # Surah, Ayah interfaces
│   │   └── reminder.ts       # Reminder interface
│   ├── hooks/
│   │   ├── usePrayerTimes.ts # Fetches + caches prayer times
│   │   ├── useQuran.ts       # Surah loading, pagination, position tracking
│   │   └── useReminders.ts   # CRUD operations
│   ├── storage/
│   │   ├── types.ts          # StorageService interface
│   │   ├── localStorage.ts   # Web implementation ← platform-specific
│   │   ├── localStorage.web.ts   # (alternative naming, see below)
│   │   ├── sqliteStorage.native.ts
│   │   └── index.ts          # Re-exports the right one per platform
│   └── utils/
│       ├── dateHelpers.ts
│       ├── prayerTimeParser.ts
│       └── notifications.ts  # ← this one is tricky (see below)
└── index.ts              # Barrel export
```

### How Imports Work

Both `packages/web/` and `packages/mobile/` list `@islamic-dashboard/shared` as a dependency in their `package.json`. npm workspaces resolves this to the local package automatically.

```json
// packages/web/package.json
{
  "dependencies": {
    "@islamic-dashboard/shared": "*"
  }
}
```

```typescript
// packages/web/src/pages/Dashboard.tsx
import { usePrayerTimes } from '@islamic-dashboard/shared/hooks/usePrayerTimes';
import { useReminders } from '@islamic-dashboard/shared/hooks/useReminders';
```

For this to work with Vite, configure the `resolve.alias` or simply rely on npm workspaces + TypeScript path mapping:

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "paths": {
      "@islamic-dashboard/shared/*": ["./packages/shared/src/*"]
    }
  }
}
```

### Handling Platform-Specific Divergences

There are two approaches. Use **both**, depending on the situation:

#### Approach 1: Platform File Extensions (`.web.ts` / `.native.ts`)

Use for code where the **interface is identical** but the **implementation differs** — primarily the storage layer and notification scheduling.

```
packages/shared/src/storage/
├── types.ts                    # StorageService interface (shared)
├── storageAdapter.web.ts       # localStorage / IndexedDB implementation
├── storageAdapter.native.ts    # expo-sqlite / AsyncStorage implementation
└── index.ts                    # Conditional re-export (see below)
```

**How this resolves:**

- **Expo (Metro bundler):** Natively understands `.native.ts` > `.ts` resolution. When `packages/mobile` imports `storageAdapter`, Metro picks `storageAdapter.native.ts`.
- **Vite:** Does NOT understand `.web.ts` natively. Configure it:

```typescript
// packages/web/vite.config.ts
export default defineConfig({
  resolve: {
    extensions: ['.web.ts', '.web.tsx', '.ts', '.tsx', '.js', '.jsx'],
  },
});
```

Now when web code imports `storageAdapter`, Vite picks `storageAdapter.web.ts`.

#### Approach 2: Dependency Injection via Hooks

Use for code where the **divergence is too large** for file extensions — primarily notifications and geolocation, where the APIs are fundamentally different.

```typescript
// packages/shared/src/hooks/usePrayerTimes.ts
interface PrayerNotificationScheduler {
  schedule(prayer: string, time: Date): void;
  cancelAll(): void;
}

export function usePrayerTimes(
  scheduler: PrayerNotificationScheduler,
  // ...other deps
) {
  // Shared logic: fetch, parse, cache, determine next prayer
  // Platform-specific: scheduler.schedule(...)
}
```

```typescript
// packages/web/src/hooks/useWebPrayerTimes.ts
import { usePrayerTimes } from '@islamic-dashboard/shared/hooks/usePrayerTimes';
import { webPushScheduler } from '../services/notifications';

export function useWebPrayerTimes() {
  return usePrayerTimes(webPushScheduler);
}

// packages/mobile/src/hooks/useMobilePrayerTimes.ts
import { usePrayerTimes } from '@islamic-dashboard/shared/hooks/usePrayerTimes';
import { expoPushScheduler } from '../services/notifications';

export function useMobilePrayerTimes() {
  return usePrayerTimes(expoPushScheduler);
}
```

### What Goes Where — Decision Matrix

| Code | Location | Sharing Mechanism |
|------|----------|-------------------|
| TypeScript interfaces (Prayer, Surah, Reminder, Ayah) | `shared/models/` | Direct import |
| API clients (Aladhan, AlQuran) | `shared/api/` | Direct import (both use `fetch`) |
| React hooks (business logic) | `shared/hooks/` | Direct import, platform deps injected |
| Date/time utilities | `shared/utils/` | Direct import |
| Storage interface | `shared/storage/types.ts` | Direct import |
| Storage implementation | `shared/storage/storageAdapter.{web,native}.ts` | File extension resolution |
| Notification scheduling | `web/services/notifications.ts`, `mobile/services/notifications.ts` | Separate implementations, injected into shared hooks |
| Geolocation | `web/services/geolocation.ts`, `mobile/services/geolocation.ts` | Separate implementations, injected |
| UI components | `web/src/components/`, `mobile/components/` | **Not shared** — web uses `<div>`, mobile uses `<View>` |
| Navigation/routing | `web/src/App.tsx` (React Router), `mobile/app/` (Expo Router) | **Not shared** |
| CSS / styling | `web/src/styles/` (CSS), `mobile/` (StyleSheet) | **Not shared**, but share design tokens as a JS object in `shared/theme.ts` |

### Design Tokens (Keep Visual Consistency)

```typescript
// packages/shared/src/theme.ts
export const colors = {
  background: '#0f1b2d',
  card: '#172033',
  accent: '#3ecf8e',
  gold: '#f5c542',
  text: '#e2e8f0',
  muted: '#94a3b8',
  error: '#e74c3c',
  green: '#1e7e5a',
  border: '#1e3050',
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32,
} as const;
```

Both platforms import these tokens and apply them to their respective styling systems (CSS variables on web, StyleSheet on mobile).

---

## Summary of Recommendations

| Decision | Recommendation |
|----------|----------------|
| Web framework | Vite + React (standalone, not Expo Web) |
| Service worker | Workbox via `vite-plugin-pwa` with `injectManifest` mode |
| API caching | Cache-first for Quran, stale-while-revalidate (6h) for Aladhan |
| Hosting | Cloudflare Pages (free, fastest CDN, Worker-ready) |
| Push notifications | Cloudflare Worker with VAPID + Web Push API |
| CI/CD | GitHub Actions with path filtering, Lighthouse CI gates |
| Bundle target | < 80 KB JS gzipped, route-level code splitting |
| Code sharing | npm workspaces, `.web.ts`/`.native.ts` extensions, dependency injection for platform APIs |
| Monorepo tool | npm workspaces for v1; migrate to Turborepo if build times exceed 60s |
