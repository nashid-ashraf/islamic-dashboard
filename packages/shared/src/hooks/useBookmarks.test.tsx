import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBookmarks } from './useBookmarks';
import { createMockStorage } from '../test/mockStorage';

describe('useBookmarks', () => {
  it('loads an empty list from fresh storage', async () => {
    const storage = createMockStorage();
    const { result } = renderHook(() => useBookmarks(storage));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.bookmarks).toEqual([]);
  });

  it('adds a bookmark and reports it as bookmarked', async () => {
    const storage = createMockStorage();
    const { result } = renderHook(() => useBookmarks(storage));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addBookmark(2, 255, 'Al-Baqarah');
    });

    expect(result.current.bookmarks).toHaveLength(1);
    expect(result.current.bookmarks[0]).toMatchObject({
      surah: 2,
      ayahNum: 255,
      surahName: 'Al-Baqarah',
      label: 'Al-Baqarah — Ayah 255',
    });
    expect(result.current.isBookmarked(2, 255)).toBe(true);
    expect(result.current.isBookmarked(2, 256)).toBe(false);
    expect(storage.state.bookmarks).toHaveLength(1);
  });

  it('removes a bookmark by id', async () => {
    const storage = createMockStorage({
      bookmarks: [
        {
          id: 'b1',
          surah: 1,
          ayahNum: 1,
          surahName: 'Al-Faatiha',
          label: 'Al-Faatiha — Ayah 1',
          createdAt: 0,
          updatedAt: 0,
        },
      ],
    });
    const { result } = renderHook(() => useBookmarks(storage));
    await waitFor(() => expect(result.current.bookmarks).toHaveLength(1));

    await act(async () => {
      await result.current.removeBookmark('b1');
    });

    expect(result.current.bookmarks).toHaveLength(0);
    expect(storage.state.bookmarks).toHaveLength(0);
  });

  it('honors a custom label when provided', async () => {
    const storage = createMockStorage();
    const { result } = renderHook(() => useBookmarks(storage));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addBookmark(36, 1, 'Ya-Sin', 'Heart of the Quran');
    });

    expect(result.current.bookmarks[0].label).toBe('Heart of the Quran');
  });
});
