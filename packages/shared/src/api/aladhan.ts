import type { DailyPrayerData, PrayerTimings, HijriDate } from '../models/prayer';

const BASE_URL = 'https://api.aladhan.com/v1';

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

/**
 * Fetch prayer times by city and country.
 */
export async function fetchPrayerTimesByCity(
  city: string,
  country: string,
  method: number = 5,
): Promise<DailyPrayerData> {
  const url = `${BASE_URL}/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Aladhan API error: ${res.status}`);
  const json = (await res.json()) as AladhanResponse;
  if (json.code !== 200) throw new Error(json.status || 'Aladhan API error');
  return mapResponse(json);
}

/**
 * Fetch prayer times by geographic coordinates.
 */
export async function fetchPrayerTimesByCoords(
  latitude: number,
  longitude: number,
  method: number = 5,
): Promise<DailyPrayerData> {
  const url = `${BASE_URL}/timings/${Math.floor(Date.now() / 1000)}?latitude=${latitude}&longitude=${longitude}&method=${method}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Aladhan API error: ${res.status}`);
  const json = (await res.json()) as AladhanResponse;
  if (json.code !== 200) throw new Error(json.status || 'Aladhan API error');
  return mapResponse(json);
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
