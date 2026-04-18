/**
 * Thin fetch wrapper with timeout, cancellation, and in-memory TTL caching.
 * Used by all API clients in this package.
 */

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

export interface HttpOptions {
  /** Abort the request after this many ms. Default: 10_000. */
  timeoutMs?: number;
  /** Caller-provided signal merged with the internal timeout signal. */
  signal?: AbortSignal;
  /** If set, cache the JSON response under cacheKey (default: url) for this long. */
  cacheTtlMs?: number;
  /** Override cache key (default: url). */
  cacheKey?: string;
}

/**
 * Compose one or more signals into a single signal that aborts when any source aborts.
 * Avoids AbortSignal.any() to keep the baseline broad (older Safari / RN engines).
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

export async function httpFetchJson<T>(url: string, opts: HttpOptions = {}): Promise<T> {
  const { timeoutMs = 10_000, signal, cacheTtlMs, cacheKey = url } = opts;

  if (cacheTtlMs != null) {
    const hit = cache.get(cacheKey);
    if (hit && hit.expires > Date.now()) {
      return hit.data as T;
    }
  }

  const timeoutController = new AbortController();
  const timeoutHandle = setTimeout(
    () => timeoutController.abort(new DOMException('Request timed out', 'TimeoutError')),
    timeoutMs,
  );

  const composedSignal = signal
    ? composeSignals(signal, timeoutController.signal)
    : timeoutController.signal;

  try {
    const res = await fetch(url, { signal: composedSignal });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const data = (await res.json()) as T;

    if (cacheTtlMs != null) {
      cache.set(cacheKey, { data, expires: Date.now() + cacheTtlMs });
    }
    return data;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

/** Drop all cached responses. Intended for tests and manual refresh flows. */
export function clearHttpCache(): void {
  cache.clear();
}
