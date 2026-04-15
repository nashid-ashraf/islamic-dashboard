export default function Dashboard() {
  return (
    <div>
      <h1 style={{ color: 'var(--accent)', marginBottom: 16 }}>Islamic Daily Dashboard</h1>
      <div className="grid">
        <div className="card">
          <h2>Prayer Times</h2>
          <p style={{ color: 'var(--muted)' }}>Prayer times will appear here.</p>
        </div>
        <div className="card">
          <h2>Continue Reading</h2>
          <p style={{ color: 'var(--muted)' }}>Quran reading progress will appear here.</p>
        </div>
        <div className="card">
          <h2>Upcoming Reminders</h2>
          <p style={{ color: 'var(--muted)' }}>Your next reminders will appear here.</p>
        </div>
      </div>
    </div>
  );
}
