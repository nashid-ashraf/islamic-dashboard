import { useState, useEffect, useCallback } from 'react';
import type { Bookmark } from '../models/quran';
import type { StorageService } from '../ports/storage';
import { generateId } from '../utils/dateHelpers';

export interface BookmarksState {
  bookmarks: Bookmark[];
  loading: boolean;
}

export interface BookmarksActions {
  addBookmark: (surah: number, ayahNum: number, surahName: string, label?: string) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
  isBookmarked: (surah: number, ayahNum: number) => boolean;
}

export function useBookmarks(storage: StorageService): BookmarksState & BookmarksActions {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.getBookmarks().then((saved) => {
      setBookmarks(saved);
      setLoading(false);
    });
  }, [storage]);

  const addBookmark = useCallback(async (
    surah: number,
    ayahNum: number,
    surahName: string,
    label: string = '',
  ) => {
    const now = Date.now();
    const bookmark: Bookmark = {
      id: generateId(),
      surah,
      ayahNum,
      surahName,
      label: label || `${surahName} — Ayah ${ayahNum}`,
      createdAt: now,
      updatedAt: now,
    };
    await storage.saveBookmark(bookmark);
    setBookmarks((prev) => [bookmark, ...prev]);
  }, [storage]);

  const removeBookmark = useCallback(async (id: string) => {
    await storage.deleteBookmark(id);
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, [storage]);

  const isBookmarked = useCallback((surah: number, ayahNum: number) => {
    return bookmarks.some((b) => b.surah === surah && b.ayahNum === ayahNum);
  }, [bookmarks]);

  return { bookmarks, loading, addBookmark, removeBookmark, isBookmarked };
}
