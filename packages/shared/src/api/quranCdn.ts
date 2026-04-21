// Client for the fawazahmed0/quran-api static JSON CDN (hosted on JSDelivr).
// Used for editions not available on AlQuran.cloud — specifically Dr Mustafa
// Khattab's "The Clear Quran" (eng-mustafakhattaba).
//
// URL: https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/{slug}/{n}.json
// Shape: { chapter: [{ chapter, verse, text }] }
//
// This client deliberately does NOT go through httpClient.ts's Map cache — the
// QuranOfflineCorpus is the durable cache layer for these reads. We still pass
// AbortSignal + timeout through so hydration can be cancelled cleanly.

import type { EditionSurah, SurahMeta } from '../models/quran';

const BASE_URL = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions';
const REQUEST_TIMEOUT_MS = 15_000;

interface CdnResponse {
  chapter: { chapter: number; verse: number; text: string }[];
}

/**
 * Fetch a single surah for a fawazahmed0-CDN edition.
 *
 * The CDN's per-surah JSON does not include surah metadata (name, revelation
 * type, ayah count). The caller must supply it — typically from the already-
 * cached `SurahMeta` list fetched once at app load.
 */
export async function fetchCdnEditionSurah(
  editionSlug: string,
  surahNumber: number,
  meta: SurahMeta,
  signal?: AbortSignal,
): Promise<EditionSurah> {
  const url = `${BASE_URL}/${editionSlug}/${surahNumber}.json`;

  const timeoutController = new AbortController();
  const timeoutHandle = setTimeout(
    () => timeoutController.abort(new DOMException('Request timed out', 'TimeoutError')),
    REQUEST_TIMEOUT_MS,
  );
  const composed = signal
    ? composeSignals(signal, timeoutController.signal)
    : timeoutController.signal;

  try {
    const res = await fetch(url, { signal: composed });
    if (!res.ok) throw new Error(`fawazahmed0 CDN returned HTTP ${res.status}`);
    const data = (await res.json()) as CdnResponse;
    if (!Array.isArray(data.chapter)) {
      throw new Error('Unexpected fawazahmed0 CDN response shape');
    }
    return {
      meta,
      ayahs: data.chapter.map((v) => ({
        numberInSurah: v.verse,
        text: v.text,
      })),
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

/**
 * Compose one or more AbortSignals into a single signal. Duplicated locally
 * instead of importing from httpClient so this module stays independent of the
 * Map-based cache layer there.
 */
function composeSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  const onAbort = (ev: Event) => {
    const source = ev.target as AbortSignal;
    controller.abort(source.reason);
  };
  for (const s of signals) {
    if (s.aborted) {
      controller.abort(s.reason);
      return controller.signal;
    }
    s.addEventListener('abort', onAbort, { once: true });
  }
  return controller.signal;
}
