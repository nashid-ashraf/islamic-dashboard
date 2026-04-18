import { useEffect, useState } from 'react';
import {
  usePrayerTimes,
  useReminders,
  prayerTimeToDate,
} from '@islamic-dashboard/shared';
import type { NotificationPermissionState } from '@islamic-dashboard/shared';
import { storage } from './services/storage';
import { notificationScheduler } from './services/notifications';

/**
 * Root-level component that keeps scheduled notifications in sync with app state.
 *
 * Lives at the app root so scheduling happens on every boot regardless of which
 * route the user lands on — critical because the web scheduler is in-memory and
 * loses all timers on reload. Re-subscribes to the same hooks Dashboard uses;
 * with API-level caching there's no extra network cost.
 *
 * Listens for `visibilitychange` so permission changes made in another tab or
 * via browser UI are picked up when the user returns to the app.
 */
export function NotificationOrchestrator() {
  const prayer = usePrayerTimes(storage);
  const { reminders } = useReminders(storage);
  const [permission, setPermission] = useState<NotificationPermissionState>(
    () => notificationScheduler.currentPermission(),
  );

  useEffect(() => {
    const refresh = () => setPermission(notificationScheduler.currentPermission());
    const unsubscribe = notificationScheduler.onPermissionChange(refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  // Next prayer
  useEffect(() => {
    notificationScheduler.cancelByPrefix('prayer:');
    if (permission !== 'granted' || !prayer.data || !prayer.nextPrayer) return;
    const when = prayerTimeToDate(prayer.data.timings[prayer.nextPrayer.name]);
    notificationScheduler.schedule({
      key: `prayer:${prayer.nextPrayer.name}`,
      whenMs: when.getTime(),
      title: `Time for ${prayer.nextPrayer.name}`,
      body: `${prayer.settings.city} · ${prayer.data.timings[prayer.nextPrayer.name]}`,
    });
  }, [prayer.data, prayer.nextPrayer, prayer.settings.city, permission]);

  // Upcoming timed reminders
  useEffect(() => {
    notificationScheduler.cancelByPrefix('reminder:');
    if (permission !== 'granted') return;
    const now = Date.now();
    for (const r of reminders) {
      if (r.complete || r.dueTime === null || r.dueTime <= now) continue;
      notificationScheduler.schedule({
        key: `reminder:${r.id}`,
        whenMs: r.dueTime,
        title: r.title,
        body: 'Reminder is due',
      });
    }
  }, [reminders, permission]);

  return null;
}
