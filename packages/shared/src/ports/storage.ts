import type { Bookmark, ReadingPosition } from '../models/quran';
import type { Reminder } from '../models/reminder';
import type { PrayerSettings } from '../models/prayer';

/**
 * Platform-agnostic persistence port.
 * Web implementation: localStorage. Mobile: expo-sqlite / AsyncStorage.
 */
export interface StorageService {
  // Bookmarks
  getBookmarks(): Promise<Bookmark[]>;
  saveBookmark(bookmark: Bookmark): Promise<void>;
  deleteBookmark(id: string): Promise<void>;

  // Reading Position
  getReadingPosition(): Promise<ReadingPosition | null>;
  saveReadingPosition(position: ReadingPosition): Promise<void>;

  // Reminders
  getReminders(): Promise<Reminder[]>;
  saveReminder(reminder: Reminder): Promise<void>;
  /**
   * Upsert: replaces an existing record by id, or inserts if absent. The insert
   * branch is used the first time a built-in catalog reminder is mutated — its
   * baseline lives in code, not storage, so the first toggle has nothing to
   * update against.
   */
  updateReminder(reminder: Reminder): Promise<void>;
  deleteReminder(id: string): Promise<void>;

  // Settings
  getPrayerSettings(): Promise<PrayerSettings | null>;
  savePrayerSettings(settings: PrayerSettings): Promise<void>;
}
