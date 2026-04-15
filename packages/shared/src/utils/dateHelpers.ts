import type { PrayerTimings, PrayerName, PRAYER_NAMES } from '../models/prayer';

/**
 * Parse a prayer time string (e.g. "05:15") into total minutes from midnight.
 */
export function prayerTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Get current time as minutes from midnight.
 */
export function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Parse a prayer time string into a Date object for today.
 */
export function prayerTimeToDate(timeStr: string, baseDate?: Date): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const date = baseDate ? new Date(baseDate) : new Date();
  date.setHours(h, m, 0, 0);
  return date;
}

/**
 * Determine which prayer is next based on current time.
 * Returns the prayer name and its index, or null if all prayers have passed.
 */
export function getNextPrayer(
  timings: PrayerTimings,
  prayerNames: readonly PrayerName[],
): { name: PrayerName; index: number } | null {
  const now = nowMinutes();
  for (let i = 0; i < prayerNames.length; i++) {
    const name = prayerNames[i];
    const time = timings[name];
    if (time && prayerTimeToMinutes(time) > now) {
      return { name, index: i };
    }
  }
  return null;
}

/**
 * Format minutes remaining into a human-readable countdown string.
 * e.g. 135 -> "2h 15m"
 */
export function formatCountdown(totalMinutes: number): string {
  if (totalMinutes <= 0) return 'Now';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * Calculate minutes until the next prayer from now.
 */
export function minutesUntilPrayer(timeStr: string): number {
  return prayerTimeToMinutes(timeStr) - nowMinutes();
}

/**
 * Format a Hijri date object into a display string.
 * e.g. "Wednesday · 15 Shawwal 1447 AH"
 */
export function formatHijriDate(hijri: {
  day: string;
  month: { en: string };
  year: string;
  weekday: { en: string };
}): string {
  return `${hijri.weekday.en} · ${hijri.day} ${hijri.month.en} ${hijri.year} AH`;
}

/**
 * Format a Unix timestamp to a locale date-time string.
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Generate a unique ID (timestamp + random suffix).
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
