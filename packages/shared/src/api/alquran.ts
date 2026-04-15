import type { SurahMeta, SurahData, Ayah } from '../models/quran';

const BASE_URL = 'https://api.alquran.cloud/v1';

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
 * Makes two parallel API calls and merges the results.
 */
export async function fetchSurah(surahNumber: number): Promise<SurahData> {
  const [arRes, enRes] = await Promise.all([
    fetch(`${BASE_URL}/surah/${surahNumber}`),
    fetch(`${BASE_URL}/surah/${surahNumber}/en.sahih`),
  ]);

  if (!arRes.ok || !enRes.ok) {
    throw new Error(`AlQuran API error: ar=${arRes.status} en=${enRes.status}`);
  }

  const arJson = (await arRes.json()) as AlQuranSurahResponse;
  const enJson = (await enRes.json()) as AlQuranSurahResponse;

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
 * Fetch metadata for all 114 surahs (no ayah text).
 */
export async function fetchSurahList(): Promise<SurahMeta[]> {
  const res = await fetch(`${BASE_URL}/surah`);
  if (!res.ok) throw new Error(`AlQuran API error: ${res.status}`);
  const json = (await res.json()) as AlQuranSurahListResponse;
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
