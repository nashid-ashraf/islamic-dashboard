import { useState } from 'react';
import { useReminders } from '@islamic-dashboard/shared';
import type { Reminder } from '@islamic-dashboard/shared';
import { storage } from '../services/storage';

type Repeat = 'none' | 'daily' | 'weekly';

/** Format a Date as "YYYY-MM-DDTHH:mm" for <input type="datetime-local">. */
function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Reminders() {
  const { reminders, loading, addReminder, toggleComplete, deleteReminder } = useReminders(storage);
  const [title, setTitle] = useState('');
  const [dueInput, setDueInput] = useState(toLocalInput(Date.now() + 60 * 60 * 1000));
  const [timed, setTimed] = useState(true);
  const [repeat, setRepeat] = useState<Repeat>('none');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addReminder({
        title: title.trim(),
        dueTime: timed ? new Date(dueInput).getTime() : null,
        repeat,
      });
      setTitle('');
      setRepeat('none');
      setDueInput(toLocalInput(Date.now() + 60 * 60 * 1000));
    } finally {
      setSubmitting(false);
    }
  }

  const open = reminders.filter((r) => !r.complete);
  const done = reminders.filter((r) => r.complete);

  return (
    <div>
      <h1 style={{ color: 'var(--accent)', marginBottom: 16 }}>Reminders</h1>

      <form className="card" onSubmit={handleSubmit}>
        <h2>New reminder</h2>
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
            onChange={(e) => setRepeat(e.target.value as Repeat)}
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

      <div className="card">
        <h2>Open ({open.length})</h2>
        {loading && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
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
      </div>

      {done.length > 0 && (
        <div className="card">
          <h2>Completed ({done.length})</h2>
          {done.map((r) => (
            <ReminderRow
              key={r.id}
              reminder={r}
              onToggle={() => toggleComplete(r.id)}
              onDelete={() => deleteReminder(r.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
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
  return (
    <div className={reminder.complete ? 'reminder-row complete' : 'reminder-row'}>
      <input
        type="checkbox"
        checked={reminder.complete}
        onChange={onToggle}
        aria-label={`Mark "${reminder.title}" ${reminder.complete ? 'incomplete' : 'complete'}`}
      />
      <div className="reminder-body">
        <div className="reminder-title">{reminder.title}</div>
        <div className="reminder-meta">
          {reminder.dueTime ? new Date(reminder.dueTime).toLocaleString() : 'Anytime'}
          {reminder.repeat !== 'none' && ` · repeats ${reminder.repeat}`}
        </div>
      </div>
      <button className="btn btn-danger" onClick={onDelete} aria-label={`Delete ${reminder.title}`}>
        Delete
      </button>
    </div>
  );
}
