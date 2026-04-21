import type { SurahMeta, SurahData, Ayah, EditionSurah } from '../models/quran';
import { httpFetchJson } from './httpClient';

const BASE_URL = 'https://api.alquran.cloud/v1';

/** Quran content is immutable; 24h session-scope cache is plenty. */
const CONTENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;

/** Raw API response wrappers. */
interface AlQuranSurahResponse {
  code: number;
  data: {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    numberOfAyahs: number;
    revelationType: 'Meccan' | 'Medinan';
    ayahs: {
      number: number;
      numberInSurah: number;
      text: string;
      juz: number;
      page: number;
    }[];
  };
}

interface AlQuranSurahListResponse {
  code: number;
  data: {
    number: number;
    name: string;
    englishName: string;
    englishNameTranslation: string;
    numberOfAyahs: number;
    revelationType: 'Meccan' | 'Medinan';
  }[];
}

/**
 * Fetch a complete surah with Arabic text and English (Sahih) translation.
 * Makes two parallel cached API calls and merges the results.
 */
export async function fetchSurah(surahNumber: number): Promise<SurahData> {
  const [arJson, enJson] = await Promise.all([
    httpFetchJson<AlQuranSurahResponse>(`${BASE_URL}/surah/${surahNumber}`, {
      timeoutMs: REQUEST_TIMEOUT_MS,
      cacheTtlMs: CONTENT_CACHE_TTL_MS,
    }),
    httpFetchJson<AlQuranSurahResponse>(`${BASE_URL}/surah/${surahNumber}/en.sahih`, {
      timeoutMs: REQUEST_TIMEOUT_MS,
      cacheTtlMs: CONTENT_CACHE_TTL_MS,
    }),
  ]);

  if (arJson.code !== 200 || enJson.code !== 200) {
    throw new Error('AlQuran API returned non-200 code');
  }

  const arData = arJson.data;
  const enData = enJson.data;

  const ayahs: Ayah[] = arData.ayahs.map((ar, i) => ({
    number: ar.number,
    numberInSurah: ar.numberInSurah,
    text: ar.text,
    translation: enData.ayahs[i]?.text ?? '',
    juz: ar.juz,
    page: ar.page,
  }));

  return {
    meta: {
      number: arData.number,
      name: arData.name,
      englishName: arData.englishName,
      englishNameTranslation: arData.englishNameTranslation,
      numberOfAyahs: arData.numberOfAyahs,
      revelationType: arData.revelationType,
    },
    ayahs,
  };
}

/**
 * Fetch a single edition's text (Arabic OR a translation, depending on slug).
 * Returns the corpus-cache-ready `EditionSurah` shape. Used by the offline
 * corpus adapter during hydration.
 */
export async function fetchEditionSurah(
  editionSlug: string,
  surahNumber: number,
  signal?: AbortSignal,
): Promise<EditionSurah> {
  const json = await httpFetchJson<AlQuranSurahResponse>(
    `${BASE_URL}/surah/${surahNumber}/${editionSlug}`,
    {
      timeoutMs: REQUEST_TIMEOUT_MS,
      cacheTtlMs: CONTENT_CACHE_TTL_MS,
      signal,
    },
  );
  if (json.code !== 200) throw new Error('AlQuran API returned non-200 code');
  const d = json.data;
  return {
    meta: {
      number: d.number,
      name: d.name,
      englishName: d.englishName,
      englishNameTranslation: d.englishNameTranslation,
      numberOfAyahs: d.numberOfAyahs,
      revelationType: d.revelationType,
    },
    ayahs: d.ayahs.map((a) => ({
      numberInSurah: a.numberInSurah,
      text: a.text,
    })),
  };
}

/** Fetch metadata for all 114 surahs (no ayah text). Cached for the session. */
export async function fetchSurahList(): Promise<SurahMeta[]> {
  const json = await httpFetchJson<AlQuranSurahListResponse>(`${BASE_URL}/surah`, {
    timeoutMs: REQUEST_TIMEOUT_MS,
    cacheTtlMs: CONTENT_CACHE_TTL_MS,
  });
  if (json.code !== 200) throw new Error('AlQuran API returned non-200 code');

  return json.data.map((s) => ({
    number: s.number,
    name: s.name,
    englishName: s.englishName,
    englishNameTranslation: s.englishNameTranslation,
    numberOfAyahs: s.numberOfAyahs,
    revelationType: s.revelationType,
  }));
}
