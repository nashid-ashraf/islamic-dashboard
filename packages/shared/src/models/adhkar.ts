// Domain model for bundled adhkar routines (FR-EX23).
//
// Design intent:
// - Content ships as plain JSON in `packages/shared/src/data/adhkar/*.json` so
//   the mobile and web apps import the same bytes with no fetch at runtime.
// - For Quran-derived duas we store only a `quranRef` pointer — the actual
//   text (Arabic and any cached translations) resolves via `QuranOfflineCorpus`
//   at render time. This avoids duplicating content already on disk AND means
//   Bengali translations become available "for free" when the `bn-muhiuddin`
//   Quran edition is hydrated.
// - For hadith-derived duas we store the Arabic text inline (public domain)
//   and translations per-language. Sourcing of translations is the editorial
//   concern documented in `data/adhkar/LICENSES.md`.

import type { AdhkarRoutineId } from './reminder';

export type { AdhkarRoutineId };

export type LanguageCode = 'en' | 'bn';

export interface QuranRef {
  surah: number;
  ayahFrom: number;
  /** Inclusive; equal to ayahFrom for a single verse. */
  ayahTo: number;
}

export interface Dua {
  /** Stable identifier, e.g. 'sleep-003'. Safe to reference from UI state. */
  id: string;
  /** Display order within the routine (1-based). */
  order: number;
  /**
   * Arabic text. Optional when `quranRef` is present — the reader may resolve
   * Arabic from the Quran corpus instead of duplicating bytes.
   */
  arabic?: string;
  /**
   * Per-language translations. Keys are `LanguageCode`. All translations
   * optional; the UI falls back to "translation pending" when absent for the
   * user's selected language.
   */
  translations?: Partial<Record<LanguageCode, string>>;
  /** Romanized transliteration of the Arabic. Optional. */
  transliteration?: string;
  /** Recommended repetition count (e.g. 1, 3, 7, 33, 100). */
  repetitions: number;
  /** Human-readable source citation, e.g. "Quran 2:255" or "Bukhari 6306". */
  source: string;
  /** Virtue or benefit text (fadl). Optional. */
  benefit?: string;
  /**
   * Pointer into the Quran corpus. When present, the reader may resolve Arabic
   * and any cached-edition translation via `QuranOfflineCorpus.getSurah()`.
   */
  quranRef?: QuranRef;
}

export interface AdhkarRoutine {
  id: AdhkarRoutineId;
  label: string;
  /** Human-readable note about curation status / outstanding work. */
  curationNote?: string;
  duas: Dua[];
}
