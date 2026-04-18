import { useState, useEffect, useCallback } from 'react';
import type { ReadingPosition } from '../models/quran';
import type { StorageService } from '../ports/storage';

export interface ReadingPositionState {
  position: ReadingPosition | null;
  loading: boolean;
}

export interface ReadingPositionActions {
  savePosition: (surah: number, ayahNum: number, surahName: string) => Promise<void>;
  clearPosition: () => Promise<void>;
}

export function useReadingPosition(
  storage: StorageService,
): ReadingPositionState & ReadingPositionActions {
  const [position, setPosition] = useState<ReadingPosition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storage.getReadingPosition().then((saved) => {
      setPosition(saved);
      setLoading(false);
    });
  }, [storage]);

  const savePosition = useCallback(async (
    surah: number,
    ayahNum: number,
    surahName: string,
  ) => {
    const pos: ReadingPosition = {
      surah,
      ayahNum,
      surahName,
      timestamp: Date.now(),
    };
    setPosition(pos);
    await storage.saveReadingPosition(pos);
  }, [storage]);

  const clearPosition = useCallback(async () => {
    setPosition(null);
    await storage.saveReadingPosition({ surah: 1, ayahNum: 1, surahName: 'Al-Faatiha', timestamp: 0 });
  }, [storage]);

  return { position, loading, savePosition, clearPosition };
}
