import type { StorageService } from '../ports/storage';
import type { Bookmark, ReadingPosition } from '../models/quran';
import type { Reminder } from '../models/reminder';
import type { PrayerSettings } from '../models/prayer';

/**
 * In-memory test double for `StorageService`. Every method is a real async function
 * operating on plain arrays/maps so assertions can read state directly via the
 * returned object, without needing spies.
 */
export function createMockStorage(initial?: {
  bookmarks?: Bookmark[];
  readingPosition?: ReadingPosition | null;
  reminders?: Reminder[];
  prayerSettings?: PrayerSettings | null;
}): StorageService & {
  state: {
    bookmarks: Bookmark[];
    readingPosition: ReadingPosition | null;
    reminders: Reminder[];
    prayerSettings: PrayerSettings | null;
  };
} {
  const state = {
    bookmarks: [...(initial?.bookmarks ?? [])],
    readingPosition: initial?.readingPosition ?? null,
    reminders: [...(initial?.reminders ?? [])],
    prayerSettings: initial?.prayerSettings ?? null,
  };

  return {
    state,

    async getBookmarks() {
      return [...state.bookmarks];
    },
    async saveBookmark(b: Bookmark) {
      state.bookmarks.unshift(b);
    },
    async deleteBookmark(id: string) {
      state.bookmarks = state.bookmarks.filter((b) => b.id !== id);
    },

    async getReadingPosition() {
      return state.readingPosition;
    },
    async saveReadingPosition(p: ReadingPosition) {
      state.readingPosition = p;
    },

    async getReminders() {
      return [...state.reminders];
    },
    async saveReminder(r: Reminder) {
      state.reminders.push(r);
    },
    async updateReminder(r: Reminder) {
      const idx = state.reminders.findIndex((x) => x.id === r.id);
      if (idx !== -1) state.reminders[idx] = r;
    },
    async deleteReminder(id: string) {
      state.reminders = state.reminders.filter((r) => r.id !== id);
    },

    async getPrayerSettings() {
      return state.prayerSettings;
    },
    async savePrayerSettings(s: PrayerSettings) {
      state.prayerSettings = s;
    },
  };
}
