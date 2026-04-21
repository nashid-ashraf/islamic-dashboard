import { useEffect, useState } from 'react';
import {
  useReminders,
  isCompletedToday,
  resolveNextFireAt,
} from '@islamic-dashboard/shared';
import type { Reminder, ReminderSchedule } from '@islamic-dashboard/shared';
import { storage } from '../services/storage';

type RepeatMode = 'none' | 'daily' | 'weekly';

/** Format a Date as "YYYY-MM-DDTHH:mm" for <input type="datetime-local">. */
function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function hhmm(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Translate the UI's legacy {timed, dueInput, repeat} fields into the typed schedule union. */
function buildSchedule(timed: boolean, dueInput: string, repeat: RepeatMode): ReminderSchedule {
  if (!timed && repeat === 'none') return { kind: 'none' };
  const dueMs = new Date(dueInput).getTime();
  if (repeat === 'none') return { kind: 'once', dueTime: dueMs };
  if (repeat === 'daily') return { kind: 'daily', timeOfDay: timed ? hhmm(dueMs) : null };
  // weekly: seed the weekday from the picker so existing UX of "weekly" keeps working
  const weekday = new Date(dueMs).getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  return { kind: 'weekly', weekdays: [weekday], timeOfDay: timed ? hhmm(dueMs) : null };
}

export default function Reminders() {
  useEffect(() => {
    document.title = 'Reminders · Islamic Dashboard';
  }, []);
  const { reminders, loading, addReminder, toggleComplete, deleteReminder } = useReminders(storage);
  const [title, setTitle] = useState('');
  const [dueInput, setDueInput] = useState(toLocalInput(Date.now() + 60 * 60 * 1000));
  const [timed, setTimed] = useState(true);
  const [repeat, setRepeat] = useState<RepeatMode>('none');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addReminder({
        title: title.trim(),
        schedule: buildSchedule(timed, dueInput, repeat),
      });
      setTitle('');
      setRepeat('none');
      setDueInput(toLocalInput(Date.now() + 60 * 60 * 1000));
    } finally {
      setSubmitting(false);
    }
  }

  const open = reminders.filter((r) => r.enabled && !isCompletedToday(r));
  const done = reminders.filter((r) => isCompletedToday(r));

  return (
    <div>
      <h1 style={{ color: 'var(--accent)', marginBottom: 16 }}>Reminders</h1>

      <form className="card" onSubmit={handleSubmit} aria-labelledby="new-reminder-heading">
        <h2 id="new-reminder-heading">New reminder</h2>
        <div className="field">
          <label htmlFor="r-title">Title</label>
          <input
            id="r-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Read 1 page of Quran"
            required
            maxLength={140}
          />
        </div>
        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={timed}
              onChange={(e) => setTimed(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Set a specific time
          </label>
        </div>
        {timed && (
          <div className="field">
            <label htmlFor="r-due">Due</label>
            <input
              id="r-due"
              type="datetime-local"
              value={dueInput}
              onChange={(e) => setDueInput(e.target.value)}
            />
          </div>
        )}
        <div className="field">
          <label htmlFor="r-repeat">Repeat</label>
          <select
            id="r-repeat"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value as RepeatMode)}
          >
            <option value="none">No repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <button className="btn" type="submit" disabled={submitting || !title.trim()}>
          {submitting ? 'Adding…' : 'Add reminder'}
        </button>
      </form>

      <section className="card" aria-labelledby="open-reminders-heading">
        <h2 id="open-reminders-heading">Open ({open.length})</h2>
        {loading && <p style={{ color: 'var(--muted)' }} role="status" aria-live="polite">Loading…</p>}
        {!loading && open.length === 0 && (
          <p style={{ color: 'var(--muted)' }}>No open reminders.</p>
        )}
        {open.map((r) => (
          <ReminderRow
            key={r.id}
            reminder={r}
            onToggle={() => toggleComplete(r.id)}
            onDelete={() => deleteReminder(r.id)}
          />
        ))}
      </section>

      {done.length > 0 && (
        <section className="card" aria-labelledby="completed-reminders-heading">
          <h2 id="completed-reminders-heading">Completed today ({done.length})</h2>
          {done.map((r) => (
            <ReminderRow
              key={r.id}
              reminder={r}
              onToggle={() => toggleComplete(r.id)}
              onDelete={() => deleteReminder(r.id)}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function scheduleLabel(reminder: Reminder): string {
  const nextFire = resolveNextFireAt(reminder);
  if (nextFire) return new Date(nextFire).toLocaleString();
  switch (reminder.schedule.kind) {
    case 'none':
      return 'Anytime';
    case 'once':
      return 'Past';
    case 'daily':
      return reminder.schedule.timeOfDay ? `Daily · ${reminder.schedule.timeOfDay}` : 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'prayerAnchor': {
      const { prayer, offsetMinutes } = reminder.schedule.anchor;
      const sign = offsetMinutes >= 0 ? '+' : '';
      return `${prayer} ${sign}${offsetMinutes}m`;
    }
  }
}

function ReminderRow({
  reminder,
  onToggle,
  onDelete,
}: {
  reminder: Reminder;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const completed = isCompletedToday(reminder);
  return (
    <div className={completed ? 'reminder-row complete' : 'reminder-row'}>
      <input
        type="checkbox"
        checked={completed}
        onChange={onToggle}
        aria-label={`Mark "${reminder.title}" ${completed ? 'incomplete' : 'complete'}`}
      />
      <div className="reminder-body">
        <div className="reminder-title">{reminder.title}</div>
        <div className="reminder-meta">
          {scheduleLabel(reminder)}
          {reminder.builtIn && ' · built-in'}
        </div>
      </div>
      <button className="btn btn-danger" onClick={onDelete} aria-label={`Delete ${reminder.title}`}>
        {reminder.builtIn ? 'Hide' : 'Delete'}
      </button>
    </div>
  );
}
