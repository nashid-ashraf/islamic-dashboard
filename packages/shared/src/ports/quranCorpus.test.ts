import { describe, it, expect } from 'vitest';
import { createMockQuranCorpus } from '../test/mockQuranCorpus';
import type { HydrationProgress } from './quranCorpus';

describe('QuranOfflineCorpus (mock contract)', () => {
  it('returns null from getSurah when nothing is hydrated', async () => {
    const corpus = createMockQuranCorpus();
    expect(await corpus.getSurah('ar-uthmani', 1)).toBeNull();
    expect(await corpus.isPresent()).toBe(false);
    expect(await corpus.getManifest()).toBeNull();
  });

  it('populates all editions and reports progress monotonically', async () => {
    const corpus = createMockQuranCorpus();
    const events: HydrationProgress[] = [];
    await corpus.hydrate((p) => events.push(p));

    expect(await corpus.isPresent()).toBe(true);
    expect(events[0].completed).toBe(1);
    expect(events[events.length - 1].completed).toBe(events[events.length - 1].total);
    // Monotonic non-decreasing progress
    for (let i = 1; i < events.length; i++) {
      expect(events[i].completed).toBeGreaterThanOrEqual(events[i - 1].completed);
    }
    // Progress cycles through each edition
    const editionsSeen = new Set(events.map((e) => e.currentEdition));
    expect(editionsSeen).toContain('ar-uthmani');
    expect(editionsSeen).toContain('en-sahih');
    expect(editionsSeen).toContain('en-khattab');
    expect(editionsSeen).toContain('bn-muhiuddin');
  });

  it('is resumable — pre-populated records are not re-fetched', async () => {
    const corpus = createMockQuranCorpus({
      surahs: {
        'ar-uthmani': new Map([
          [1, { meta: { number: 1, name: 'n', englishName: 'e', englishNameTranslation: '', numberOfAyahs: 1, revelationType: 'Meccan' }, ayahs: [{ numberInSurah: 1, text: 'pre-existing' }] }],
        ]),
      },
    });
    await corpus.hydrate();
    // The pre-existing record is preserved (not overwritten)
    const pre = await corpus.getSurah('ar-uthmani', 1);
    expect(pre?.ayahs[0].text).toBe('pre-existing');
    // All editions × 114 are now present
    expect(await corpus.isPresent()).toBe(true);
  });

  it('aborts hydration cleanly on signal', async () => {
    const corpus = createMockQuranCorpus();
    const controller = new AbortController();
    const events: HydrationProgress[] = [];
    controller.abort(); // abort before starting
    await corpus.hydrate((p) => events.push(p), controller.signal);
    expect(events).toHaveLength(0);
    expect(await corpus.isPresent()).toBe(false);
  });

  it('invalidate wipes manifest and all cached records', async () => {
    const corpus = createMockQuranCorpus();
    await corpus.hydrate();
    expect(await corpus.isPresent()).toBe(true);
    await corpus.invalidate();
    expect(await corpus.isPresent()).toBe(false);
    expect(await corpus.getManifest()).toBeNull();
    expect(await corpus.getSurah('ar-uthmani', 1)).toBeNull();
  });
});
