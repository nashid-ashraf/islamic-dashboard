// Platform-agnostic port for the opt-in full-Quran offline cache (FR-EX19).
//
// Implementations: IndexedDB (web, via `idb-keyval`) and expo-file-system (mobile,
// deferred to Phase 4). The port is deliberately source-agnostic — the adapter
// is responsible for dispatching to AlQuran.cloud or the fawazahmed0 CDN per
// `EDITIONS[edition].upstream`.

import type { EditionSurah } from '../models/quran';
import type { EditionId } from '../models/editions';

export interface CorpusManifest {
  version: 1;
  /**
   * Surah numbers (1-indexed) present per edition. A complete entry has all 114.
   * Used both by `isPresent()` and to resume a partial hydration without
   * re-downloading records already on disk.
   */
  editionsPresent: { [id in EditionId]?: number[] };
  lastHydrated: number;
}

export interface HydrationProgress {
  completed: number;         // records written so far (cumulative)
  total: number;             // 4 editions × 114 surahs = 456
  currentEdition: EditionId;
}

export interface QuranOfflineCorpus {
  /** True iff all known editions × 114 surahs are present. */
  isPresent(): Promise<boolean>;
  getManifest(): Promise<CorpusManifest | null>;
  /**
   * Populate missing records. Idempotent: only fetches what isn't already in the
   * manifest. Emits progress after each write. Aborts cleanly on signal.
   */
  hydrate(
    onProgress?: (progress: HydrationProgress) => void,
    signal?: AbortSignal,
  ): Promise<void>;
  getSurah(edition: EditionId, n: number): Promise<EditionSurah | null>;
  /** Drop the manifest and every cached surah record. */
  invalidate(): Promise<void>;
}
