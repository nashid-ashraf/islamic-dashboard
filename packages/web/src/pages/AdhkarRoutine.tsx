import { useEffect, useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import {
  useAdhkarRoutine,
  pickTranslation,
  ADHKAR_ROUTINES,
  TRANSLATION_EDITIONS,
  EDITIONS,
} from '@islamic-dashboard/shared';
import type {
  AdhkarRoutineId,
  Dua,
  TranslationEditionId,
} from '@islamic-dashboard/shared';

const VALID_ROUTINES: AdhkarRoutineId[] = [
  'morning',
  'evening',
  'sleep',
  'waking',
  'friday-post-asr',
  'post-salah',
];

const PREFERRED_TRANSLATION_KEY = 'adhkar_preferred_translation';

function isValidRoutine(value: string | undefined): value is AdhkarRoutineId {
  return !!value && (VALID_ROUTINES as string[]).includes(value);
}

function readPreferredTranslation(): TranslationEditionId {
  const saved = localStorage.getItem(PREFERRED_TRANSLATION_KEY);
  if (saved && (TRANSLATION_EDITIONS as readonly string[]).includes(saved)) {
    return saved as TranslationEditionId;
  }
  return 'en-sahih';
}

export default function AdhkarRoutinePage() {
  const { routine: routineParam } = useParams<{ routine: string }>();
  if (!isValidRoutine(routineParam)) {
    return <Navigate to="/adhkar/morning" replace />;
  }
  return <AdhkarRoutineView routineId={routineParam} />;
}

function AdhkarRoutineView({ routineId }: { routineId: AdhkarRoutineId }) {
  const { routine } = useAdhkarRoutine(routineId);

  const [preferredTranslation, setPreferredTranslation] = useState<TranslationEditionId>(
    () => readPreferredTranslation(),
  );
  useEffect(() => {
    localStorage.setItem(PREFERRED_TRANSLATION_KEY, preferredTranslation);
  }, [preferredTranslation]);

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
        <label style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          Translation:
          <select
            value={preferredTranslation}
            onChange={(e) => setPreferredTranslation(e.target.value as TranslationEditionId)}
            style={{ padding: '4px 8px', background: 'var(--background)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6 }}
            aria-label="Preferred translation"
          >
            {TRANSLATION_EDITIONS.map((ed) => (
              <option key={ed} value={ed}>
                {EDITIONS[ed].label}
              </option>
            ))}
          </select>
        </label>
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

      {routine.duas.length === 0 && (
        <section className="card" aria-labelledby="empty-heading">
          <h2 id="empty-heading">No adhkar bundled yet for this routine.</h2>
          <p style={{ color: 'var(--muted)' }}>
            Content curation is pending — see{' '}
            <code>packages/shared/src/data/adhkar/LICENSES.md</code>.
          </p>
        </section>
      )}

      {routine.duas.map((d) => (
        <DuaCard key={d.id} dua={d} preferredTranslation={preferredTranslation} />
      ))}
    </div>
  );
}

function DuaCard({
  dua,
  preferredTranslation,
}: {
  dua: Dua;
  preferredTranslation: TranslationEditionId;
}) {
  const [count, setCount] = useState(0);
  const target = dua.repetitions;
  const done = count >= target;
  const translation = pickTranslation(dua, preferredTranslation);

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

      <p className="ayah-arabic" lang="ar" dir="rtl" style={{ marginBottom: 6 }}>
        {dua.arabic}
      </p>

      {dua.transliteration && (
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem', fontStyle: 'italic', marginBottom: 6 }}>
          {dua.transliteration}
        </p>
      )}

      {translation ? (
        <div style={{ marginTop: 8 }}>
          <p
            className="ayah-translation"
            lang={translation.editionId === 'bn-muhiuddin' ? 'bn' : 'en'}
          >
            {translation.text}
          </p>
          {translation.isFallback && (
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', fontStyle: 'italic', marginTop: 4 }}>
              Showing {EDITIONS[translation.editionId].label} — {EDITIONS[preferredTranslation].label} not available for this dua.
            </p>
          )}
        </div>
      ) : (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', fontStyle: 'italic', marginTop: 8 }}>
          Translation pending.
        </p>
      )}

      {dua.benefit && (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: 8, fontStyle: 'italic' }}>
          {dua.benefit}
        </p>
      )}

      {dua.quranRef && (
        <p style={{ fontSize: '0.8rem', marginTop: 8 }}>
          <Link
            to={`/quran?surah=${dua.quranRef.surah}&ayah=${dua.quranRef.ayahFrom}`}
            style={{ color: 'var(--accent)' }}
          >
            Open in Quran reader →
          </Link>
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
