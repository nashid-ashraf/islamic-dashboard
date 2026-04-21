import {
  get as idbGet,
  set as idbSet,
  del as idbDel,
  keys as idbKeys,
  delMany as idbDelMany,
  createStore,
  type UseStore,
} from 'idb-keyval';
import {
  EDITIONS,
  EDITION_IDS,
  fetchEditionSurah,
  fetchCdnEditionSurah,
  fetchSurahList,
  type CorpusManifest,
  type EditionId,
  type EditionMeta,
  type EditionSurah,
  type HydrationProgress,
  type QuranOfflineCorpus,
  type SurahMeta,
} from '@islamic-dashboard/shared';

const TOTAL_SURAHS = 114;
const HYDRATION_PARALLELISM = 4;
const MANIFEST_KEY = 'quran:manifest';
const store: UseStore = createStore('islamic-dashboard-quran', 'corpus');

function surahKey(edition: EditionId, n: number): string {
  return `quran:surah:${edition}:${n}`;
}

async function fetchEditionSurahForMeta(
  meta: EditionMeta,
  surahNumber: number,
  surahMeta: SurahMeta,
  signal: AbortSignal,
): Promise<EditionSurah> {
  if (meta.upstream.provider === 'alquran.cloud') {
    return fetchEditionSurah(meta.upstream.editionSlug, surahNumber, signal);
  }
  return fetchCdnEditionSurah(meta.upstream.editionSlug, surahNumber, surahMeta, signal);
}

export class IndexedDbQuranCorpus implements QuranOfflineCorpus {
  async isPresent(): Promise<boolean> {
    const manifest = await this.getManifest();
    if (!manifest) return false;
    return EDITION_IDS.every(
      (id) => (manifest.editionsPresent[id]?.length ?? 0) === TOTAL_SURAHS,
    );
  }

  async getManifest(): Promise<CorpusManifest | null> {
    return (await idbGet<CorpusManifest>(MANIFEST_KEY, store)) ?? null;
  }

  async getSurah(edition: EditionId, n: number): Promise<EditionSurah | null> {
    return (await idbGet<EditionSurah>(surahKey(edition, n), store)) ?? null;
  }

  async hydrate(
    onProgress?: (p: HydrationProgress) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    if (signal?.aborted) return;

    // Load the 114 surah metadata once; needed for fawazahmed0 CDN surah shape
    // (that API doesn't return meta) and for the progress report.
    const surahList = await fetchSurahList();
    const surahMetaByNumber = new Map(surahList.map((s) => [s.number, s]));

    const existing = (await this.getManifest()) ?? {
      version: 1 as const,
      editionsPresent: {},
      lastHydrated: 0,
    };
    const editionsPresent: CorpusManifest['editionsPresent'] = { ...existing.editionsPresent };

    // Total records targeted = editions × 114.
    // `completed` counts records actually present after each write (so resumed
    // runs start with the partial count already in the manifest).
    const total = EDITION_IDS.length * TOTAL_SURAHS;
    let completed = EDITION_IDS.reduce(
      (sum, id) => sum + (editionsPresent[id]?.length ?? 0),
      0,
    );

    for (const editionId of EDITION_IDS) {
      if (signal?.aborted) return;
      const meta = EDITIONS[editionId];
      const alreadyPresent = new Set(editionsPresent[editionId] ?? []);
      const pending: number[] = [];
      for (let n = 1; n <= TOTAL_SURAHS; n++) {
        if (!alreadyPresent.has(n)) pending.push(n);
      }

      // Simple fixed-width concurrency: process in batches of HYDRATION_PARALLELISM.
      for (let i = 0; i < pending.length; i += HYDRATION_PARALLELISM) {
        if (signal?.aborted) return;
        const batch = pending.slice(i, i + HYDRATION_PARALLELISM);
        const results = await Promise.all(
          batch.map(async (n) => {
            const surahMeta = surahMetaByNumber.get(n);
            if (!surahMeta) throw new Error(`Missing SurahMeta for surah ${n}`);
            const data = await fetchEditionSurahForMeta(meta, n, surahMeta, signal!);
            return { n, data };
          }),
        );
        // Write sequentially to avoid hammering IDB with parallel transactions;
        // on most engines idb-keyval serializes anyway.
        for (const { n, data } of results) {
          if (signal?.aborted) return;
          await idbSet(surahKey(editionId, n), data, store);
          alreadyPresent.add(n);
          completed++;
          onProgress?.({ completed, total, currentEdition: editionId });
        }
        // Persist manifest progress per batch so a mid-hydration close doesn't
        // lose knowledge of what was already written.
        editionsPresent[editionId] = Array.from(alreadyPresent).sort((a, b) => a - b);
        const manifest: CorpusManifest = {
          version: 1,
          editionsPresent,
          lastHydrated: Date.now(),
        };
        await idbSet(MANIFEST_KEY, manifest, store);
      }
    }
  }

  async invalidate(): Promise<void> {
    const allKeys = await idbKeys(store);
    const ours = allKeys.filter(
      (k): k is string => typeof k === 'string' && (k.startsWith('quran:surah:') || k === MANIFEST_KEY),
    );
    if (ours.length > 0) await idbDelMany(ours, store);
    // Belt-and-braces: ensure manifest is gone even if the filter missed it.
    await idbDel(MANIFEST_KEY, store);
  }
}

/** Shared singleton consumed by the Quran reader + consent component. */
export const quranCorpus: QuranOfflineCorpus = new IndexedDbQuranCorpus();
