import {
  migrateReminders,
  type StorageService,
  type Bookmark,
  type ReadingPosition,
  type Reminder,
  type PrayerSettings,
} from '@islamic-dashboard/shared';

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

/** Web `StorageService` implementation backed by `localStorage`. */
export class LocalStorageAdapter implements StorageService {
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

  async getReadingPosition(): Promise<ReadingPosition | null> {
    return getItem<ReadingPosition>(KEYS.readingPosition);
  }

  async saveReadingPosition(position: ReadingPosition): Promise<void> {
    setItem(KEYS.readingPosition, position);
  }

  async getReminders(): Promise<Reminder[]> {
    const raw = getItem<unknown[]>(KEYS.reminders) ?? [];
    const migrated = migrateReminders(raw);
    // If migration altered anything, write back once so subsequent reads are cheap
    // and future writes never touch v0 shapes.
    if (migrated.length !== raw.length || migrated.some((m, i) => m !== raw[i])) {
      setItem(KEYS.reminders, migrated);
    }
    return migrated;
  }

  async saveReminder(reminder: Reminder): Promise<void> {
    const reminders = await this.getReminders();
    reminders.push(reminder);
    setItem(KEYS.reminders, reminders);
  }

  async updateReminder(reminder: Reminder): Promise<void> {
    const reminders = await this.getReminders();
    const idx = reminders.findIndex((r) => r.id === reminder.id);
    if (idx !== -1) reminders[idx] = reminder;
    else reminders.push(reminder);
    setItem(KEYS.reminders, reminders);
  }

  async deleteReminder(id: string): Promise<void> {
    const reminders = await this.getReminders();
    setItem(KEYS.reminders, reminders.filter((r) => r.id !== id));
  }

  async getPrayerSettings(): Promise<PrayerSettings | null> {
    return getItem<PrayerSettings>(KEYS.prayerSettings);
  }

  async savePrayerSettings(settings: PrayerSettings): Promise<void> {
    setItem(KEYS.prayerSettings, settings);
  }
}
