import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  usePrayerTimes,
  useReadingPosition,
  useReminders,
  PRAYER_NAMES,
  formatHijriDate,
  isCompletedToday,
  resolveNextFireAt,
} from '@islamic-dashboard/shared';
import type { PrayerName, NotificationPermissionState } from '@islamic-dashboard/shared';
import { storage } from '../services/storage';
import { geolocationProvider } from '../services/geolocation';
import { notificationScheduler } from '../services/notifications';

export default function Dashboard() {
  useEffect(() => {
    document.title = 'Dashboard · Islamic Dashboard';
  }, []);
  const prayer = usePrayerTimes(storage);
  const reading = useReadingPosition(storage);
  const { reminders } = useReminders(storage);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermissionState>(
    () => notificationScheduler.currentPermission(),
  );

  async function handleDetectLocation() {
    setLocating(true);
    setLocationError(null);
    try {
      const coords = await geolocationProvider.getCurrentPosition();
      await prayer.updateSettings({ latitude: coords.latitude, longitude: coords.longitude });
    } catch (e) {
      setLocationError(e instanceof Error ? e.message : 'Failed to detect location');
    } finally {
      setLocating(false);
    }
  }

  async function handleEnableNotifications() {
    const result = await notificationScheduler.requestPermission();
    setPermission(result);
  }

  const upcomingReminders = reminders
    .filter((r) => r.enabled && !isCompletedToday(r))
    .slice(0, 3);

  return (
    <div>
      <h1 style={{ color: 'var(--accent)', marginBottom: 16 }}>Islamic Daily Dashboard</h1>

      {permission === 'default' && (
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Enable notifications to get prayer & reminder alerts.</span>
          <button className="btn" onClick={handleEnableNotifications}>Enable</button>
        </div>
      )}

      <div className="grid">
        <section className="card" aria-labelledby="prayer-times-heading">
          <h2 id="prayer-times-heading">Prayer Times</h2>
          {prayer.loading && <p style={{ color: 'var(--muted)' }} role="status" aria-live="polite">Loading…</p>}
          {prayer.error && <p style={{ color: 'var(--error)' }} role="alert">{prayer.error}</p>}
          {prayer.data && (
            <>
              <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 12 }}>
                {prayer.settings.city} · {formatHijriDate(prayer.data.date.hijri)}
              </p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {PRAYER_NAMES.map((name: PrayerName) => {
                  const isNext = prayer.nextPrayer?.name === name;
                  return (
                    <li
                      key={name}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '6px 0',
                        color: isNext ? 'var(--gold)' : 'var(--text)',
                        fontWeight: isNext ? 600 : 400,
                      }}
                    >
                      <span>{name}{isNext ? ' · next' : ''}</span>
                      <span>{prayer.data!.timings[name]}</span>
                    </li>
                  );
                })}
              </ul>
              {prayer.nextPrayer && (
                <p style={{ marginTop: 12, color: 'var(--accent)', fontWeight: 600 }}>
                  {prayer.nextPrayer.name} in {prayer.countdown || '…'}
                </p>
              )}
              <button
                className="btn"
                style={{ marginTop: 12 }}
                onClick={handleDetectLocation}
                disabled={locating}
              >
                {locating ? 'Detecting…' : 'Use my location'}
              </button>
              {locationError && (
                <p style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: 6 }} role="alert">
                  {locationError}
                </p>
              )}
            </>
          )}
        </section>

        <section className="card" aria-labelledby="continue-reading-heading">
          <h2 id="continue-reading-heading">Continue Reading</h2>
          {reading.loading && <p style={{ color: 'var(--muted)' }} role="status" aria-live="polite">Loading…</p>}
          {!reading.loading && !reading.position && (
            <p style={{ color: 'var(--muted)' }}>
              No saved position yet. <Link to="/quran" style={{ color: 'var(--accent)' }}>Start reading →</Link>
            </p>
          )}
          {reading.position && (
            <>
              <p style={{ fontSize: '1.1rem', marginBottom: 6 }}>
                {reading.position.surahName}
              </p>
              <p style={{ color: 'var(--muted)', marginBottom: 12 }}>
                Ayah {reading.position.ayahNum}
              </p>
              <Link
                to={`/quran?surah=${reading.position.surah}&ayah=${reading.position.ayahNum}`}
                className="btn"
                style={{ textDecoration: 'none', display: 'inline-block' }}
              >
                Resume →
              </Link>
            </>
          )}
        </section>

        <section className="card" aria-labelledby="upcoming-reminders-heading">
          <h2 id="upcoming-reminders-heading">Upcoming Reminders</h2>
          {upcomingReminders.length === 0 && (
            <p style={{ color: 'var(--muted)' }}>
              No open reminders. <Link to="/reminders" style={{ color: 'var(--accent)' }}>Add one →</Link>
            </p>
          )}
          {upcomingReminders.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {upcomingReminders.map((r) => {
                const nextFire = resolveNextFireAt(r);
                return (
                  <li key={r.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>{r.title}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                      {nextFire ? new Date(nextFire).toLocaleString() : 'Anytime'}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
