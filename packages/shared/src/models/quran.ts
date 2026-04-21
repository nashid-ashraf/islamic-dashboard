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

// ──────────────────────────────────────────────────────────────────────────────
// Per-edition surah data (used by the offline corpus)

/**
 * A single ayah's text for one specific edition. The corpus stores one of these
 * per (edition, ayah) — the reader merges a pair (Arabic + translation) into
 * the flat `Ayah` shape above at render time.
 */
export interface EditionAyah {
  numberInSurah: number;
  text: string;
}

/** A whole surah for one edition, as cached by `QuranOfflineCorpus`. */
export interface EditionSurah {
  meta: SurahMeta;
  ayahs: EditionAyah[];
}
