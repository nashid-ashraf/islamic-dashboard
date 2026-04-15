/** A single ayah with Arabic and English text. */
export interface Ayah {
  number: number;
  numberInSurah: number;
  text: string;       // Arabic
  translation: string; // English (Sahih)
  juz: number;
  page: number;
}

/** Surah metadata (from the 114-surah list). */
export interface SurahMeta {
  number: number;
  name: string;           // Arabic name
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: 'Meccan' | 'Medinan';
}

/** Full surah data with ayahs loaded. */
export interface SurahData {
  meta: SurahMeta;
  ayahs: Ayah[];
}

/** A user's bookmark for a specific ayah. */
export interface Bookmark {
  id: string;
  surah: number;
  ayahNum: number;
  surahName: string;
  label: string;
  createdAt: number;
  updatedAt: number;
}

/** Auto-saved reading position. */
export interface ReadingPosition {
  surah: number;
  ayahNum: number;
  surahName: string;
  timestamp: number;
}

/** How many ayahs to load per page in the scrollable reader. */
export const AYAHS_PER_PAGE = 10;
