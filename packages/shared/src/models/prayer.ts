/** Individual prayer timings returned by the Aladhan API. */
export interface PrayerTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Sunset?: string;
  Midnight?: string;
  Imsak?: string;
}

/** Hijri date information from the Aladhan API. */
export interface HijriDate {
  day: string;
  month: { number: number; en: string; ar: string };
  year: string;
  weekday: { en: string; ar: string };
  designation: { abbreviated: string; expanded: string };
}

/** Full prayer data for a single day. */
export interface DailyPrayerData {
  timings: PrayerTimings;
  date: {
    readable: string;
    timestamp: string;
    hijri: HijriDate;
    gregorian: { date: string; day: string; month: { number: number; en: string } };
  };
  meta: {
    latitude: number;
    longitude: number;
    timezone: string;
    method: CalculationMethod;
  };
}

/** Aladhan calculation method. */
export interface CalculationMethod {
  id: number;
  name: string;
  params: { Fajr: number; Isha: number };
}

/** All supported calculation method IDs with labels. */
export const CALCULATION_METHODS: { id: number; name: string }[] = [
  { id: 1, name: 'University of Islamic Sciences, Karachi' },
  { id: 2, name: 'ISNA (North America)' },
  { id: 3, name: 'Muslim World League' },
  { id: 4, name: 'Umm Al-Qura, Makkah' },
  { id: 5, name: 'Egyptian General Authority' },
  { id: 8, name: 'Gulf Region' },
  { id: 15, name: 'Diyanet (Turkey)' },
];

/** The six prayer names displayed to the user. */
export const PRAYER_NAMES = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;

export type PrayerName = (typeof PRAYER_NAMES)[number];

/** User's prayer settings stored locally. */
export interface PrayerSettings {
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  method: number;
}

export const DEFAULT_PRAYER_SETTINGS: PrayerSettings = {
  city: 'Dhaka',
  country: 'Bangladesh',
  latitude: null,
  longitude: null,
  method: 5,
};
