import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { httpFetchJson, clearHttpCache } from './httpClient';

type MockFetch = ReturnType<typeof vi.fn>;

function stubFetch(impl: (url: string, init?: RequestInit) => Promise<Response>): MockFetch {
  const fn = vi.fn(impl) as MockFetch;
  vi.stubGlobal('fetch', fn);
  return fn;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('httpFetchJson', () => {
  beforeEach(() => {
    clearHttpCache();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('returns parsed JSON on success', async () => {
    stubFetch(async () => jsonResponse({ hello: 'world' }));
    const data = await httpFetchJson<{ hello: string }>('https://example.com/x');
    expect(data.hello).toBe('world');
  });

  it('throws on non-2xx status', async () => {
    stubFetch(async () => new Response('boom', { status: 503 }));
    await expect(httpFetchJson('https://example.com/x')).rejects.toThrow(/HTTP 503/);
  });

  it('serves cached response within TTL without a second fetch', async () => {
    const fetchFn = stubFetch(async () => jsonResponse({ n: 1 }));
    await httpFetchJson('https://example.com/a', { cacheTtlMs: 60_000 });
    await httpFetchJson('https://example.com/a', { cacheTtlMs: 60_000 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after TTL expires', async () => {
    vi.useFakeTimers();
    const fetchFn = stubFetch(async () => jsonResponse({ n: 1 }));
    await httpFetchJson('https://example.com/b', { cacheTtlMs: 1_000 });
    vi.advanceTimersByTime(2_000);
    await httpFetchJson('https://example.com/b', { cacheTtlMs: 1_000 });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('does not cache when cacheTtlMs is omitted', async () => {
    const fetchFn = stubFetch(async () => jsonResponse({ n: 1 }));
    await httpFetchJson('https://example.com/c');
    await httpFetchJson('https://example.com/c');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('clearHttpCache drops entries so the next call re-fetches', async () => {
    const fetchFn = stubFetch(async () => jsonResponse({ n: 1 }));
    await httpFetchJson('https://example.com/d', { cacheTtlMs: 60_000 });
    clearHttpCache();
    await httpFetchJson('https://example.com/d', { cacheTtlMs: 60_000 });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('aborts the request when the timeout elapses', async () => {
    stubFetch((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject((init.signal as AbortSignal).reason ?? new Error('aborted'));
        });
      });
    });
    await expect(
      httpFetchJson('https://example.com/slow', { timeoutMs: 20 }),
    ).rejects.toThrow(/timed out/i);
  });

  it('respects an externally-provided AbortSignal', async () => {
    stubFetch((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject((init.signal as AbortSignal).reason ?? new Error('aborted'));
        });
      });
    });
    const controller = new AbortController();
    const pending = httpFetchJson('https://example.com/cancel', {
      timeoutMs: 10_000,
      signal: controller.signal,
    });
    controller.abort(new Error('caller cancelled'));
    await expect(pending).rejects.toThrow(/caller cancelled/);
  });
});
