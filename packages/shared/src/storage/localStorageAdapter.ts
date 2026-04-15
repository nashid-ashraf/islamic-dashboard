import type { StorageService } from './types';
import type { Bookmark, ReadingPosition } from '../models/quran';
import type { Reminder } from '../models/reminder';
import type { PrayerSettings } from '../models/prayer';

const KEYS = {
  bookmarks: 'islamic_bookmarks',
  readingPosition: 'islamic_reading_position',
  reminders: 'islamic_reminders',
  prayerSettings: 'islamic_prayer_settings',
} as const;

function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setItem(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Web storage adapter using localStorage.
 * All methods are async to match the StorageService interface,
 * even though localStorage is synchronous.
 */
export class LocalStorageAdapter implements StorageService {
  // Bookmarks
  async getBookmarks(): Promise<Bookmark[]> {
    return getItem<Bookmark[]>(KEYS.bookmarks) ?? [];
  }

  async saveBookmark(bookmark: Bookmark): Promise<void> {
    const bookmarks = await this.getBookmarks();
    bookmarks.unshift(bookmark);
    setItem(KEYS.bookmarks, bookmarks);
  }

  async deleteBookmark(id: string): Promise<void> {
    const bookmarks = await this.getBookmarks();
    setItem(KEYS.bookmarks, bookmarks.filter((b) => b.id !== id));
  }

  // Reading Position
  async getReadingPosition(): Promise<ReadingPosition | null> {
    return getItem<ReadingPosition>(KEYS.readingPosition);
  }

  async saveReadingPosition(position: ReadingPosition): Promise<void> {
    setItem(KEYS.readingPosition, position);
  }

  // Reminders
  async getReminders(): Promise<Reminder[]> {
    return getItem<Reminder[]>(KEYS.reminders) ?? [];
  }

  async saveReminder(reminder: Reminder): Promise<void> {
    const reminders = await this.getReminders();
    reminders.push(reminder);
    setItem(KEYS.reminders, reminders);
  }

  async updateReminder(reminder: Reminder): Promise<void> {
    const reminders = await this.getReminders();
    const idx = reminders.findIndex((r) => r.id === reminder.id);
    if (idx !== -1) {
      reminders[idx] = reminder;
      setItem(KEYS.reminders, reminders);
    }
  }

  async deleteReminder(id: string): Promise<void> {
    const reminders = await this.getReminders();
    setItem(KEYS.reminders, reminders.filter((r) => r.id !== id));
  }

  // Settings
  async getPrayerSettings(): Promise<PrayerSettings | null> {
    return getItem<PrayerSettings>(KEYS.prayerSettings);
  }

  async savePrayerSettings(settings: PrayerSettings): Promise<void> {
    setItem(KEYS.prayerSettings, settings);
  }
}
