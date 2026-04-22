// Domain model for bundled adhkar routines (FR-EX23-25).
//
// Design intent:
// - Content ships as plain JSON in `packages/shared/src/data/adhkar/*.json` and
//   is fully inline: Arabic text plus per-edition translations for every dua.
//   No runtime fetch, no corpus dependency, no consent state. Loading a routine
//   is synchronous and offline-first by construction.
// - `quranRef` is OPTIONAL metadata. When present it records that the dua's
//   text originated from a specific Quran passage (used for source citations
//   and "open in Quran reader →" deep-links). The text itself is still bundled
//   inline so the adhkar reader never depends on the QuranOfflineCorpus
//   consent state.
// - Text for Quran-referenced entries is populated by a one-time build script
//   (`packages/shared/scripts/populate-quran-text.mjs`) that pulls from the
//   same public APIs the Quran corpus uses, then writes inline into the JSON.
//   Hadith-derived entries are curated by hand from permissive sources per
//   `packages/shared/src/data/adhkar/LICENSES.md`.

import type { AdhkarRoutineId } from './reminder';
import type { EditionId } from './editions';

export type { AdhkarRoutineId };

/**
 * Editions that carry translations (everything except the Arabic source).
 * Reuses the Quran corpus edition IDs so terminology stays consistent across
 * the app.
 */
export type TranslationEditionId = Exclude<EditionId, 'ar-uthmani'>;

export const TRANSLATION_EDITIONS: readonly TranslationEditionId[] = [
  'en-sahih',
  'en-khattab',
  'bn-muhiuddin',
] as const;

export interface QuranRef {
  surah: number;
  ayahFrom: number;
  /** Inclusive; equal to `ayahFrom` for a single verse. */
  ayahTo: number;
}

export interface Dua {
  /** Stable identifier, e.g. 'sleep-003'. Safe to reference from UI state. */
  id: string;
  /** Display order within the routine (1-based). */
  order: number;
  /** Recommended repetition count (e.g. 1, 3, 7, 33, 100). */
  repetitions: number;
  /** Human-readable source citation, e.g. "Quran 2:255" or "Bukhari 6306". */
  source: string;
  /** Romanized transliteration of the Arabic. Optional. */
  transliteration?: string;
  /** Virtue or benefit text (fadl). Optional. */
  benefit?: string;
  /** Arabic text — required. Public domain (from Quran or sahih hadith). */
  arabic: string;
  /**
   * Per-edition translations. At least one translation must be populated so
   * the entry is accessible to users. Keys are `TranslationEditionId`s; absence
   * of a key means "not available in this edition" (e.g. Khattab translates
   * the Quran only, so hadith entries won't carry 'en-khattab').
   */
  translations: Partial<Record<TranslationEditionId, string>>;
  /**
   * Optional pointer to a Quran passage that this dua's text comes from. Used
   * as metadata (source attribution + "open in Quran reader" deep-link), not
   * as a resolution mechanism — the text itself is inline in `arabic` and
   * `translations`.
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
