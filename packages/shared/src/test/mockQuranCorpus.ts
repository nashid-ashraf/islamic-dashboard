import type {
  QuranOfflineCorpus,
  CorpusManifest,
  HydrationProgress,
} from '../ports/quranCorpus';
import type { EditionSurah } from '../models/quran';
import type { EditionId } from '../models/editions';
import { EDITION_IDS } from '../models/editions';

const TOTAL_SURAHS = 114;

/**
 * In-memory test double for `QuranOfflineCorpus`. Exposes `state` so tests can
 * introspect what was written per edition without needing spies. Mirrors the
 * pattern used by `mockStorage`.
 */
export function createMockQuranCorpus(
  initial?: {
    manifest?: CorpusManifest | null;
    surahs?: Partial<Record<EditionId, Map<number, EditionSurah>>>;
  },
  hydrateImpl?: (
    onProgress?: (p: HydrationProgress) => void,
    signal?: AbortSignal,
  ) => Promise<void>,
): QuranOfflineCorpus & {
  state: {
    manifest: CorpusManifest | null;
    surahs: Record<EditionId, Map<number, EditionSurah>>;
  };
} {
  const state = {
    manifest: initial?.manifest ?? null,
    surahs: Object.fromEntries(
      EDITION_IDS.map((id) => [id, new Map(initial?.surahs?.[id] ?? new Map())]),
    ) as Record<EditionId, Map<number, EditionSurah>>,
  };

  return {
    state,

    async isPresent() {
      if (!state.manifest) return false;
      return EDITION_IDS.every(
        (id) => (state.manifest!.editionsPresent[id]?.length ?? 0) === TOTAL_SURAHS,
      );
    },

    async getManifest() {
      return state.manifest;
    },

    async hydrate(onProgress, signal) {
      if (hydrateImpl) return hydrateImpl(onProgress, signal);
      // Default: mark all editions present with dummy surah records.
      let completed = 0;
      const total = EDITION_IDS.length * TOTAL_SURAHS;
      for (const id of EDITION_IDS) {
        for (let n = 1; n <= TOTAL_SURAHS; n++) {
          if (signal?.aborted) return;
          if (!state.surahs[id].has(n)) {
            state.surahs[id].set(n, {
              meta: {
                number: n,
                name: `m${n}`,
                englishName: `e${n}`,
                englishNameTranslation: '',
                numberOfAyahs: 1,
                revelationType: 'Meccan',
              },
              ayahs: [{ numberInSurah: 1, text: `${id}:${n}` }],
            });
          }
          completed++;
          onProgress?.({ completed, total, currentEdition: id });
        }
      }
      state.manifest = {
        version: 1,
        editionsPresent: Object.fromEntries(
          EDITION_IDS.map((id) => [id, Array.from(state.surahs[id].keys()).sort((a, b) => a - b)]),
        ),
        lastHydrated: Date.now(),
      };
    },

    async getSurah(edition, n) {
      return state.surahs[edition].get(n) ?? null;
    },

    async invalidate() {
      state.manifest = null;
      for (const id of EDITION_IDS) state.surahs[id].clear();
    },
  };
}
