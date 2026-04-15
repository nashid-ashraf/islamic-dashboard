# iOS Deployment Assessment — Islamic Daily Dashboard

**Version:** 1.0
**Date:** 2026-04-15
**Status:** Final
**Recommendation:** Expo SDK 52+ with EAS Build, paid Apple Developer account, development build for personal use

---

## 1. Expo Build Pipeline for iOS

### How EAS Build Works for iOS

EAS Build compiles your React Native / Expo project on **Apple Silicon Mac build machines** hosted by Expo in the cloud. You never need a local Mac for production builds (though you may want one for simulator testing). The workflow:

1. Run `eas build --platform ios` from any OS (macOS, Linux, Windows).
2. EAS uploads your project source to Expo's cloud.
3. A cloud Mac runs `xcodebuild` with the correct provisioning profile, certificate, and entitlements.
4. The build artifact (`.ipa` file) is downloadable from Expo's dashboard or CLI.

### Certificates and Provisioning

EAS can **auto-manage** your Apple signing credentials. On first build, it will:

- Generate a Distribution Certificate (or reuse an existing one).
- Create an App ID and provisioning profile.
- Store these encrypted in Expo's credential service.

You can also provide your own credentials via `eas credentials` if you prefer manual control.

### Free vs Paid Apple Developer Account

| Capability | Free Account ($0) | Paid Account ($99/yr) |
|---|---|---|
| Xcode direct install to your device | Yes (7-day certificate) | Yes (1-year certificate) |
| EAS development build (ad hoc) | **No** | Yes |
| App Store / TestFlight distribution | **No** | Yes |
| Push notification entitlement | **No** | Yes |
| Provisioning profile management | Manual, Xcode only | Full, via portal or EAS |
| Max test devices (ad hoc) | 1 (your own) | 100 |
| Certificate validity | 7 days | 1 year |

**Recommendation:** Pay the $99/yr. For an app you plan to use daily with notifications and location, the free account's 7-day re-sign cycle is untenable. The paid account unlocks EAS ad hoc builds, push notifications, and eventual App Store distribution.

### Development Builds vs Production Builds

| Aspect | Development Build | Production Build |
|---|---|---|
| Profile | `"developmentClient": true` | `"distribution": "store"` or `"internal"` |
| Includes | Expo Dev Client, React DevTools, hot reload | Minified, no dev tools |
| Signing | Ad hoc provisioning (device UDID registered) | App Store or ad hoc provisioning |
| Performance | Slower (dev mode overhead) | Full native performance |
| Use case | Active development, debugging | TestFlight, App Store, daily use |

For personal daily use, build a **production internal build** (`"distribution": "internal"` in `eas.json`). This gives you a fully optimized app signed with ad hoc provisioning, installable on your registered device without going through TestFlight.

### Recommended `eas.json` Configuration

```json
{
  "cli": { "version": ">= 13.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "buildConfiguration": "Release"
      }
    },
    "production": {
      "distribution": "store",
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "ashraf.7058@gmail.com",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID"
      }
    }
  }
}
```

---

## 2. iOS-Specific Notifications

### How `expo-notifications` Works on iOS

Under the hood, `expo-notifications` wraps Apple's `UNUserNotificationCenter` framework. It provides:

- **Local notifications:** Scheduled on-device, no server needed. This is what the Islamic Dashboard uses for prayer times and reminders.
- **Remote (push) notifications:** Require APNs (Apple Push Notification service). Not needed for v1 since all scheduling is local.

### Permission Request Flow

iOS requires **explicit user permission** before showing any notification. The flow:

```typescript
import * as Notifications from 'expo-notifications';

async function requestPermissions() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        // Only request critical alerts if you have the entitlement (see below)
        // allowCriticalAlerts: true,
      },
    });
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    // User denied — show in-app explanation with a link to Settings
    return false;
  }
  return true;
}
```

**Critical point:** iOS only shows the permission dialog **once**. If the user denies it, subsequent calls to `requestPermissionsAsync()` return `denied` silently. Your app must detect this and guide the user to Settings > Notifications > Islamic Dashboard to re-enable.

### Notification Categories

You can define actionable notification categories so users can interact directly from the notification banner:

```typescript
await Notifications.setNotificationCategoryAsync('PRAYER_TIME', [
  { identifier: 'DISMISS', buttonTitle: 'Dismiss', options: { isDestructive: false } },
  { identifier: 'OPEN_APP', buttonTitle: 'Open Dashboard', options: { opensAppToForeground: true } },
]);
```

### Critical Alerts for Prayer Times

**Critical Alerts** bypass Do Not Disturb and the mute switch — ideal for prayer time notifications. However:

- Requires a **special entitlement** from Apple (you must request it at `https://developer.apple.com/contact/request/notifications-critical-alerts-entitlement/`).
- Apple grants this selectively — health, safety, and home automation apps are typical approvals. **Islamic prayer times may not qualify** under Apple's current criteria.
- Without the entitlement, prayer notifications respect Do Not Disturb (they will be silently delivered and visible when the user unlocks).

**Recommendation:** Do not pursue Critical Alerts for v1. Instead, use **Time Sensitive notifications** (available since iOS 15, no special entitlement needed), which break through Focus modes for one hour:

```typescript
await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Time for Fajr',
    body: '05:15 — Start your day with prayer',
    sound: 'adhan_short.wav', // Custom sound, max 30 seconds
    interruptionLevel: 'timeSensitive', // iOS 15+
  },
  trigger: { date: fajrDate },
});
```

### The 64-Notification Limit — Strategy for Prayer Times

iOS enforces a hard limit: **a maximum of 64 pending local notifications per app**. Once you hit 64, the earliest ones are silently dropped when you schedule new ones.

**Budget analysis for Islamic Dashboard:**

| Category | Notifications per Day | Days Ahead | Total |
|---|---|---|---|
| Prayer times (6 prayers) | 6 | 7 days | 42 |
| Custom reminders (estimated max) | ~5 active | 1 each | 5 |
| Repeating reminders (daily) | ~3 | 3 days ahead | 9 |
| **Total** | | | **56** |

**Strategy — rolling 7-day window:**

1. On app open (and once daily via background fetch if possible), schedule prayer notifications for the next 7 days. That is 42 notifications (6 prayers x 7 days).
2. Reserve 22 slots for custom reminders.
3. On each app open, cancel all existing prayer notifications and re-schedule the next 7 days fresh. This ensures times are accurate (they shift slightly each day).
4. Store the prayer times for the next 7 days in local storage so re-scheduling is instant even if offline.

```typescript
// Cancel old prayer notifications and re-schedule
async function reschedulePrayerNotifications(weekOfPrayerTimes: DailyPrayerTimes[]) {
  // Cancel only prayer-tagged notifications
  const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
  const prayerNotifIds = allScheduled
    .filter(n => n.content.data?.type === 'prayer')
    .map(n => n.identifier);
  await Promise.all(prayerNotifIds.map(id => Notifications.cancelScheduledNotificationAsync(id)));

  // Schedule next 7 days
  for (const day of weekOfPrayerTimes) {
    for (const prayer of PRAYER_NAMES) {
      const prayerDate = parsePrayerTime(day.date, day.timings[prayer]);
      if (prayerDate > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Time for ${prayer}`,
            body: `${formatTime(day.timings[prayer])} — ${prayer} prayer`,
            sound: 'default',
            data: { type: 'prayer', prayer, date: day.date },
            categoryIdentifier: 'PRAYER_TIME',
          },
          trigger: { date: prayerDate },
        });
      }
    }
  }
}
```

### Custom Notification Sounds

For the optional adhan audio feature (FR-P16, FR-P17):

- Place a `.wav` or `.caf` file in the Expo project under `assets/sounds/`.
- Reference it in `app.json` under `expo.plugins` or via a config plugin.
- The sound file must be **30 seconds or less** (iOS hard limit for notification sounds).
- A short adhan clip (the opening takbir, ~10-15 seconds) works well.

---

## 3. Geolocation on iOS

### Permission Levels

iOS offers two location permission levels relevant to this app:

| Permission | String | Use Case |
|---|---|---|
| When In Use | `NSLocationWhenInUseUsageDescription` | App can access location only while in the foreground |
| Always | `NSLocationAlwaysAndWhenInUseUsageDescription` | App can access location in the background |

**Recommendation:** Request **When In Use** only. The Islamic Dashboard needs location once to determine the user's city for prayer time calculation. It does not need continuous background location tracking. This is simpler, more privacy-respecting, and avoids the stricter App Review scrutiny that "Always" permission triggers.

### Precise vs Approximate Location (iOS 14+)

Starting with iOS 14, users can choose to share only **approximate location** (~5 km radius). For prayer time calculation:

- **Approximate location is sufficient.** Prayer times vary meaningfully only across cities/regions, not across neighborhoods. A 5 km approximation produces identical prayer times.
- Do not request precise location. If the user has set approximate as default, respect it.

```typescript
import * as Location from 'expo-location';

async function getLocationForPrayer(): Promise<{ latitude: number; longitude: number }> {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    // Fall back to manual city entry
    throw new Error('Location permission denied');
  }

  // Approximate accuracy is fine — don't request precise
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Low, // ~3 km — saves battery, plenty for prayer times
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}
```

### Required Info.plist Strings

Expo configures these via `app.json`. You must provide human-readable descriptions that explain **why** you need location. Apple rejects apps with vague descriptions.

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Islamic Dashboard uses your location to calculate accurate prayer times for your city. Your location is never sent to any server — it is only used to query prayer time data from the Aladhan API."
      }
    },
    "plugins": [
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "Islamic Dashboard uses your location to calculate accurate prayer times for your city."
        }
      ]
    ]
  }
}
```

### Fallback Flow

If the user denies location permission:

1. Show the manual city/country input fields (already in the prototype).
2. Pre-fill with the last saved location from storage.
3. Provide a subtle prompt: "Enable location in Settings for automatic prayer times."

---

## 4. Offline Storage on iOS

### Storage Abstraction

The requirements specify `SQLiteAdapter` for mobile and `LocalStorageAdapter` for web. On iOS:

| Engine | Package | iOS Behavior |
|---|---|---|
| AsyncStorage | `@react-native-async-storage/async-storage` | Backed by NSUserDefaults (small data) or a SQLite file in the app's Library directory |
| SQLite | `expo-sqlite` | Full SQLite database in the app's Documents or Library directory |

**Recommendation:** Use `expo-sqlite` as the primary storage engine on mobile (both iOS and Android). It handles structured data (bookmarks, reminders, cached prayer times) far better than key-value AsyncStorage, and the shared `StorageService` interface means the web app can use IndexedDB via the same abstraction.

### iCloud Backup Behavior

By default, files in the iOS app's **Documents** and **Library** directories are included in iCloud backups. This means:

- **Quran bookmarks, reminders, reading position, and cached prayer times will be backed up to iCloud** automatically.
- When the user restores from an iCloud backup or migrates to a new iPhone, all their data comes with them.
- This is desirable behavior — do not disable it.

To explicitly exclude large cache files (e.g., cached surah JSON responses) from backup:

```typescript
import * as FileSystem from 'expo-file-system';

// Use the caches directory for expendable data (not backed up)
const CACHE_DIR = FileSystem.cacheDirectory + 'quran/';

// Use the documents directory for user data (backed up)
const DATA_DIR = FileSystem.documentDirectory + 'data/';
```

### Storage Eviction

- **Documents directory:** Never evicted by iOS. Safe for user data.
- **Caches directory:** iOS may purge this when the device is low on storage and the app is not running. Never store user-created data (bookmarks, reminders) here. Cached API responses are fine — they can be re-fetched.
- **AsyncStorage / SQLite in Library:** Not evicted. Safe.

### Data Organization Recommendation

```
App Documents/          ← iCloud backed up, never evicted
  ├── islamic_dashboard.db   ← SQLite: bookmarks, reminders, reading position, settings
  └── data/

App Caches/             ← Not backed up, may be evicted
  ├── quran_cache/      ← Cached surah JSON responses
  └── prayer_cache/     ← Cached 7-day prayer times
```

---

## 5. App Store Deployment

### Step-by-Step Process

#### Step 1: Apple Developer Program Enrollment

1. Go to `https://developer.apple.com/programs/enroll/`.
2. Sign in with your Apple ID.
3. Pay $99/year.
4. Enrollment is typically approved within 48 hours (sometimes instant for individual accounts, slower for organizations).

#### Step 2: App Store Connect Setup

1. Log in to `https://appstoreconnect.apple.com`.
2. Create a new app:
   - **Bundle ID:** `com.yourname.islamicdashboard` (must match `expo.ios.bundleIdentifier` in `app.json`).
   - **App Name:** "Islamic Dashboard" (check availability — common names may be taken).
   - **Primary Language:** English.
   - **Primary Category:** Lifestyle or Reference.
   - **Secondary Category:** Education (optional).
3. Fill in app metadata:
   - **Description:** Clear, honest description of features.
   - **Keywords:** "quran, prayer times, islamic, muslim, reminders, salah, adhan"
   - **Screenshots:** Required for 6.7" (iPhone 15 Pro Max) and 6.5" (iPhone 11 Pro Max). Optionally 5.5" for older devices.
   - **App Privacy:** Declare location usage (linked to user, used for app functionality).

#### Step 3: App Review Guidelines — Religious Content Considerations

Apple does not prohibit religious apps, but watch for these specific review guidelines:

| Guideline | Risk | Mitigation |
|---|---|---|
| **1.1.5 — Developer Information** | Reviewer must be able to verify you are a legitimate developer | Use your real identity, not a pseudonym |
| **2.3.1 — Hidden Features** | If notification content or Quran text triggers a manual review of "hidden" features | Ensure all features are discoverable from the main UI |
| **4.0 — Design** | App must provide real value, not just a web wrapper | Since this is a full React Native app with native notifications and location, this is fine |
| **4.2.2 — Minimum Functionality** | App must do more than a website | Offline storage, notifications, and location integration distinguish it from a web page |
| **5.1.1 — Data Collection** | Location data use must be justified | Location is used solely for prayer times — state this clearly in the privacy description |
| **5.1.2 — Data Use and Sharing** | Ensure Aladhan API call with coordinates is disclosed | Add to privacy policy: "Your coordinates are sent to api.aladhan.com to retrieve prayer times" |

**Religious-content-specific risks:**

- Apple does **not** have a policy against religious apps. The App Store has thousands of Islamic apps (Muslim Pro, Athan Pro, Quran Majeed, etc.).
- Potential rejection cause: **misleading metadata**. Do not claim the app provides "accurate" prayer times without specifying the calculation method, or claim it replaces scholarly guidance.
- Provide a **privacy policy URL** (required). A simple GitHub Pages / Notion page is sufficient. It must cover location data usage and the fact that coordinates are sent to a third-party API.

#### Step 4: TestFlight Beta Testing

1. After EAS builds a production `.ipa`, submit it to TestFlight:
   ```bash
   eas submit --platform ios
   ```
2. Apple reviews TestFlight builds (usually within 24-48 hours, often faster).
3. Once approved, invite up to **10,000 external testers** via a public link, or use internal testing (up to 100 team members) which requires no review.
4. TestFlight builds expire after **90 days**.

#### Step 5: Submission and Review Timeline

| Phase | Expected Duration |
|---|---|
| First EAS build | 20-40 minutes (cloud build time) |
| TestFlight review | 24-48 hours |
| App Store review (first submission) | 24-72 hours (can take up to 7 days) |
| App Store review (updates) | 24-48 hours typically |
| Appeal if rejected | 1-5 business days |

**Tip:** Submit your first build early, even if incomplete. The first review takes longest, and getting through it once establishes your account history. Subsequent updates are faster.

#### Step 6: Automated Submission via EAS

```bash
# Build and submit in one command
eas build --platform ios --profile production --auto-submit
```

This builds the `.ipa` and automatically uploads it to App Store Connect / TestFlight when complete.

---

## 6. Sideloading to Personal iPhone

### Three Options Compared

#### Option A: Expo Go (Development Only)

| Aspect | Details |
|---|---|
| Cost | Free |
| Setup | Install Expo Go from App Store, run `npx expo start`, scan QR code |
| Limitations | Cannot use `expo-notifications` local scheduling (Expo Go does not support it), cannot use custom native modules, limited background capabilities |
| Certificate | None needed — runs inside Expo Go's sandbox |
| Daily use? | **No.** Requires your dev server to be running. No notifications. Not viable for daily use. |

**Verdict:** Good for UI prototyping only. Not suitable for the Islamic Dashboard's core features (notifications, background scheduling).

#### Option B: EAS Development Build + Ad Hoc Provisioning (Recommended for Development)

| Aspect | Details |
|---|---|
| Cost | $99/yr Apple Developer + EAS free tier (30 builds/month) |
| Setup | `eas build --platform ios --profile development`, install via QR code |
| Limitations | Must register your device UDID (EAS does this automatically on first build). Limited to 100 devices. |
| Certificate | 1-year ad hoc provisioning profile, auto-managed by EAS |
| Daily use? | **Possible but suboptimal.** Includes dev client overhead. |

#### Option C: Xcode Direct Install with Free Account (7-Day Limit)

| Aspect | Details |
|---|---|
| Cost | Free |
| Setup | `npx expo prebuild`, open in Xcode, connect iPhone via USB, build and run |
| Limitations | **Certificate expires every 7 days.** You must re-build and re-install weekly. All local data (bookmarks, reminders) survives reinstall, but notification schedules are lost. |
| Certificate | Free 7-day development certificate |
| Daily use? | **No.** Weekly reinstallation is unacceptable for a daily-use app with scheduled notifications. |

#### Recommended Path: EAS Internal Distribution Build (Best for Daily Use)

This is the **fourth option** and the one I recommend. It is a production-quality build distributed via ad hoc provisioning — no App Store needed, no dev client overhead.

```bash
# One-time: register your device
eas device:create

# Build a release-optimized app for internal distribution
eas build --platform ios --profile preview
```

| Aspect | Details |
|---|---|
| Cost | $99/yr Apple Developer + EAS free tier |
| Setup | Build once, install via link. Rebuilds only when you ship updates. |
| Limitations | 100-device limit (irrelevant for personal use). Provisioning profile valid for 1 year. |
| Certificate | 1-year ad hoc, auto-managed |
| Performance | Full production optimization (Hermes, minified, no dev tools) |
| Notifications | Fully functional |
| Daily use? | **Yes. This is the recommended path.** |

The install flow:

1. Run `eas build --platform ios --profile preview`.
2. Wait ~30 minutes for the cloud build.
3. Open the link EAS provides on your iPhone.
4. Tap "Install" — the app installs like any App Store app.
5. Go to Settings > General > VPN & Device Management > trust the developer certificate (first time only).
6. The app works for up to 1 year until the provisioning profile expires, at which point you just rebuild.

---

## 7. iOS-Specific UI Considerations

### Human Interface Guidelines Compliance

The app should feel native on iOS. Key areas:

#### Safe Area Insets (Notch, Dynamic Island, Home Indicator)

Every screen must respect safe areas. Expo provides `react-native-safe-area-context`:

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function DashboardScreen() {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f1b2d' }}>
      {/* Content automatically avoids notch, Dynamic Island, and home indicator */}
    </SafeAreaView>
  );
}
```

For scroll views, apply `contentInsetAdjustmentBehavior="automatic"` on iOS.

#### Large Title Navigation (iOS Convention)

iOS users expect large, collapsible titles. Expo Router with `react-navigation` supports this:

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerStyle: { backgroundColor: '#0f1b2d' },
        headerTintColor: '#3ecf8e',
        headerLargeTitleStyle: { color: '#e2e8f0' },
      }}
    />
  );
}
```

#### Blur Effects

iOS uses blurred backgrounds extensively (tab bars, navigation headers). Use `expo-blur`:

```tsx
import { BlurView } from 'expo-blur';

<BlurView intensity={80} tint="dark" style={styles.tabBar}>
  {/* Tab bar content */}
</BlurView>
```

#### Haptic Feedback

Use `expo-haptics` for tactile feedback on key interactions:

```tsx
import * as Haptics from 'expo-haptics';

// When user bookmarks an ayah
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// When user completes a reminder
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// When prayer time arrives (if app is in foreground)
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
```

#### Swipe Gestures

Implement swipe-to-delete on reminders and swipe-to-bookmark on ayahs using `react-native-gesture-handler` (included in Expo):

```tsx
import { Swipeable } from 'react-native-gesture-handler';

function ReminderItem({ reminder, onDelete }) {
  const renderRightActions = () => (
    <TouchableOpacity onPress={() => onDelete(reminder.id)} style={styles.deleteAction}>
      <Text style={{ color: '#fff' }}>Delete</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable renderRightActions={renderRightActions}>
      {/* Reminder content */}
    </Swipeable>
  );
}
```

#### Platform-Specific Styling Differences

| Element | iOS Style | Implementation |
|---|---|---|
| Tab bar | Translucent blur, bottom safe area | `expo-blur` + safe area insets |
| Cards | Subtle shadows, rounded corners (14px) | `shadowColor`, `shadowOffset`, `borderRadius: 14` |
| Switches | Green tint (system default) | React Native `Switch` with `trackColor` |
| Scroll bounce | Elastic overscroll (default on iOS) | No action needed — default behavior |
| Modals | Sheet-style presentation (iOS 15+) | `presentation: 'modal'` in Stack navigator |

---

## 8. CI/CD Pipeline

### GitHub Actions + EAS Build

#### Workflow Overview

```yaml
# .github/workflows/ios-build.yml
name: iOS Build & Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:  # Manual trigger

jobs:
  build-ios:
    runs-on: ubuntu-latest  # EAS builds happen in Expo's cloud, not GitHub's runner
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Setup EAS CLI
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build iOS
        run: eas build --platform ios --profile production --non-interactive

      - name: Submit to TestFlight
        run: eas submit --platform ios --latest --non-interactive
```

### Apple Certificates in CI

**Expo handles certificate management entirely.** Here is what happens:

1. You run `eas credentials` once locally and let EAS auto-generate your distribution certificate and provisioning profile.
2. EAS stores these credentials encrypted on Expo's servers.
3. In CI, the `EXPO_TOKEN` environment variable authenticates the EAS CLI, which then retrieves the stored credentials during the build.
4. **You never store Apple certificates, `.p12` files, or provisioning profiles in GitHub Secrets or your repository.**

This is a significant advantage over raw Fastlane / Xcode Cloud setups where you must manage certificate files yourself.

### Required CI Secrets

| Secret | Source | Purpose |
|---|---|---|
| `EXPO_TOKEN` | `https://expo.dev/accounts/[you]/settings/access-tokens` | Authenticates EAS CLI |
| `APPLE_ID` | Your Apple Developer email | Used by `eas submit` for TestFlight upload |
| `APPLE_APP_SPECIFIC_PASSWORD` | `https://appleid.apple.com` > App-Specific Passwords | Required for automated TestFlight submission |

### Automated TestFlight Uploads

Add `--auto-submit` to the build command to chain build and submission:

```bash
eas build --platform ios --profile production --auto-submit --non-interactive
```

Or configure it in `eas.json`:

```json
{
  "build": {
    "production": {
      "distribution": "store",
      "autoSubmit": true,
      "submitProfile": "production"
    }
  }
}
```

### Build Frequency Recommendation

- **Free EAS tier:** 30 builds/month. Sufficient for a personal project. Build on push to `main` only (not on every PR).
- **On-demand builds:** Use `workflow_dispatch` to trigger manually when you want a new TestFlight version.
- **PR checks:** Run TypeScript compilation, ESLint, and Jest tests on PRs without triggering EAS builds.

---

## 9. Keeping iOS Synced with Web/Android

### Monorepo Shared Code Strategy

The `packages/shared/` directory (API clients, hooks, models, storage interfaces, utilities) should constitute ~80% of the codebase. iOS, Android, and Web consume this shared code identically.

```
packages/
  shared/          ← 80% of code, no platform imports
    api/
      aladhan.ts       ← Fetch-based, works everywhere
      alquran.ts
    hooks/
      useQuran.ts      ← React hooks, platform-agnostic
      usePrayer.ts
      useReminders.ts
    models/
      types.ts         ← TypeScript interfaces
    storage/
      StorageService.ts    ← Abstract interface
      SQLiteAdapter.ts     ← Mobile implementation
      IndexedDBAdapter.ts  ← Web implementation
    utils/
      dateHelpers.ts
      prayerTimeParser.ts

  mobile/          ← iOS + Android specific (~15% of code)
    services/
      notifications.ts       ← expo-notifications
      notifications.ios.ts   ← iOS-specific notification config (if needed)
      location.ts            ← expo-location
    components/
      SafeAreaWrapper.tsx
      HapticButton.tsx       ← Uses expo-haptics

  web/             ← Web specific (~5% of code)
    services/
      notifications.ts       ← Web Push API
      location.ts            ← navigator.geolocation
```

### Platform-Specific File Extensions

React Native's module resolver automatically picks platform-specific files:

```
notifications.ts        ← Default / shared logic
notifications.ios.ts    ← iOS-specific overrides (loaded on iOS)
notifications.android.ts ← Android-specific overrides (loaded on Android)
notifications.web.ts    ← Web-specific overrides (loaded on web)
```

For the Islamic Dashboard, the cases where iOS needs its own file are narrow:

| File | Why iOS-Specific |
|---|---|
| `notifications.ios.ts` | Time Sensitive interruption level, notification categories, permission request options |
| `haptics.ios.ts` | Only if you want iOS-specific haptic patterns (usually not needed — `expo-haptics` is already iOS-native) |

Most code should live in the shared or general mobile layer, not in `.ios.ts` files.

### iOS-Only Packages

| Package | Purpose | iOS Only? |
|---|---|---|
| `expo-haptics` | Tactile feedback | iOS + Android (but richer on iOS) |
| `expo-blur` | BlurView for native blur effects | iOS + Android (uses native blur on both) |
| `@react-native-community/blur` | Alternative blur | Same |
| `expo-store-review` | Request App Store review | iOS App Store only (use conditionally) |

None of these are truly iOS-only in the Expo ecosystem — they all have Android implementations or graceful no-ops. Use `Platform.OS` checks only where behavior genuinely differs.

### Testing Strategy

| Method | What It Tests | When to Use |
|---|---|---|
| **Expo Go** | UI layout, navigation, API calls, shared hooks | Early development, quick iteration |
| **iOS Simulator** | Full native behavior except notifications and haptics | Testing without a physical device |
| **Development Build (physical device)** | Notifications, location, haptics, real performance | Feature-complete testing |
| **EAS Preview Build** | Production-like behavior on real device | Pre-release validation |
| **TestFlight** | Exact production build, crash reporting | Final verification before App Store |

**Recommendation:** Develop primarily with Expo Go for speed, then validate notifications and location on a development build. Use the iOS Simulator for layout testing across device sizes (iPhone SE through iPhone 15 Pro Max).

---

## 10. Key iOS Gotchas

### Background Execution Limits

iOS is aggressive about killing background processes. Implications for the Islamic Dashboard:

| Capability | iOS Behavior | Impact |
|---|---|---|
| **Local notifications** | Fire reliably even if app is killed | Prayer time notifications work correctly |
| **Background fetch** | iOS decides when/if to wake your app | Cannot guarantee daily midnight prayer time refresh |
| **Background location** | Not requested (When In Use only) | No impact |
| **setTimeout/setInterval** | Suspended when app is backgrounded | The prototype's `setTimeout`-based notifications will not work. Must use `expo-notifications` scheduling, which delegates to the OS. |

**Critical migration note:** The existing HTML prototype uses `setTimeout()` for both prayer and reminder notifications. This fundamentally does not work on mobile — `setTimeout` is suspended when the app is backgrounded or killed. The React Native version must use `expo-notifications` `scheduleNotificationAsync()` exclusively, which registers the notification with iOS's `UNUserNotificationCenter`. iOS then fires the notification at the scheduled time, regardless of app state.

### App Transport Security (ATS)

iOS enforces HTTPS for all network requests by default. Status of the project's APIs:

| API | URL | HTTPS | ATS Compliant |
|---|---|---|---|
| Aladhan | `https://api.aladhan.com/v1/` | Yes | Yes |
| AlQuran Cloud | `https://api.alquran.cloud/v1/` | Yes | Yes |

**No ATS exceptions are needed.** Do not add `NSAllowsArbitraryLoads` to Info.plist — this would trigger additional App Review scrutiny and is unnecessary.

### Push Notification Token Refresh

While v1 uses only local notifications (no remote push), if you add remote push in the future:

- iOS may rotate the device push token at any time (after OS update, after restoring from backup, periodically).
- You must register a listener for token changes and update your server.
- For v1 with local-only notifications, this is not a concern.

### App Review Rejection — Common Causes for Islamic/Religious Apps

Based on known rejection patterns for similar apps:

| Rejection Reason | How to Avoid |
|---|---|
| **Guideline 4.2 — Minimum Functionality** | Ensure the app does meaningfully more than a mobile website. Notifications, offline support, and location integration satisfy this. |
| **Guideline 5.1.1 — Data Collection** | Clearly disclose that location coordinates are sent to `api.aladhan.com`. Add a privacy policy URL. |
| **Guideline 2.3.7 — Accurate Metadata** | Do not use the word "official" in the app name or description unless you represent an official Islamic authority. |
| **Guideline 1.1.6 — False Information** | Do not claim prayer times are "guaranteed accurate" — state they are calculated using established astronomical methods. |
| **Guideline 5.1.2 — Third-Party Data** | Quran text from AlQuran Cloud API is public domain. No licensing issue. |
| **Guideline 2.5.4 — Background Modes** | Do not enable background modes you do not use. If you only use local notifications, do not enable background fetch or background audio. |
| **Notification justification** | App Review may ask why you need notifications. Provide clear explanation: "Notifies users of Islamic prayer times (5 daily prayers based on their location) and user-created reminders." |

### Memory and Performance

- **Quran text rendering:** Arabic text with RTL layout can be expensive. The pagination strategy (10 ayahs at a time, FR-Q4) is correct. On iOS, use `FlatList` with `getItemLayout` for predictable scroll performance.
- **Prayer time re-calculation:** Avoid recalculating on every render. Cache the day's times in state and only re-fetch when the date changes or the user changes location/method.
- **Hermes engine:** Expo SDK 52+ uses Hermes by default on iOS. This provides faster startup and lower memory usage than JavaScriptCore. No action needed — it is the default.

### iOS Version Support

| Target | Recommendation |
|---|---|
| Minimum iOS version | iOS 16.0 (Expo SDK 52 default) |
| Supported devices | iPhone 8 and newer |
| Rationale | iOS 16+ covers ~95% of active iPhones. Targeting older versions adds complexity with minimal user benefit. |

Configure in `app.json`:

```json
{
  "expo": {
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourname.islamicdashboard",
      "infoPlist": {
        "MinimumOSVersion": "16.0"
      }
    }
  }
}
```

---

## Summary of Recommendations

| Decision | Recommendation |
|---|---|
| Apple Developer Account | **Paid ($99/yr)** — required for notifications, ad hoc builds, eventual App Store |
| Personal iPhone install method | **EAS internal distribution build** (production-quality, 1-year certificate) |
| Notification strategy | **Local notifications only**, 7-day rolling window, 42 prayer + 22 reminder slots |
| Critical alerts | **Skip for v1**, use Time Sensitive interruption level instead |
| Location permission | **When In Use only**, approximate accuracy sufficient |
| Storage | **expo-sqlite** in Documents directory (iCloud backed up) |
| CI/CD | **GitHub Actions + EAS Build**, auto-submit to TestFlight |
| iOS minimum version | **iOS 16.0** |
| First action | Enroll in Apple Developer Program today — it takes up to 48 hours to activate |
