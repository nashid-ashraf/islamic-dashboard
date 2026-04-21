import { useEffect, useRef, useState } from 'react';
import type { HydrationProgress, QuranOfflineCorpus } from '@islamic-dashboard/shared';
import { EDITIONS } from '@islamic-dashboard/shared';

const CONSENT_KEY = 'quran_corpus_consent';
type Consent = 'accepted' | 'declined' | null;

function readConsent(): Consent {
  const v = localStorage.getItem(CONSENT_KEY);
  return v === 'accepted' || v === 'declined' ? v : null;
}

interface Props {
  corpus: QuranOfflineCorpus;
}

/**
 * One-time consent banner for the opt-in full-Quran offline cache (FR-EX19).
 *
 * Logic:
 * - Never asks twice. `'declined'` is terminal (user can re-enable via settings
 *   later — that UI is not in this scaffold).
 * - If consent is already `'accepted'` but the corpus is not present (e.g. iOS
 *   Safari ITP evicted IndexedDB), silently re-hydrates — no user prompt.
 * - Uses an AbortController tied to component unmount so React StrictMode's
 *   double-mount doesn't leave orphan network fetches or partial writes.
 */
export function QuranCorpusConsent({ corpus }: Props) {
  const [state, setState] = useState<
    'checking' | 'prompting' | 'hydrating' | 'idle' | 'failed'
  >('checking');
  const [progress, setProgress] = useState<HydrationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const consent = readConsent();
      const present = await corpus.isPresent();
      if (cancelled) return;

      if (present) {
        setState('idle');
        return;
      }
      if (consent === 'declined') {
        setState('idle');
        return;
      }
      if (consent === 'accepted') {
        // Silent re-hydrate path (ITP eviction recovery).
        runHydration();
        return;
      }
      setState('prompting');
    })();
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corpus]);

  function runHydration() {
    setState('hydrating');
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    corpus
      .hydrate((p) => setProgress(p), controller.signal)
      .then(() => {
        if (!controller.signal.aborted) setState('idle');
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'Download failed');
        setState('failed');
      });
  }

  function handleAccept() {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    runHydration();
  }
  function handleDecline() {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setState('idle');
  }
  function handleDismissForSession() {
    // Don't write to localStorage — banner reappears next session.
    setState('idle');
  }

  if (state === 'checking' || state === 'idle') return null;

  if (state === 'prompting') {
    return (
      <section
        className="card"
        role="region"
        aria-labelledby="quran-cache-heading"
        style={{ borderColor: 'var(--accent)' }}
      >
        <h2 id="quran-cache-heading" style={{ marginBottom: 6 }}>
          Download the full Quran for offline use?
        </h2>
        <p style={{ color: 'var(--muted)', marginBottom: 10, fontSize: '0.9rem' }}>
          Caches Arabic (Uthmani) plus three translations — Saheeh International, Mustafa Khattab (Clear Quran), and Bengali (Muhiuddin Khan). Roughly 7 MB. One-time download; works entirely offline after that.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={handleAccept}>Download</button>
          <button className="btn btn-ghost" onClick={handleDismissForSession}>Not now</button>
          <button className="btn btn-ghost" onClick={handleDecline}>Don't ask again</button>
        </div>
      </section>
    );
  }

  if (state === 'hydrating') {
    const label = progress
      ? `Downloading ${EDITIONS[progress.currentEdition].label} — ${progress.completed} / ${progress.total}`
      : 'Preparing download…';
    const pct = progress ? Math.round((progress.completed / progress.total) * 100) : 0;
    return (
      <section className="card" role="status" aria-live="polite">
        <p style={{ marginBottom: 8 }}>{label}</p>
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{
            height: 6,
            background: 'var(--border)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: 'var(--accent)',
              transition: 'width 120ms linear',
            }}
          />
        </div>
      </section>
    );
  }

  // state === 'failed'
  return (
    <section className="card" role="alert" style={{ borderColor: 'var(--error)' }}>
      <p style={{ marginBottom: 8 }}>Download failed: {error}</p>
      <button className="btn" onClick={runHydration}>Retry</button>
      <button
        className="btn btn-ghost"
        style={{ marginLeft: 8 }}
        onClick={() => setState('idle')}
      >
        Dismiss
      </button>
    </section>
  );
}
