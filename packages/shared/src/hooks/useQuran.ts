import { useState, useEffect, useCallback, useRef } from 'react';
import type { SurahData, SurahMeta, Ayah, EditionSurah } from '../models/quran';
import { AYAHS_PER_PAGE } from '../models/quran';
import { fetchSurah, fetchSurahList } from '../api/alquran';
import type { EditionId } from '../models/editions';
import { DEFAULT_ARABIC_EDITION, DEFAULT_TRANSLATION_EDITION } from '../models/editions';
import type { QuranOfflineCorpus } from '../ports/quranCorpus';

export interface QuranState {
  surahList: SurahMeta[];
  currentSurah: SurahData | null;
  visibleAyahs: Ayah[];
  totalAyahs: number;
  hasMore: boolean;
  loading: boolean;
  surahListLoading: boolean;
  error: string | null;
}

export interface QuranActions {
  loadSurah: (surahNumber: number) => Promise<void>;
  loadMore: () => void;
  changeSurah: (direction: 1 | -1) => void;
}

export interface UseQuranOptions {
  /** Optional offline corpus. When supplied and hydrated, reads go cache-first. */
  corpus?: QuranOfflineCorpus;
  /** Arabic edition to display. Defaults to Uthmani. */
  arabicEdition?: EditionId;
  /** Translation edition to display. Defaults to Sahih International. */
  translationEdition?: EditionId;
}

/** Merge two per-edition surahs (Arabic + translation) into the flat Ayah shape. */
function mergeEditionSurahs(arabic: EditionSurah, translation: EditionSurah): SurahData {
  const trByAyah = new Map(translation.ayahs.map((a) => [a.numberInSurah, a.text]));
  const ayahs: Ayah[] = arabic.ayahs.map((a, i) => ({
    number: i + 1, // derived index; 1-based within surah
    numberInSurah: a.numberInSurah,
    text: a.text,
    translation: trByAyah.get(a.numberInSurah) ?? '',
    // `juz` and `page` are not in the per-edition shape; defaults are fine for
    // the reader UI which doesn't surface them yet.
    juz: 0,
    page: 0,
  }));
  return { meta: arabic.meta, ayahs };
}

export function useQuran(
  initialSurah: number = 1,
  options: UseQuranOptions = {},
): QuranState & QuranActions {
  const {
    corpus,
    arabicEdition = DEFAULT_ARABIC_EDITION,
    translationEdition = DEFAULT_TRANSLATION_EDITION,
  } = options;

  const [surahList, setSurahList] = useState<SurahMeta[]>([]);
  const [currentSurah, setCurrentSurah] = useState<SurahData | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [surahListLoading, setSurahListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSurahNumber, setCurrentSurahNumber] = useState(initialSurah);

  // Keep edition choices in a ref so loadSurah closure always sees the latest —
  // avoids stale-capture if the reader UI swaps edition mid-session.
  const editionsRef = useRef({ arabicEdition, translationEdition });
  useEffect(() => {
    editionsRef.current = { arabicEdition, translationEdition };
  }, [arabicEdition, translationEdition]);

  useEffect(() => {
    fetchSurahList()
      .then(setSurahList)
      .catch(() => setError('Failed to load surah list'))
      .finally(() => setSurahListLoading(false));
  }, []);

  const loadSurah = useCallback(
    async (surahNumber: number) => {
      setLoading(true);
      setError(null);
      setPageCount(1);
      try {
        const { arabicEdition: ar, translationEdition: tr } = editionsRef.current;
        let data: SurahData | null = null;
        if (corpus) {
          const [arabic, translation] = await Promise.all([
            corpus.getSurah(ar, surahNumber),
            corpus.getSurah(tr, surahNumber),
          ]);
          if (arabic && translation) data = mergeEditionSurahs(arabic, translation);
        }
        if (!data) data = await fetchSurah(surahNumber);
        setCurrentSurah(data);
        setCurrentSurahNumber(surahNumber);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load surah');
      } finally {
        setLoading(false);
      }
    },
    [corpus],
  );

  useEffect(() => {
    loadSurah(initialSurah);
  }, [initialSurah, loadSurah]);

  const loadMore = useCallback(() => {
    setPageCount((prev) => prev + 1);
  }, []);

  const changeSurah = useCallback((direction: 1 | -1) => {
    const next = Math.max(1, Math.min(114, currentSurahNumber + direction));
    if (next !== currentSurahNumber) {
      loadSurah(next);
    }
  }, [currentSurahNumber, loadSurah]);

  const allAyahs = currentSurah?.ayahs ?? [];
  const visibleAyahs = allAyahs.slice(0, pageCount * AYAHS_PER_PAGE);
  const hasMore = visibleAyahs.length < allAyahs.length;

  return {
    surahList,
    currentSurah,
    visibleAyahs,
    totalAyahs: allAyahs.length,
    hasMore,
    loading,
    surahListLoading,
    error,
    loadSurah,
    loadMore,
    changeSurah,
  };
}
