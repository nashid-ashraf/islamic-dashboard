import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  usePrayerTimes,
  useReadingPosition,
  useReminders,
  PRAYER_NAMES,
  formatHijriDate,
} from '@islamic-dashboard/shared';
import type { PrayerName } from '@islamic-dashboard/shared';
import { storage } from '../services/storage';
import { getCurrentPosition } from '../services/geolocation';
import {
  currentPermission,
  requestPermission,
  scheduleAt,
  cancelByPrefix,
} from '../services/notifications';
import { prayerTimeToDate } from '@islamic-dashboard/shared';

export default function Dashboard() {
  const prayer = usePrayerTimes(storage);
  const reading = useReadingPosition(storage);
  const { reminders } = useReminders(storage);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [permission, setPermission] = useState(currentPermission());

  // Schedule a notification for the next prayer whenever the "next prayer" changes.
  useEffect(() => {
    cancelByPrefix('prayer:');
    if (!prayer.data || !prayer.nextPrayer) return;
    if (permission !== 'granted') return;
    const when = prayerTimeToDate(prayer.data.timings[prayer.nextPrayer.name]);
    scheduleAt(
      `prayer:${prayer.nextPrayer.name}`,
      when.getTime(),
      `Time for ${prayer.nextPrayer.name}`,
      `${prayer.settings.city} · ${prayer.data.timings[prayer.nextPrayer.name]}`,
    );
  }, [prayer.data, prayer.nextPrayer, prayer.settings.city, permission]);

  // Schedule notifications for each upcoming timed reminder.
  useEffect(() => {
    cancelByPrefix('reminder:');
    if (permission !== 'granted') return;
    const now = Date.now();
    reminders
      .filter((r) => !r.complete && r.dueTime !== null && r.dueTime > now)
      .forEach((r) => {
        scheduleAt(`reminder:${r.id}`, r.dueTime!, r.title, 'Reminder is due');
      });
  }, [reminders, permission]);

  async function handleDetectLocation() {
    setLocating(true);
    setLocationError(null);
    try {
      const coords = await getCurrentPosition();
      await prayer.updateSettings({ latitude: coords.latitude, longitude: coords.longitude });
    } catch (e) {
      setLocationError(e instanceof Error ? e.message : 'Failed to detect location');
    } finally {
      setLocating(false);
    }
  }

  async function handleEnableNotifications() {
    const result = await requestPermission();
    setPermission(result);
  }

  const upcomingReminders = reminders
    .filter((r) => !r.complete)
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
        <div className="card">
          <h2>Prayer Times</h2>
          {prayer.loading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
          {prayer.error && <p style={{ color: 'var(--error)' }}>{prayer.error}</p>}
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
                <p style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: 6 }}>
                  {locationError}
                </p>
              )}
            </>
          )}
        </div>

        <div className="card">
          <h2>Continue Reading</h2>
          {reading.loading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
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
        </div>

        <div className="card">
          <h2>Upcoming Reminders</h2>
          {upcomingReminders.length === 0 && (
            <p style={{ color: 'var(--muted)' }}>
              No open reminders. <Link to="/reminders" style={{ color: 'var(--accent)' }}>Add one →</Link>
            </p>
          )}
          {upcomingReminders.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {upcomingReminders.map((r) => (
                <li key={r.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>{r.title}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                    {r.dueTime ? new Date(r.dueTime).toLocaleString() : 'Anytime'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
