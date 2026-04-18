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
  updateReminder(reminder: Reminder): Promise<void>;
  deleteReminder(id: string): Promise<void>;

  // Settings
  getPrayerSettings(): Promise<PrayerSettings | null>;
  savePrayerSettings(settings: PrayerSettings): Promise<void>;
}
