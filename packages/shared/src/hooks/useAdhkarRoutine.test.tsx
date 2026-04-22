import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAdhkarRoutine } from './useAdhkarRoutine';
import { createMockQuranCorpus } from '../test/mockQuranCorpus';
import type { EditionSurah } from '../models/quran';

function editionSurah(number: number, ayahs: { numberInSurah: number; text: string }[]): EditionSurah {
  return {
    meta: {
      number,
      name: `s${number}`,
      englishName: `S${number}`,
      englishNameTranslation: '',
      numberOfAyahs: ayahs.length,
      revelationType: 'Meccan',
    },
    ayahs,
  };
}

describe('useAdhkarRoutine', () => {
  it('returns the bundled routine synchronously (no corpus)', () => {
    const { result } = renderHook(() => useAdhkarRoutine('sleep'));
    expect(result.current.routine.id).toBe('sleep');
    expect(result.current.routine.duas.length).toBeGreaterThan(0);
    // Without a corpus, duas carrying only `quranRef` resolve to null.
    for (const d of result.current.resolvedDuas) {
      if (d.quranRef && !d.arabic) {
        expect(d.resolvedArabicAyahs).toBeNull();
      }
    }
    expect(result.current.resolving).toBe(false);
  });

  it('resolves quranRef duas from the corpus when present', async () => {
    const corpus = createMockQuranCorpus({
      surahs: {
        'ar-uthmani': new Map([
          [2, editionSurah(2, [
            { numberInSurah: 255, text: 'AYAT-AL-KURSI-TEXT' },
            { numberInSurah: 285, text: 'BAQARAH-285' },
            { numberInSurah: 286, text: 'BAQARAH-286' },
          ])],
          [112, editionSurah(112, [
            { numberInSurah: 1, text: 'IKHLAS-1' },
            { numberInSurah: 2, text: 'IKHLAS-2' },
            { numberInSurah: 3, text: 'IKHLAS-3' },
            { numberInSurah: 4, text: 'IKHLAS-4' },
          ])],
          [113, editionSurah(113, [
            { numberInSurah: 1, text: 'FALAQ-1' },
            { numberInSurah: 2, text: 'FALAQ-2' },
            { numberInSurah: 3, text: 'FALAQ-3' },
            { numberInSurah: 4, text: 'FALAQ-4' },
            { numberInSurah: 5, text: 'FALAQ-5' },
          ])],
          [114, editionSurah(114, [
            { numberInSurah: 1, text: 'NAS-1' },
            { numberInSurah: 2, text: 'NAS-2' },
            { numberInSurah: 3, text: 'NAS-3' },
            { numberInSurah: 4, text: 'NAS-4' },
            { numberInSurah: 5, text: 'NAS-5' },
            { numberInSurah: 6, text: 'NAS-6' },
          ])],
        ]),
      },
    });

    const { result } = renderHook(() => useAdhkarRoutine('sleep', { corpus }));

    await waitFor(() => expect(result.current.resolving).toBe(false));

    const ayatAlKursiDua = result.current.resolvedDuas.find(
      (d) => d.quranRef?.surah === 2 && d.quranRef?.ayahFrom === 255,
    );
    expect(ayatAlKursiDua?.resolvedArabicAyahs).toEqual([
      { ayah: 255, text: 'AYAT-AL-KURSI-TEXT' },
    ]);

    const baqarahEnd = result.current.resolvedDuas.find(
      (d) => d.quranRef?.surah === 2 && d.quranRef?.ayahFrom === 285,
    );
    expect(baqarahEnd?.resolvedArabicAyahs).toEqual([
      { ayah: 285, text: 'BAQARAH-285' },
      { ayah: 286, text: 'BAQARAH-286' },
    ]);
  });

  it('returns null for quranRef duas when the corpus is missing that surah', async () => {
    // Corpus contains nothing — all quranRef lookups miss.
    const corpus = createMockQuranCorpus();
    const { result } = renderHook(() => useAdhkarRoutine('sleep', { corpus }));
    await waitFor(() => expect(result.current.resolving).toBe(false));
    for (const d of result.current.resolvedDuas) {
      if (d.quranRef && !d.arabic) {
        expect(d.resolvedArabicAyahs).toBeNull();
      }
    }
  });

  it('exposes empty duas arrays for out-of-scope routines (waking, friday-post-asr, post-salah)', () => {
    for (const id of ['waking', 'friday-post-asr', 'post-salah'] as const) {
      const { result } = renderHook(() => useAdhkarRoutine(id));
      expect(result.current.routine.duas).toEqual([]);
      expect(result.current.routine.curationNote).toBeTruthy();
    }
  });
});
