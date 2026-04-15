import { useState, useEffect, useCallback, useRef } from 'react';
import type { DailyPrayerData, PrayerName, PrayerSettings } from '../models/prayer';
import { PRAYER_NAMES, DEFAULT_PRAYER_SETTINGS } from '../models/prayer';
import { fetchPrayerTimesByCity, fetchPrayerTimesByCoords } from '../api/aladhan';
import { getNextPrayer, minutesUntilPrayer, formatCountdown } from '../utils/dateHelpers';
import type { StorageService } from '../storage/types';

export interface PrayerTimesState {
  data: DailyPrayerData | null;
  settings: PrayerSettings;
  nextPrayer: { name: PrayerName; index: number } | null;
  countdown: string;
  loading: boolean;
  error: string | null;
}

export interface PrayerTimesActions {
  refresh: () => Promise<void>;
  updateSettings: (settings: Partial<PrayerSettings>) => Promise<void>;
}

export function usePrayerTimes(storage: StorageService): PrayerTimesState & PrayerTimesActions {
  const [data, setData] = useState<DailyPrayerData | null>(null);
  const [settings, setSettings] = useState<PrayerSettings>(DEFAULT_PRAYER_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState('');
  const [nextPrayer, setNextPrayer] = useState<{ name: PrayerName; index: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Load saved settings on mount
  useEffect(() => {
    storage.getPrayerSettings().then((saved) => {
      if (saved) setSettings(saved);
    });
  }, [storage]);

  const fetchData = useCallback(async (s: PrayerSettings) => {
    setLoading(true);
    setError(null);
    try {
      let result: DailyPrayerData;
      if (s.latitude != null && s.longitude != null) {
        result = await fetchPrayerTimesByCoords(s.latitude, s.longitude, s.method);
      } else {
        result = await fetchPrayerTimesByCity(s.city, s.country, s.method);
      }
      setData(result);

      const next = getNextPrayer(result.timings, PRAYER_NAMES);
      setNextPrayer(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch prayer times');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on settings change
  useEffect(() => {
    fetchData(settings);
  }, [settings, fetchData]);

  // Countdown timer — update every 30 seconds
  useEffect(() => {
    function updateCountdown() {
      if (!data) return;
      const next = getNextPrayer(data.timings, PRAYER_NAMES);
      setNextPrayer(next);
      if (next) {
        const mins = minutesUntilPrayer(data.timings[next.name]);
        setCountdown(formatCountdown(mins));
      } else {
        setCountdown('');
      }
    }
    updateCountdown();
    intervalRef.current = setInterval(updateCountdown, 30_000);
    return () => clearInterval(intervalRef.current);
  }, [data]);

  const refresh = useCallback(async () => {
    await fetchData(settings);
  }, [settings, fetchData]);

  const updateSettings = useCallback(async (partial: Partial<PrayerSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    await storage.savePrayerSettings(updated);
  }, [settings, storage]);

  return { data, settings, nextPrayer, countdown, loading, error, refresh, updateSettings };
}
