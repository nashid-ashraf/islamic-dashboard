# Android Deployment Assessment — Islamic Dashboard

**Version:** 1.0  
**Date:** 2026-04-15  
**Scope:** Android-specific build, deployment, and platform considerations for the Islamic Dashboard Expo app

---

## 1. Expo Build Pipeline for Android

### Recommendation: EAS Build (cloud) for CI and releases, local builds only for debugging native modules

EAS Build is the clear winner for this project. The Islamic Dashboard has no custom native modules — it uses only Expo-managed packages (`expo-notifications`, `expo-location`, `expo-sqlite`). This means EAS Build handles the entire Android toolchain (Gradle, Android SDK, NDK) without requiring a local Android development environment.

### eas.json Configuration

```jsonc
// eas.json — place at monorepo root or in packages/mobile/
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "remote"   // EAS manages version codes automatically
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk",          // APK for sideloading dev client
        "gradleCommand": ":app:assembleDebug"
      },
      "env": {
        "APP_VARIANT": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"           // APK so testers can install directly
      },
      "env": {
        "APP_VARIANT": "preview"
      },
      "channel": "preview"           // EAS Update channel for OTA updates
    },
    "production": {
      "android": {
        "buildType": "app-bundle"    // AAB required for Play Store
      },
      "env": {
        "APP_VARIANT": "production"
      },
      "channel": "production",
      "autoIncrement": true          // auto-bump versionCode on each build
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account-key.json",
        "track": "internal"          // submit to internal testing first
      }
    }
  }
}
```

### APK vs AAB — When to Use Which

| Format | Use Case | Distribution |
|--------|----------|-------------|
| **APK** | Development builds, preview builds, sideloading to personal devices, internal testing without Play Store | Direct install via file transfer, QR code, or `adb install` |
| **AAB** (Android App Bundle) | Production Play Store releases only | Google Play processes the AAB and generates optimized APKs per device configuration (CPU arch, screen density, language) |

**Rule of thumb:** APK for anything you install by hand. AAB exclusively for Play Store submission. Never try to sideload an AAB — it is not an installable format.

### How to Run Builds

```bash
# Development build (APK with dev client for hot reload)
eas build --platform android --profile development

# Preview build (APK for testing the production JS bundle)
eas build --platform android --profile preview

# Production build (AAB for Play Store)
eas build --platform android --profile production
```

### Local Builds (When Needed)

Only use local builds if you need to debug a native crash or test a config plugin change:

```bash
# Requires Android Studio, JDK 17, Android SDK 34 installed locally
eas build --platform android --profile development --local
```

This outputs the APK/AAB to your machine. For this project, local builds should be rare — EAS cloud builds handle everything.

---

## 2. Android-Specific Notifications

Prayer time notifications are the single most critical Android-specific feature. Android aggressively kills background processes and delays alarms to save battery. Getting notifications to fire reliably at exact prayer times — even when the app is killed — requires understanding several Android subsystems.

### How expo-notifications Works on Android

Under the hood, `expo-notifications` uses:
- **Firebase Cloud Messaging (FCM)** for remote/push notifications (not needed for this app)
- **Android AlarmManager** for locally scheduled notifications
- **NotificationCompat** for building and displaying the notification

For the Islamic Dashboard, all notifications are **local scheduled notifications** — no push server is needed.

### Notification Channels (Required on Android 8+)

Android 8 (API 26) introduced notification channels. Every notification must belong to a channel, and users can independently mute/configure each channel. Define channels at app startup:

```typescript
// packages/mobile/services/notifications.ts
import * as Notifications from 'expo-notifications';

export async function setupNotificationChannels() {
  // Prayer times — high importance so they make sound and appear as heads-up
  await Notifications.setNotificationChannelAsync('prayer-times', {
    name: 'Prayer Times',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'adhan_short.wav',       // custom sound in android/app/src/main/res/raw/
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#3ecf8e',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    description: 'Alerts for each daily prayer time',
  });

  // Custom reminders — default importance
  await Notifications.setNotificationChannelAsync('reminders', {
    name: 'Reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Your custom activity reminders',
  });
}
```

**Call `setupNotificationChannels()` in your app's root `_layout.tsx` before scheduling any notifications.** Channels are created once and persist across app launches. Users can modify them in Android Settings > Apps > Islamic Dashboard > Notifications.

### Exact Alarm Permission (Android 12+, API 31+)

Starting with Android 12, scheduling exact alarms requires the `SCHEDULE_EXACT_ALARM` permission. Expo SDK 50+ handles this automatically when you use `expo-notifications`, but you must declare it in `app.json`:

```jsonc
// app.json (or app.config.ts)
{
  "expo": {
    "android": {
      "permissions": [
        "SCHEDULE_EXACT_ALARM",
        "USE_EXACT_ALARM"           // Android 14+ alternative, auto-granted
      ]
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "sounds": ["./assets/sounds/adhan_short.wav"]
        }
      ]
    ]
  }
}
```

On Android 12-13, `SCHEDULE_EXACT_ALARM` can be revoked by the user. On Android 14+, `USE_EXACT_ALARM` is auto-granted for clock/prayer apps and cannot be revoked (as long as the app's primary purpose involves time-sensitive alerts, which this app qualifies for).

**Check permission at runtime:**

```typescript
import { PermissionStatus } from 'expo-notifications';

async function ensureExactAlarmPermission(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === PermissionStatus.GRANTED) return true;

  const { status: newStatus } = await Notifications.requestPermissionsAsync({
    android: {
      allowAlert: true,
      allowSound: true,
      allowAnnouncements: true,
    },
  });
  return newStatus === PermissionStatus.GRANTED;
}
```

### Battery Optimization Exemptions (Doze Mode)

Android's Doze mode defers alarms when the device is idle and unplugged. This is the number one reason prayer notifications fail on Android. Mitigations:

1. **Request battery optimization exemption.** Use `expo-battery` or `react-native-battery-optimization-check` to detect and prompt the user:

```typescript
import { startActivityAsync, ActivityAction } from 'expo-intent-launcher';
import * as Application from 'expo-application';

async function requestBatteryOptimizationExemption() {
  // Open Android's battery optimization settings for this app
  await startActivityAsync(ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, {
    data: `package:${Application.applicationId}`,
  });
}
```

2. **Show a one-time setup screen** after first install explaining why battery optimization exemption is needed: "To ensure prayer time notifications arrive on time, please disable battery optimization for this app." Provide a button that opens the settings page directly.

3. **Use HIGH importance notification channel.** High-importance notifications are more likely to break through Doze mode.

### Scheduling Prayer Notifications That Survive App Kill

```typescript
import * as Notifications from 'expo-notifications';

interface PrayerTime {
  name: string;
  time: string; // "HH:MM" format
}

async function schedulePrayerNotifications(prayers: PrayerTime[], date: Date) {
  // Cancel all previous prayer notifications
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data?.type === 'prayer') {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }

  for (const prayer of prayers) {
    const [hours, minutes] = prayer.time.split(':').map(Number);
    const fireDate = new Date(date);
    fireDate.setHours(hours, minutes, 0, 0);

    // Skip if the prayer time has already passed today
    if (fireDate.getTime() <= Date.now()) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Time for ${prayer.name}`,
        body: `${prayer.name} — ${prayer.time}`,
        sound: 'adhan_short.wav',
        data: { type: 'prayer', prayer: prayer.name },
        channelId: 'prayer-times',   // Android channel
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
      },
    });
  }
}
```

**Key behaviors on Android:**
- `expo-notifications` persists scheduled notifications in Android's AlarmManager. They survive app kill and device reboot (the library registers a `BOOT_COMPLETED` receiver).
- Re-schedule all prayer notifications daily. Do this (a) at midnight via a single scheduled "refresh" notification that triggers rescheduling, and (b) every time the app is opened (in case the midnight trigger was missed).
- On Xiaomi, Huawei, Samsung, and Oppo devices, battery optimization is more aggressive than stock Android. The setup screen should include OEM-specific instructions. Consider linking to https://dontkillmyapp.com for the user's device brand.

### Foreground Service (Adhan Audio)

If the optional adhan audio feature (FR-P16) plays audio longer than a few seconds, Android requires a **foreground service** to keep the audio alive when the screen is off. Use `expo-task-manager` with `expo-notifications`:

```typescript
import * as TaskManager from 'expo-task-manager';

TaskManager.defineTask('PLAY_ADHAN', async () => {
  // Play audio using expo-av
  // The foreground service notification keeps this alive
});
```

For v1, recommend keeping adhan audio short (< 10 seconds) to avoid needing a foreground service. A notification sound file up to 30 seconds can be played directly by the notification channel's `sound` property without a foreground service.

---

## 3. Geolocation on Android

### expo-location Permissions

Android has three levels of location permission since Android 12:

| Permission | What It Gives | When to Request |
|-----------|---------------|----------------|
| `ACCESS_COARSE_LOCATION` | ~1.6 km accuracy (city block) | Sufficient for prayer times (city-level precision is fine) |
| `ACCESS_FINE_LOCATION` | GPS-level accuracy (~3 meters) | Not needed for prayer times, but good for future Qibla compass |
| `ACCESS_BACKGROUND_LOCATION` | Location while app is in background | **Not needed for this app** — never request this |

### Recommendation: Request Coarse Location Only (for v1)

Prayer times do not change meaningfully within a city. Coarse location is sufficient and avoids triggering the more alarming "precise location" prompt on Android 12+.

```typescript
import * as Location from 'expo-location';

async function getLocationForPrayerTimes(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  // Check current permission status first
  const { status: existing } = await Location.getForegroundPermissionsAsync();

  if (existing === 'denied') {
    // User previously denied — do NOT re-request, show manual city input instead
    return null;
  }

  if (existing !== 'granted') {
    // First time — request permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      // User denied — gracefully fall back to manual input
      return null;
    }
  }

  // Use low accuracy — sufficient for prayer times, faster, less battery
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Low,  // coarse location
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}
```

### Avoiding Permanent Permission Denial

Android has a "Don't ask again" checkbox that permanently denies permission. Once permanently denied, `requestForegroundPermissionsAsync()` returns `denied` immediately without showing a dialog. The only recovery is sending the user to app settings.

**Strategy to avoid this:**

1. **Explain before requesting.** Show a pre-permission screen: "Islamic Dashboard uses your location to calculate accurate prayer times for your city. You can also enter your city manually."
2. **Provide two buttons:** "Use My Location" (requests permission) and "Enter City Manually" (skips permission entirely).
3. **Never request more than once per session.** If denied, immediately switch to manual city input without asking again.
4. **If permanently denied and user later wants location,** detect the permanent denial and show: "Location permission was denied. To enable it, go to Settings > Apps > Islamic Dashboard > Permissions > Location." Provide a button that opens the settings page:

```typescript
import { Linking } from 'react-native';

function openAppSettings() {
  Linking.openSettings();
}
```

### app.json Location Configuration

```jsonc
{
  "expo": {
    "android": {
      "permissions": [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION"       // include for future Qibla compass
      ]
    },
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": false,
          "locationWhenInUsePermission": "Islamic Dashboard uses your location to show accurate prayer times for your area."
        }
      ]
    ]
  }
}
```

Do **not** include `ACCESS_BACKGROUND_LOCATION`. It triggers additional Play Store review requirements and is unnecessary for this app.

---

## 4. Offline Storage on Android

### Comparison

| Feature | AsyncStorage | expo-sqlite | WatermelonDB |
|---------|-------------|-------------|-------------|
| Data model | Key-value (JSON strings) | Relational (SQL tables) | Relational (built on SQLite) |
| Query capability | Get by key only | Full SQL | ORM-style queries, lazy loading |
| Performance at scale | Degrades with large values | Excellent | Excellent (optimized for React Native) |
| Cloud sync readiness | Poor (no schema, no change tracking) | Good (timestamps + queries) | Excellent (built-in sync primitives) |
| Bundle size | Tiny (~20 KB) | Small (~100 KB) | Moderate (~300 KB) |
| Expo compatibility | Built-in | `expo-sqlite` (Expo-managed) | Requires custom dev client |
| Migration support | None | Manual SQL migrations | Built-in schema migrations |

### Recommendation: expo-sqlite

**expo-sqlite is the right choice for this project.** Here is why:

1. **It is Expo-managed.** No custom native code, no dev client required, works with EAS Build out of the box.
2. **SQL queries support the v2 cloud sync story.** You can query by `updatedAt > lastSyncTimestamp` to find changed records — impossible with AsyncStorage.
3. **The data model is relational.** Bookmarks reference surahs and ayahs. Reminders have structured fields. SQL is the natural fit.
4. **WatermelonDB is overkill.** It adds complexity (custom native modules, JSI bridge) for sync primitives you do not need in v1. When v2 sync arrives, expo-sqlite plus a simple sync adapter will suffice.

### SQLite Schema

```sql
-- packages/shared/storage/schema.sql

-- Reading position (transient, overwritten frequently)
CREATE TABLE IF NOT EXISTS reading_position (
    id              INTEGER PRIMARY KEY DEFAULT 1,  -- singleton row
    surah_number    INTEGER NOT NULL,
    ayah_number     INTEGER NOT NULL,
    surah_name      TEXT NOT NULL,
    updated_at      INTEGER NOT NULL                -- Unix ms timestamp
);

-- Bookmarks (permanent, user-curated)
CREATE TABLE IF NOT EXISTS bookmarks (
    id              TEXT PRIMARY KEY,                -- UUID
    surah_number    INTEGER NOT NULL,
    ayah_number     INTEGER NOT NULL,
    surah_name      TEXT NOT NULL,
    label           TEXT,                            -- optional user label
    arabic_text     TEXT,                            -- cache the ayah text for offline display
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_surah ON bookmarks(surah_number, ayah_number);

-- Reminders
CREATE TABLE IF NOT EXISTS reminders (
    id              TEXT PRIMARY KEY,                -- UUID
    title           TEXT NOT NULL,
    due_time        INTEGER,                         -- Unix ms timestamp, NULL if untimed
    repeat          TEXT NOT NULL DEFAULT 'none',    -- 'none' | 'daily' | 'weekly'
    complete        INTEGER NOT NULL DEFAULT 0,      -- boolean as 0/1
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(due_time);

-- Cached prayer times (for offline fallback)
CREATE TABLE IF NOT EXISTS cached_prayer_times (
    id              INTEGER PRIMARY KEY DEFAULT 1,  -- singleton row
    date_str        TEXT NOT NULL,                   -- "2026-04-15"
    latitude        REAL,
    longitude       REAL,
    city            TEXT,
    country         TEXT,
    method          INTEGER NOT NULL,
    timings_json    TEXT NOT NULL,                   -- JSON blob of prayer times
    hijri_json      TEXT NOT NULL,                   -- JSON blob of Hijri date info
    fetched_at      INTEGER NOT NULL
);

-- Cached surah data (for offline Quran reading)
CREATE TABLE IF NOT EXISTS cached_surahs (
    surah_number    INTEGER PRIMARY KEY,
    surah_name_en   TEXT NOT NULL,
    surah_name_ar   TEXT NOT NULL,
    total_ayahs     INTEGER NOT NULL,
    ayahs_json      TEXT NOT NULL,                   -- JSON array of { arabic, english, numberInSurah }
    fetched_at      INTEGER NOT NULL
);

-- Schema version tracking for migrations
CREATE TABLE IF NOT EXISTS schema_version (
    version         INTEGER PRIMARY KEY
);
```

### Storage Service Interface

```typescript
// packages/shared/storage/StorageService.ts

export interface StorageService {
  // Reading position
  saveReadingPosition(position: ReadingPosition): Promise<void>;
  getReadingPosition(): Promise<ReadingPosition | null>;

  // Bookmarks
  saveBookmark(bookmark: Bookmark): Promise<void>;
  deleteBookmark(id: string): Promise<void>;
  getAllBookmarks(): Promise<Bookmark[]>;
  getBookmarkForAyah(surahNumber: number, ayahNumber: number): Promise<Bookmark | null>;

  // Reminders
  saveReminder(reminder: Reminder): Promise<void>;
  updateReminder(reminder: Reminder): Promise<void>;
  deleteReminder(id: string): Promise<void>;
  getAllReminders(): Promise<Reminder[]>;

  // Cache
  cachePrayerTimes(data: CachedPrayerTimes): Promise<void>;
  getCachedPrayerTimes(): Promise<CachedPrayerTimes | null>;
  cacheSurah(data: CachedSurah): Promise<void>;
  getCachedSurah(surahNumber: number): Promise<CachedSurah | null>;

  // Sync support (v2)
  getChangedSince(table: string, since: number): Promise<any[]>;
}
```

The `SQLiteAdapter` (mobile) and `LocalStorageAdapter` (web) both implement this interface. When v2 adds cloud sync, a `SyncAdapter` wraps the local adapter and pushes/pulls changes using the `updated_at` timestamps.

---

## 5. Play Store Deployment

### Step-by-Step Process

#### Step 1: Create a Google Play Developer Account

1. Go to https://play.google.com/console/signup
2. Sign in with a Google account (use a dedicated account for the app, not a personal one, if you plan to publish publicly)
3. Pay the one-time $25 registration fee
4. Complete identity verification (takes 1-3 business days for individual accounts)
5. Accept the Developer Distribution Agreement

#### Step 2: Create the App Listing in Play Console

1. Play Console > All Apps > Create App
2. Fill in: App name ("Islamic Dashboard"), Default language (English), App type (App), Free/Paid (Free)
3. Complete the content declarations:
   - **Content rating:** Complete the IARC questionnaire. An Islamic utility app with no violence, no user-generated content, no purchases will likely receive an "Everyone" rating
   - **Target audience:** 13+ (or "All ages" if no ads)
   - **Data safety:** Declare that the app collects location data (for prayer times) and stores it on-device only, no data shared with third parties
   - **App category:** Lifestyle or Tools > Religious

#### Step 3: Generate Android Signing Keys

**Use EAS to manage signing keys (recommended).** EAS generates and securely stores your upload key and keystore. You never need to handle `.jks` files manually.

```bash
# First production build — EAS generates the keystore automatically
eas build --platform android --profile production

# EAS will prompt: "Would you like EAS to manage your keystore?" — answer YES
```

If you ever need to download the keystore (e.g., for migrating away from EAS):

```bash
eas credentials --platform android
# Select "Download Keystore"
```

**Important:** After your first upload to Play Store, Google re-signs the app with their own key (Play App Signing). Your EAS-managed key becomes the "upload key." This is irreversible and correct — it means Google holds the master signing key and can recover your app even if you lose your upload key.

#### Step 4: Configure eas.json for Production (Already Done Above)

The `production` profile in `eas.json` (Section 1) is already configured with:
- `buildType: "app-bundle"` (AAB)
- `autoIncrement: true` (bumps versionCode)
- `channel: "production"` (for EAS Update OTA)
- Submit config pointing to the Google service account key

#### Step 5: Set Up Google Service Account for Automated Submission

1. Go to Google Cloud Console > IAM > Service Accounts
2. Create a service account (e.g., `eas-submit@islamic-dashboard.iam.gserviceaccount.com`)
3. Grant it no Cloud IAM roles (it only needs Play Console access)
4. Create a JSON key and download it as `google-service-account-key.json`
5. In Google Play Console > Settings > API access > Link the Google Cloud project
6. Grant the service account "Release manager" permission
7. Place the JSON key in `packages/mobile/google-service-account-key.json`
8. **Add it to `.gitignore` immediately** — never commit this file

#### Step 6: Build and Submit

```bash
# Build the production AAB
eas build --platform android --profile production

# Submit to Play Store (internal testing track)
eas submit --platform android --profile production

# Or combine build + submit in one command
eas build --platform android --profile production --auto-submit
```

#### Step 7: Testing Tracks Before Public Release

Google Play has four release tracks, used in order:

| Track | Audience | Purpose |
|-------|----------|---------|
| **Internal testing** | Up to 100 testers you specify by email | Fastest review (~minutes). Use this for personal device testing. No Play Store review required. |
| **Closed testing** | Invite-only groups | Larger group testing. Requires basic review. |
| **Open testing** | Anyone can join via a link | Public beta. Full review. |
| **Production** | Everyone on Play Store | Full review (~1-3 days for first submission, hours for updates). |

**For personal use, internal testing is sufficient.** You add your own email address as a tester, and the app appears in your Play Store as an installable internal test build.

```bash
# In eas.json, the submit track is already set to "internal"
# After submission, go to Play Console > Internal testing > Testers
# Add your email, then open the opt-in link on your Android device
```

#### Step 8: Promote to Production (When Ready)

1. Play Console > Internal testing > select the release > Promote to Production
2. Fill in release notes
3. Submit for review
4. First review takes 1-7 days. Subsequent updates typically review in under 24 hours.

### First Submission Gotchas

- **Privacy policy URL required.** Even for a personal app. Host a simple privacy policy on GitHub Pages stating: "This app collects location data solely to calculate prayer times. All data is stored on your device. No data is transmitted to any server except the Aladhan API for prayer time calculation."
- **Screenshots required.** At least 2 phone screenshots. Take them from the preview APK running on your device.
- **App icon.** Must be a 512x512 PNG with no transparency. Use the app's existing mosque/crescent theme.
- **Feature graphic.** 1024x500 banner image displayed at the top of the Play Store listing.

---

## 6. Sideloading for Personal Use

This is the fastest path to running the app on your personal Android device without any Play Store involvement.

### Generate the APK

```bash
# Build a preview APK (production JS bundle, no dev client overhead)
eas build --platform android --profile preview
```

EAS Build takes ~10-15 minutes. When complete, it provides a download URL.

### Install the APK

**Method 1: Direct download on the device**

1. Open the EAS Build URL on your Android device's browser
2. Download the APK
3. Android will prompt "Allow installation from unknown sources" — enable it for the browser
4. Tap the downloaded APK to install

**Method 2: ADB from your computer**

```bash
# Download the APK to your computer first
eas build:list --platform android --status finished
# Copy the APK URL and download it, or use:
eas build --platform android --profile preview
# After build, download the artifact

# Connect phone via USB, enable USB debugging in Developer Options
adb install ./islamic-dashboard-preview.apk
```

**Method 3: Share via Google Drive / file transfer**

Upload the APK to Google Drive, open on phone, install.

### Updating Sideloaded Builds

For JS-only changes (no new native modules), use **EAS Update** to push over-the-air updates without rebuilding:

```bash
# Push an OTA update to the preview channel
eas update --channel preview --message "Fix prayer time notification timing"
```

The sideloaded app checks for updates on launch and applies them. This is dramatically faster than rebuilding the full APK.

For native changes (adding a new Expo plugin, updating SDK), you must rebuild the APK and reinstall.

---

## 7. Android-Specific UI Considerations

### Material Design 3 / Material You

The Islamic Dashboard has a custom dark theme (`#0f1b2d` background, `#3ecf8e` accent). This should be preserved rather than adopting full Material Design 3 theming. However, several MD3 patterns should be followed for a native feel:

**Use `react-native-paper` (v5+) selectively** for components that benefit from Material conventions:
- Bottom navigation tabs (Dashboard / Quran / Reminders)
- FAB (Floating Action Button) for "Add Reminder"
- Snackbars for transient feedback ("Bookmark saved", "Reminder deleted")
- Dialogs for bookmark label input and delete confirmation

Do not use Material components for the prayer times list, Quran reader, or the main card layout — the custom design from the prototype is more appropriate for the app's identity.

### Status Bar Theming

```typescript
// packages/mobile/app/_layout.tsx
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar
        style="light"                        // white text/icons
        backgroundColor="#0f1b2d"            // matches app background
        translucent={false}                  // status bar has its own background
      />
      {/* ... */}
    </>
  );
}
```

### Navigation Bar (Bottom System Bar)

Android's system navigation bar (back, home, recent) sits at the bottom. Configure it to match the app theme:

```typescript
import * as NavigationBar from 'expo-navigation-bar';

async function setupNavigationBar() {
  await NavigationBar.setBackgroundColorAsync('#0f1b2d');
  await NavigationBar.setButtonStyleAsync('light');  // light icons on dark bg
}
```

### Edge-to-Edge Display (Android 15+)

Android 15 enforces edge-to-edge by default — the app draws behind the status bar and navigation bar. Handle this with `react-native-safe-area-context`:

```typescript
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0f1b2d' }} edges={['top', 'bottom']}>
        {/* App content */}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
```

Also configure in `app.json`:

```jsonc
{
  "expo": {
    "android": {
      "navigationBar": {
        "backgroundColor": "#0f1b2d",
        "barStyle": "light-content"
      },
      "enableEdgeToEdge": true
    }
  }
}
```

### Dynamic Color (Material You)

Android 12+ extracts a color palette from the user's wallpaper (Material You / dynamic color). For this app, **do not adopt dynamic colors.** The Islamic Dashboard has a deliberate brand palette (dark blue, green accent, gold for Arabic text). Dynamic colors would undermine the visual identity. Explicitly opt out:

```typescript
// No @react-native-material/core or dynamic color integration needed
// The app uses its own theme constants throughout
```

### Gesture Navigation Compatibility

Modern Android uses gesture navigation (swipe from edges). Ensure:
- No interactive elements are placed within 20dp of the left/right edges (conflicts with back gesture)
- Expo Router's stack navigator already handles the back gesture correctly
- If using drawer navigation in the future, it must use `react-native-gesture-handler`'s drawer which respects the system back gesture zones

### RTL Layout for Arabic Content

The Quran reader displays Arabic text RTL. Use `I18nManager` for the Arabic sections:

```typescript
import { I18nManager, View, Text } from 'react-native';

function AyahBlock({ arabic, english }: { arabic: string; english: string }) {
  return (
    <View>
      <Text style={{ writingDirection: 'rtl', textAlign: 'right', fontSize: 22, color: '#f5c542' }}>
        {arabic}
      </Text>
      <Text style={{ writingDirection: 'ltr', textAlign: 'left', fontSize: 14, color: '#94a3b8' }}>
        {english}
      </Text>
    </View>
  );
}
```

Do **not** call `I18nManager.forceRTL(true)` globally — only the Arabic text sections should be RTL. The overall app layout stays LTR.

---

## 8. CI/CD Pipeline

### GitHub Actions Workflow for Automated Android Builds

```yaml
# .github/workflows/android-build.yml
name: Android Build

on:
  push:
    branches: [main]
    paths:
      - 'packages/mobile/**'
      - 'packages/shared/**'
      - 'eas.json'
  workflow_dispatch:              # allow manual trigger

env:
  EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

jobs:
  build-android:
    name: Build Android (EAS)
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci
        working-directory: packages/mobile

      - name: Setup EAS CLI
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Run shared package tests
        run: npm test
        working-directory: packages/shared

      - name: Run TypeScript type check
        run: npx tsc --noEmit
        working-directory: packages/mobile

      - name: Build Android (preview)
        if: github.ref == 'refs/heads/main'
        run: eas build --platform android --profile preview --non-interactive
        working-directory: packages/mobile

      - name: Build Android (production) on tag
        if: startsWith(github.ref, 'refs/tags/v')
        run: eas build --platform android --profile production --non-interactive --auto-submit
        working-directory: packages/mobile
```

### Generating the EXPO_TOKEN Secret

```bash
# Generate a personal access token at https://expo.dev/accounts/[username]/settings/access-tokens
# Or via CLI:
eas login
eas whoami
# Copy the token and add it as a GitHub repository secret named EXPO_TOKEN
```

### Version Bumping Strategy

Use `eas.json`'s `autoIncrement: true` for the `versionCode` (Android's internal build number). For the user-visible `version` string, manage it in `app.json` and bump it in a dedicated commit:

```bash
# Bump version in app.json (e.g., 1.0.0 -> 1.1.0)
# Use npm version or a manual edit, then commit:
cd packages/mobile
npm version minor
git add app.json package.json
git commit -m "Bump version to 1.1.0"
git tag v1.1.0
git push origin main --tags
# The tag push triggers the production build + auto-submit
```

### EAS Update for OTA (Fast JS Updates)

For changes that do not touch native modules, skip the full build and push an OTA update:

```yaml
# .github/workflows/ota-update.yml
name: OTA Update

on:
  push:
    branches: [main]
    paths:
      - 'packages/shared/**.ts'
      - 'packages/mobile/app/**'
      - 'packages/mobile/components/**'
      - '!packages/mobile/app.json'     # skip if native config changed

jobs:
  update:
    name: Push EAS Update
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
        working-directory: packages/mobile
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: eas update --channel preview --message "${{ github.event.head_commit.message }}" --non-interactive
        working-directory: packages/mobile
```

### Artifact Storage

EAS Build stores all build artifacts (APKs, AABs) in Expo's cloud for 30 days (free tier) or 90 days (paid). To keep permanent archives:

```yaml
      - name: Download build artifact
        run: |
          BUILD_URL=$(eas build:list --platform android --status finished --limit 1 --json | jq -r '.[0].artifacts.buildUrl')
          curl -L -o android-build.apk "$BUILD_URL"

      - name: Upload artifact to GitHub
        uses: actions/upload-artifact@v4
        with:
          name: android-preview-${{ github.sha }}
          path: android-build.apk
          retention-days: 90
```

---

## 9. Keeping Android Synced with Web/iOS

### How packages/shared/ Is Consumed

The monorepo uses npm/yarn workspaces. The mobile app imports shared code directly:

```typescript
// packages/mobile/app/(tabs)/quran.tsx
import { useQuran } from '@islamic-dashboard/shared/hooks/useQuran';
import { StorageService } from '@islamic-dashboard/shared/storage/StorageService';
import { parsePrayerTimes } from '@islamic-dashboard/shared/utils/prayer';
```

Configure the workspace in the root `package.json`:

```jsonc
// Root package.json
{
  "name": "islamic-dashboard",
  "private": true,
  "workspaces": [
    "packages/*"
  ]
}
```

And in the mobile app's `package.json`:

```jsonc
// packages/mobile/package.json
{
  "dependencies": {
    "@islamic-dashboard/shared": "*"
  }
}
```

Metro (React Native's bundler) needs to be configured to resolve the shared package:

```javascript
// packages/mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the shared package for changes
config.watchFolders = [monorepoRoot];

// Resolve modules from both the mobile package and the monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Ensure only one copy of React is used
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
```

### Platform-Specific File Extensions

When behavior must differ between Android, iOS, and web, use React Native's platform-specific extensions:

```
packages/shared/storage/
├── SQLiteAdapter.ts            # Shared interface + types
├── SQLiteAdapter.native.ts     # Implementation for iOS + Android (expo-sqlite)
├── SQLiteAdapter.web.ts        # Implementation for web (IndexedDB/localStorage)
```

Or for Android-only behavior:

```
packages/mobile/services/
├── notifications.ts            # Shared notification logic
├── notifications.android.ts    # Android-specific: channels, exact alarms, battery optimization
├── notifications.ios.ts        # iOS-specific: provisional auth, critical alerts
```

React Native's module resolver picks the right file automatically:
- `import './notifications'` on Android resolves to `notifications.android.ts`
- Same import on iOS resolves to `notifications.ios.ts`
- Falls back to `notifications.ts` if no platform-specific file exists

### Android-Only Packages

These packages are only used in the Android build (but are safe to install in the shared mobile package — they no-op or are tree-shaken on iOS):

| Package | Purpose | Android-Only Reason |
|---------|---------|-------------------|
| `expo-navigation-bar` | Theme the Android system navigation bar | iOS does not have a configurable navigation bar |
| `expo-intent-launcher` | Open Android Settings pages (battery optimization, app permissions) | iOS uses `Linking.openSettings()` instead |

Install them in the mobile package:

```bash
cd packages/mobile
npx expo install expo-navigation-bar expo-intent-launcher
```

Use platform checks to call them only on Android:

```typescript
import { Platform } from 'react-native';

if (Platform.OS === 'android') {
  const NavigationBar = require('expo-navigation-bar');
  await NavigationBar.setBackgroundColorAsync('#0f1b2d');
}
```

### Android-Specific Configuration in app.json

```jsonc
{
  "expo": {
    "name": "Islamic Dashboard",
    "slug": "islamic-dashboard",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "islamic-dashboard",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0f1b2d"
    },
    "android": {
      "package": "com.islamicdashboard.app",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0f1b2d"
      },
      "permissions": [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "SCHEDULE_EXACT_ALARM",
        "USE_EXACT_ALARM",
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "WAKE_LOCK"
      ],
      "enableEdgeToEdge": true,
      "blockedPermissions": [
        "ACCESS_BACKGROUND_LOCATION"
      ]
    },
    "plugins": [
      "expo-router",
      [
        "expo-notifications",
        {
          "sounds": ["./assets/sounds/adhan_short.wav"]
        }
      ],
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "Islamic Dashboard uses your location to show accurate prayer times for your area."
        }
      ],
      "expo-sqlite"
    ]
  }
}
```

### What Changes Require a Native Rebuild vs OTA Update

| Change Type | Example | Rebuild Required? |
|-------------|---------|-------------------|
| JS/TS code in `packages/shared/` | Fix prayer time parsing | No — OTA via EAS Update |
| JS/TS code in `packages/mobile/app/` | New screen, UI tweaks | No — OTA via EAS Update |
| `app.json` native config | Add permission, change package name | **Yes** — full EAS Build |
| Add/remove Expo plugin | Add `expo-av` for adhan audio | **Yes** — full EAS Build |
| Update Expo SDK | SDK 52 to SDK 53 | **Yes** — full EAS Build |
| Assets (images, sounds) | Add new notification sound | **Yes** — full EAS Build |

---

## Summary of Recommended Stack (Android)

| Concern | Recommendation |
|---------|---------------|
| Build system | EAS Build (cloud) |
| Development builds | APK via `development` profile |
| Production format | AAB via `production` profile |
| Distribution (testing) | Internal testing track on Play Store, or sideloaded APK |
| Distribution (release) | Google Play Store, production track |
| Notifications | `expo-notifications` with HIGH importance channel, `SCHEDULE_EXACT_ALARM`, battery optimization exemption prompt |
| Location | `expo-location` with coarse-only for v1, pre-permission explanation screen |
| Storage | `expo-sqlite` with relational schema and `updated_at` columns for future sync |
| CI/CD | GitHub Actions triggering EAS Build on push to main, EAS Update for JS-only changes |
| UI framework | Custom theme + selective `react-native-paper` components |
| OTA updates | EAS Update for JS changes, full rebuild only for native changes |
