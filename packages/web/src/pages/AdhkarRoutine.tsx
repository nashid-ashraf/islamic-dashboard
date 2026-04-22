import { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import {
  useAdhkarRoutine,
  ADHKAR_ROUTINES,
} from '@islamic-dashboard/shared';
import type {
  AdhkarRoutineId,
  ResolvedDua,
} from '@islamic-dashboard/shared';
import { quranCorpus } from '../services/quranCorpus';

const VALID_ROUTINES: AdhkarRoutineId[] = [
  'morning',
  'evening',
  'sleep',
  'waking',
  'friday-post-asr',
  'post-salah',
];

function isValidRoutine(value: string | undefined): value is AdhkarRoutineId {
  return !!value && (VALID_ROUTINES as string[]).includes(value);
}

export default function AdhkarRoutinePage() {
  const { routine: routineParam } = useParams<{ routine: string }>();
  if (!isValidRoutine(routineParam)) {
    return <Navigate to="/adhkar/morning" replace />;
  }
  return <AdhkarRoutineView routineId={routineParam} />;
}

function AdhkarRoutineView({ routineId }: { routineId: AdhkarRoutineId }) {
  const { routine, resolvedDuas, resolving } = useAdhkarRoutine(routineId, {
    corpus: quranCorpus,
  });

  useEffect(() => {
    document.title = `${routine.label} · Islamic Dashboard`;
  }, [routine.label]);

  return (
    <div>
      <h1 style={{ color: 'var(--accent)', marginBottom: 8 }}>{routine.label}</h1>

      <nav className="toolbar" aria-label="Adhkar routines" style={{ marginBottom: 12 }}>
        {(['morning', 'evening', 'sleep', 'waking'] as const).map((id) => (
          <Link
            key={id}
            to={`/adhkar/${id}`}
            className={id === routineId ? 'btn' : 'btn btn-ghost'}
            style={{ textDecoration: 'none' }}
          >
            {ADHKAR_ROUTINES[id].label}
          </Link>
        ))}
      </nav>

      {routine.curationNote && (
        <section
          className="card"
          role="note"
          aria-labelledby="curation-heading"
          style={{ borderColor: 'var(--border)' }}
        >
          <h2 id="curation-heading" style={{ fontSize: '0.95rem', marginBottom: 4 }}>
            Curation status
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: 0 }}>
            {routine.curationNote}
          </p>
        </section>
      )}

      {resolving && (
        <p role="status" aria-live="polite" style={{ color: 'var(--muted)' }}>
          Resolving Quran references…
        </p>
      )}

      {resolvedDuas.length === 0 && !resolving && (
        <section className="card" aria-labelledby="empty-heading">
          <h2 id="empty-heading">No adhkar bundled yet for this routine.</h2>
          <p style={{ color: 'var(--muted)' }}>
            Content curation is pending — see <code>packages/shared/src/data/adhkar/LICENSES.md</code>.
          </p>
        </section>
      )}

      {resolvedDuas.map((d) => (
        <DuaCard key={d.id} dua={d} />
      ))}
    </div>
  );
}

function DuaCard({ dua }: { dua: ResolvedDua }) {
  const [count, setCount] = useState(0);
  const target = dua.repetitions;
  const done = count >= target;

  return (
    <article className="card" aria-labelledby={`dua-${dua.id}-heading`}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <h2 id={`dua-${dua.id}-heading`} style={{ fontSize: '0.95rem', color: 'var(--muted)' }}>
          {dua.order}. {dua.source}
        </h2>
        <span style={{ fontSize: '0.85rem', color: done ? 'var(--accent)' : 'var(--muted)' }}>
          {count} / {target}
        </span>
      </header>

      {dua.resolvedArabicAyahs ? (
        dua.resolvedArabicAyahs.map((a, i) => (
          <p
            key={i}
            className="ayah-arabic"
            lang="ar"
            dir="rtl"
            style={{ marginBottom: 6 }}
          >
            {a.text}
            {a.ayah > 0 && (
              <span
                aria-hidden="true"
                style={{ fontSize: '0.8rem', color: 'var(--muted)', marginInlineStart: 6 }}
              >
                ﴿{a.ayah}﴾
              </span>
            )}
          </p>
        ))
      ) : dua.quranRef ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          Arabic text will appear when the Quran corpus is downloaded, or{' '}
          <Link
            to={`/quran?surah=${dua.quranRef.surah}&ayah=${dua.quranRef.ayahFrom}`}
            style={{ color: 'var(--accent)' }}
          >
            open in Quran reader →
          </Link>
        </p>
      ) : (
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          Text pending curation.
        </p>
      )}

      {dua.translations?.en && (
        <p className="ayah-translation" style={{ marginTop: 8 }}>
          {dua.translations.en}
        </p>
      )}
      {dua.translations?.bn && (
        <p className="ayah-translation" lang="bn" style={{ marginTop: 4 }}>
          {dua.translations.bn}
        </p>
      )}

      {dua.benefit && (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: 8, fontStyle: 'italic' }}>
          {dua.benefit}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button
          className="btn"
          onClick={() => setCount((c) => Math.min(target, c + 1))}
          disabled={done}
          aria-label={`Increment count for ${dua.source}`}
        >
          {done ? 'Completed' : 'Count'}
        </button>
        {count > 0 && !done && (
          <button
            className="btn btn-ghost"
            onClick={() => setCount(0)}
            aria-label={`Reset count for ${dua.source}`}
          >
            Reset
          </button>
        )}
      </div>
    </article>
  );
}
