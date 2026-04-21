import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  useQuran,
  useBookmarks,
  useReadingPosition,
} from '@islamic-dashboard/shared';
import { storage } from '../services/storage';
import { quranCorpus } from '../services/quranCorpus';
import { QuranCorpusConsent } from '../components/QuranCorpusConsent';

type ArabicScript = 'uthmani' | 'indopak';
const SCRIPT_KEY = 'quran_arabic_script';

export default function QuranReader() {
  useEffect(() => {
    document.title = 'Quran · Islamic Dashboard';
  }, []);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSurah = Math.max(1, Math.min(114, Number(searchParams.get('surah')) || 1));
  const initialAyah = Number(searchParams.get('ayah')) || null;

  const quran = useQuran(initialSurah, { corpus: quranCorpus });
  const bookmarks = useBookmarks(storage);
  const reading = useReadingPosition(storage);

  // Arabic script toggle (Uthmani ↔ IndoPak). Same Uthmani text, different font.
  const [script, setScript] = useState<ArabicScript>(() => {
    const saved = localStorage.getItem(SCRIPT_KEY);
    return saved === 'indopak' ? 'indopak' : 'uthmani';
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-quran-script', script);
    localStorage.setItem(SCRIPT_KEY, script);
  }, [script]);

  // Scroll to target ayah (from ?ayah=N) once the surah is loaded.
  const scrollTarget = useRef<number | null>(initialAyah);
  useEffect(() => {
    if (!scrollTarget.current || quran.loading || !quran.currentSurah) return;
    // If the target is past the first page, force more pages to load.
    while (
      quran.visibleAyahs.length < quran.totalAyahs &&
      quran.visibleAyahs.length < scrollTarget.current
    ) {
      quran.loadMore();
      break; // let the next render pass handle subsequent pages
    }
    const el = document.getElementById(`ayah-${scrollTarget.current}`);
    if (el) {
      el.scrollIntoView({ block: 'start', behavior: 'smooth' });
      scrollTarget.current = null;
    }
  }, [quran.loading, quran.currentSurah, quran.visibleAyahs.length, quran.totalAyahs, quran]);

  // IntersectionObserver: whichever ayah is most visible becomes the saved position.
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastSavedRef = useRef<number | null>(null);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!quran.currentSurah) return;
    const surahNumber = quran.currentSurah.meta.number;
    const surahName = quran.currentSurah.meta.englishName;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        // Save the first ayah currently in view (closest to top).
        const top = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b,
        );
        const ayahNum = Number(top.target.getAttribute('data-ayah'));
        if (!ayahNum || ayahNum === lastSavedRef.current) return;
        lastSavedRef.current = ayahNum;
        reading.savePosition(surahNumber, ayahNum, surahName);
      },
      { rootMargin: '0px 0px -60% 0px', threshold: 0.1 },
    );

    for (const el of document.querySelectorAll('[data-ayah]')) {
      observerRef.current.observe(el);
    }
    return () => observerRef.current?.disconnect();
  }, [quran.currentSurah, quran.visibleAyahs.length, reading]);

  function handleSurahChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const n = Number(e.target.value);
    setSearchParams({ surah: String(n) });
    quran.loadSurah(n);
    lastSavedRef.current = null;
  }

  const surahBookmarks = useMemo(
    () =>
      bookmarks.bookmarks.filter(
        (b) => b.surah === quran.currentSurah?.meta.number,
      ),
    [bookmarks.bookmarks, quran.currentSurah?.meta.number],
  );

  return (
    <div>
      <h1 style={{ color: 'var(--accent)', marginBottom: 16 }}>Quran Reader</h1>

      <QuranCorpusConsent corpus={quranCorpus} />

      <div className="toolbar">
        <select
          className="field"
          style={{ margin: 0, padding: '8px 10px', background: 'var(--background)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8 }}
          value={quran.currentSurah?.meta.number ?? initialSurah}
          onChange={handleSurahChange}
          disabled={quran.surahListLoading || quran.loading}
        >
          {quran.surahList.map((s) => (
            <option key={s.number} value={s.number}>
              {s.number}. {s.englishName} ({s.name})
            </option>
          ))}
        </select>
        <button
          className="btn btn-ghost"
          onClick={() => quran.changeSurah(-1)}
          disabled={quran.loading || (quran.currentSurah?.meta.number ?? 1) <= 1}
        >
          ← Prev
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => quran.changeSurah(1)}
          disabled={quran.loading || (quran.currentSurah?.meta.number ?? 114) >= 114}
        >
          Next →
        </button>
        <label style={{ marginLeft: 'auto', fontSize: '0.85rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          Script:
          <select
            value={script}
            onChange={(e) => setScript(e.target.value as ArabicScript)}
            style={{ padding: '4px 8px', background: 'var(--background)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6 }}
            aria-label="Arabic script"
          >
            <option value="uthmani">Uthmani</option>
            <option value="indopak">IndoPak</option>
          </select>
        </label>
      </div>

      {quran.error && (
        <div className="card" style={{ color: 'var(--error)' }} role="alert">{quran.error}</div>
      )}

      {quran.loading && !quran.currentSurah && (
        <div className="loading" role="status" aria-live="polite">Loading surah…</div>
      )}

      {quran.currentSurah && (
        <>
          <section className="card" aria-label="Surah information">
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
              {quran.currentSurah.meta.englishName} · {quran.currentSurah.meta.englishNameTranslation} · {quran.currentSurah.meta.revelationType} · {quran.currentSurah.meta.numberOfAyahs} ayahs
            </p>
          </section>

          {surahBookmarks.length > 0 && (
            <section className="card" aria-labelledby="surah-bookmarks-heading">
              <h2 id="surah-bookmarks-heading">Bookmarks in this surah</h2>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {surahBookmarks.map((b) => (
                  <li key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <a
                      href={`#ayah-${b.ayahNum}`}
                      style={{ color: 'var(--accent)' }}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(`ayah-${b.ayahNum}`)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Ayah {b.ayahNum}
                    </a>
                    <button
                      className="bookmark-btn"
                      onClick={() => bookmarks.removeBookmark(b.id)}
                      title="Remove bookmark"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card" aria-label="Ayahs">
            {quran.visibleAyahs.map((ayah) => {
              const marked = bookmarks.isBookmarked(quran.currentSurah!.meta.number, ayah.numberInSurah);
              return (
                <article
                  key={ayah.number}
                  id={`ayah-${ayah.numberInSurah}`}
                  data-ayah={ayah.numberInSurah}
                  className="ayah"
                  aria-label={`Ayah ${ayah.numberInSurah}`}
                >
                  <div className="ayah-header">
                    <span>Ayah {ayah.numberInSurah}</span>
                    <button
                      className={marked ? 'bookmark-btn active' : 'bookmark-btn'}
                      onClick={() => {
                        if (marked) {
                          const b = bookmarks.bookmarks.find(
                            (x) =>
                              x.surah === quran.currentSurah!.meta.number &&
                              x.ayahNum === ayah.numberInSurah,
                          );
                          if (b) bookmarks.removeBookmark(b.id);
                        } else {
                          bookmarks.addBookmark(
                            quran.currentSurah!.meta.number,
                            ayah.numberInSurah,
                            quran.currentSurah!.meta.englishName,
                          );
                        }
                      }}
                      aria-label={marked ? 'Remove bookmark' : 'Add bookmark'}
                      title={marked ? 'Remove bookmark' : 'Add bookmark'}
                    >
                      <span aria-hidden="true">{marked ? '★' : '☆'}</span>
                    </button>
                  </div>
                  <p className="ayah-arabic" lang="ar" dir="rtl">{ayah.text}</p>
                  <p className="ayah-translation">{ayah.translation}</p>
                </article>
              );
            })}

            {quran.hasMore && (
              <button
                className="btn btn-ghost"
                style={{ width: '100%', marginTop: 12 }}
                onClick={quran.loadMore}
              >
                Load more ({quran.totalAyahs - quran.visibleAyahs.length} remaining)
              </button>
            )}
          </section>
        </>
      )}
    </div>
  );
}
