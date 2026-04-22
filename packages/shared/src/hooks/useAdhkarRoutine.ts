import { useEffect, useState } from 'react';
import type { AdhkarRoutine, AdhkarRoutineId, Dua, QuranRef } from '../models/adhkar';
import { ADHKAR_ROUTINES } from '../data/adhkar';
import type { QuranOfflineCorpus } from '../ports/quranCorpus';
import type { EditionId } from '../models/editions';
import { DEFAULT_ARABIC_EDITION } from '../models/editions';

export interface ResolvedAyah {
  ayah: number;
  text: string;
}

export interface ResolvedDua extends Dua {
  /**
   * Arabic text resolved for the dua. Populated from one of three sources, in
   * order of preference:
   *   1. Inline `arabic` field on the dua itself.
   *   2. Quran corpus lookup via `quranRef` (when a hydrated corpus is supplied).
   *   3. `null` — caller renders a "translation pending" placeholder.
   */
  resolvedArabicAyahs: ResolvedAyah[] | null;
}

export interface UseAdhkarRoutineOptions {
  corpus?: QuranOfflineCorpus;
  /** Which Arabic edition to resolve `quranRef` from. Default: Uthmani. */
  arabicEdition?: EditionId;
}

export interface UseAdhkarRoutineState {
  routine: AdhkarRoutine;
  resolvedDuas: ResolvedDua[];
  resolving: boolean;
}

/**
 * Loads a bundled adhkar routine and — when a `QuranOfflineCorpus` is supplied
 * — resolves Arabic text for any `quranRef`-carrying duas from the cache.
 *
 * The bundled JSON always resolves synchronously (it's imported at module
 * load). Only `quranRef` resolution is async, and falls back gracefully when
 * the corpus is absent or not hydrated.
 */
export function useAdhkarRoutine(
  id: AdhkarRoutineId,
  options: UseAdhkarRoutineOptions = {},
): UseAdhkarRoutineState {
  const { corpus, arabicEdition = DEFAULT_ARABIC_EDITION } = options;
  const routine = ADHKAR_ROUTINES[id];

  const [resolvedDuas, setResolvedDuas] = useState<ResolvedDua[]>(() =>
    routine.duas.map((d) => ({
      ...d,
      resolvedArabicAyahs: d.arabic
        ? [{ ayah: 0, text: d.arabic }]
        : null,
    })),
  );
  const [resolving, setResolving] = useState<boolean>(() =>
    Boolean(corpus) && routine.duas.some((d) => d.quranRef && !d.arabic),
  );

  useEffect(() => {
    let cancelled = false;
    if (!corpus) {
      setResolvedDuas(
        routine.duas.map((d) => ({
          ...d,
          resolvedArabicAyahs: d.arabic ? [{ ayah: 0, text: d.arabic }] : null,
        })),
      );
      setResolving(false);
      return;
    }

    setResolving(true);
    (async () => {
      const next = await Promise.all(
        routine.duas.map(async (d) => {
          if (d.arabic) {
            return { ...d, resolvedArabicAyahs: [{ ayah: 0, text: d.arabic }] };
          }
          if (!d.quranRef) {
            return { ...d, resolvedArabicAyahs: null };
          }
          const resolved = await resolveQuranRef(corpus, arabicEdition, d.quranRef);
          return { ...d, resolvedArabicAyahs: resolved };
        }),
      );
      if (!cancelled) {
        setResolvedDuas(next);
        setResolving(false);
      }
    })().catch(() => {
      if (!cancelled) setResolving(false);
    });

    return () => {
      cancelled = true;
    };
  }, [corpus, arabicEdition, routine]);

  return { routine, resolvedDuas, resolving };
}

async function resolveQuranRef(
  corpus: QuranOfflineCorpus,
  edition: EditionId,
  ref: QuranRef,
): Promise<ResolvedAyah[] | null> {
  const surah = await corpus.getSurah(edition, ref.surah);
  if (!surah) return null;
  const picked = surah.ayahs.filter(
    (a) => a.numberInSurah >= ref.ayahFrom && a.numberInSurah <= ref.ayahTo,
  );
  if (picked.length === 0) return null;
  return picked.map((a) => ({ ayah: a.numberInSurah, text: a.text }));
}
