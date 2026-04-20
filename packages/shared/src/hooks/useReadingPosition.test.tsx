import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReadingPosition } from './useReadingPosition';
import { createMockStorage } from '../test/mockStorage';

describe('useReadingPosition', () => {
  it('returns null until storage resolves, then exposes the saved position', async () => {
    const storage = createMockStorage({
      readingPosition: { surah: 2, ayahNum: 286, surahName: 'Al-Baqarah', timestamp: 1 },
    });
    const { result } = renderHook(() => useReadingPosition(storage));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.position).toEqual({
      surah: 2,
      ayahNum: 286,
      surahName: 'Al-Baqarah',
      timestamp: 1,
    });
  });

  it('savePosition writes through to storage', async () => {
    const storage = createMockStorage();
    const { result } = renderHook(() => useReadingPosition(storage));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.savePosition(18, 10, 'Al-Kahf');
    });

    expect(result.current.position).toMatchObject({
      surah: 18,
      ayahNum: 10,
      surahName: 'Al-Kahf',
    });
    expect(storage.state.readingPosition?.surah).toBe(18);
  });

  it('clearPosition resets to Al-Faatiha ayah 1 with timestamp 0', async () => {
    const storage = createMockStorage({
      readingPosition: { surah: 18, ayahNum: 10, surahName: 'Al-Kahf', timestamp: 5 },
    });
    const { result } = renderHook(() => useReadingPosition(storage));
    await waitFor(() => expect(result.current.position?.surah).toBe(18));

    await act(async () => {
      await result.current.clearPosition();
    });

    expect(storage.state.readingPosition).toEqual({
      surah: 1,
      ayahNum: 1,
      surahName: 'Al-Faatiha',
      timestamp: 0,
    });
  });
});
