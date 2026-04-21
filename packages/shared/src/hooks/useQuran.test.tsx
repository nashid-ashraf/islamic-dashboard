import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useQuran } from './useQuran';
import { createMockQuranCorpus } from '../test/mockQuranCorpus';
import type { EditionSurah } from '../models/quran';

// Mock the AlQuran network client at the module level. Individual tests can
// override the spies' resolved values.
vi.mock('../api/alquran', async (orig) => {
  const actual = await orig<typeof import('../api/alquran')>();
  return {
    ...actual,
    fetchSurah: vi.fn(async (n: number) => ({
      meta: { number: n, name: 'n', englishName: 'e', englishNameTranslation: '', numberOfAyahs: 1, revelationType: 'Meccan' as const },
      ayahs: [{ number: 1, numberInSurah: 1, text: `net-ar:${n}`, translation: `net-en:${n}`, juz: 0, page: 0 }],
    })),
    fetchSurahList: vi.fn(async () => [
      { number: 1, name: 'الفاتحة', englishName: 'Al-Fatihah', englishNameTranslation: 'The Opening', numberOfAyahs: 7, revelationType: 'Meccan' as const },
    ]),
  };
});

import { fetchSurah } from '../api/alquran';

function stubEditionSurah(n: number, marker: string): EditionSurah {
  return {
    meta: { number: n, name: 'm', englishName: 'e', englishNameTranslation: '', numberOfAyahs: 1, revelationType: 'Meccan' },
    ayahs: [{ numberInSurah: 1, text: marker }],
  };
}

describe('useQuran', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.clearAllMocks());

  it('falls back to network when no corpus is supplied (unchanged legacy behavior)', async () => {
    const { result } = renderHook(() => useQuran(1));
    await waitFor(() => expect(result.current.currentSurah).not.toBeNull());
    expect(result.current.currentSurah?.ayahs[0].text).toBe('net-ar:1');
    expect(result.current.currentSurah?.ayahs[0].translation).toBe('net-en:1');
    expect(fetchSurah).toHaveBeenCalledWith(1);
  });

  it('reads from corpus when both editions are cached — network is not called', async () => {
    const corpus = createMockQuranCorpus({
      surahs: {
        'ar-uthmani': new Map([[18, stubEditionSurah(18, 'cached-ar')]]),
        'en-sahih': new Map([[18, stubEditionSurah(18, 'cached-en')]]),
      },
    });
    const { result } = renderHook(() => useQuran(18, { corpus }));
    await waitFor(() => expect(result.current.currentSurah).not.toBeNull());
    expect(result.current.currentSurah?.ayahs[0].text).toBe('cached-ar');
    expect(result.current.currentSurah?.ayahs[0].translation).toBe('cached-en');
    expect(fetchSurah).not.toHaveBeenCalled();
  });

  it('falls through to network when corpus lacks the requested surah', async () => {
    // Corpus has surah 1 only; reader asks for surah 2
    const corpus = createMockQuranCorpus({
      surahs: {
        'ar-uthmani': new Map([[1, stubEditionSurah(1, 'only-one')]]),
        'en-sahih': new Map([[1, stubEditionSurah(1, 'only-one-en')]]),
      },
    });
    const { result } = renderHook(() => useQuran(2, { corpus }));
    await waitFor(() => expect(result.current.currentSurah).not.toBeNull());
    expect(result.current.currentSurah?.ayahs[0].text).toBe('net-ar:2');
    expect(fetchSurah).toHaveBeenCalledWith(2);
  });

  it('falls through to network when one edition is cached but the paired one is not', async () => {
    const corpus = createMockQuranCorpus({
      surahs: {
        'ar-uthmani': new Map([[5, stubEditionSurah(5, 'arabic-only')]]),
        // en-sahih intentionally missing — we want arabic + translation together
      },
    });
    const { result } = renderHook(() => useQuran(5, { corpus }));
    await waitFor(() => expect(result.current.currentSurah).not.toBeNull());
    expect(result.current.currentSurah?.ayahs[0].text).toBe('net-ar:5');
    expect(fetchSurah).toHaveBeenCalledWith(5);
  });
});
