import { useState, useEffect, useCallback } from 'react';
import type { SurahData, SurahMeta, Ayah } from '../models/quran';
import { AYAHS_PER_PAGE } from '../models/quran';
import { fetchSurah, fetchSurahList } from '../api/alquran';

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

export function useQuran(initialSurah: number = 1): QuranState & QuranActions {
  const [surahList, setSurahList] = useState<SurahMeta[]>([]);
  const [currentSurah, setCurrentSurah] = useState<SurahData | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [surahListLoading, setSurahListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSurahNumber, setCurrentSurahNumber] = useState(initialSurah);

  // Load surah list on mount
  useEffect(() => {
    fetchSurahList()
      .then(setSurahList)
      .catch(() => setError('Failed to load surah list'))
      .finally(() => setSurahListLoading(false));
  }, []);

  const loadSurah = useCallback(async (surahNumber: number) => {
    setLoading(true);
    setError(null);
    setPageCount(1);
    try {
      const data = await fetchSurah(surahNumber);
      setCurrentSurah(data);
      setCurrentSurahNumber(surahNumber);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load surah');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial surah
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
