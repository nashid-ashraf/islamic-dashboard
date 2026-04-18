import type { DailyPrayerData, PrayerTimings, HijriDate } from '../models/prayer';
import { httpFetchJson } from './httpClient';

const BASE_URL = 'https://api.aladhan.com/v1';

/** Prayer timings are stable within a calendar day; 6h is a safe in-memory TTL. */
const PRAYER_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
/** Network timeout — mobile networks can be slow. */
const REQUEST_TIMEOUT_MS = 10_000;

/** Raw Aladhan API response shape. */
interface AladhanResponse {
  code: number;
  status: string;
  data: {
    timings: Record<string, string>;
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
      method: { id: number; name: string; params: { Fajr: number; Isha: number } };
    };
  };
}

/** Local-date path segment in AlAdhan's DD-MM-YYYY format. */
function todayPath(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

async function fetchAladhan(path: string, params: Record<string, string | number>): Promise<DailyPrayerData> {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  );
  const url = `${BASE_URL}${path}?${qs.toString()}`;
  const json = await httpFetchJson<AladhanResponse>(url, {
    timeoutMs: REQUEST_TIMEOUT_MS,
    cacheTtlMs: PRAYER_CACHE_TTL_MS,
  });
  if (json.code !== 200) throw new Error(json.status || 'Aladhan API error');
  return mapResponse(json);
}

/** Fetch prayer times by city and country. Cached per (city, country, method, date). */
export async function fetchPrayerTimesByCity(
  city: string,
  country: string,
  method: number = 5,
): Promise<DailyPrayerData> {
  return fetchAladhan(`/timingsByCity/${todayPath()}`, { city, country, method });
}

/** Fetch prayer times by coordinates. Cached per (lat, lng, method, date). */
export async function fetchPrayerTimesByCoords(
  latitude: number,
  longitude: number,
  method: number = 5,
): Promise<DailyPrayerData> {
  return fetchAladhan(`/timings/${todayPath()}`, { latitude, longitude, method });
}

function mapResponse(json: AladhanResponse): DailyPrayerData {
  const { data } = json;
  const timings: PrayerTimings = {
    Fajr: data.timings.Fajr?.replace(/\s*\(.*\)/, '') ?? '',
    Sunrise: data.timings.Sunrise?.replace(/\s*\(.*\)/, '') ?? '',
    Dhuhr: data.timings.Dhuhr?.replace(/\s*\(.*\)/, '') ?? '',
    Asr: data.timings.Asr?.replace(/\s*\(.*\)/, '') ?? '',
    Maghrib: data.timings.Maghrib?.replace(/\s*\(.*\)/, '') ?? '',
    Isha: data.timings.Isha?.replace(/\s*\(.*\)/, '') ?? '',
  };
  return {
    timings,
    date: data.date,
    meta: data.meta,
  };
}
