// @islamic-dashboard/shared
// Barrel exports for all shared modules

// Models
export * from './models/prayer';
export * from './models/quran';
export * from './models/reminder';
export * from './models/editions';
export * from './models/adhkar';

// Platform ports (interfaces only — implementations live in platform packages)
export * from './ports';

// API clients
export * from './api/aladhan';
export * from './api/alquran';
export * from './api/quranCdn';
export { clearHttpCache } from './api/httpClient';

// Hooks
export * from './hooks/usePrayerTimes';
export * from './hooks/useQuran';
export * from './hooks/useBookmarks';
export * from './hooks/useReminders';
export * from './hooks/useReadingPosition';
export * from './hooks/useAdhkarRoutine';

// Data
export { ADHKAR_ROUTINES, ADHKAR_ROUTINE_IDS } from './data/adhkar';

// Utils
export * from './utils/theme';
export * from './utils/dateHelpers';
export * from './utils/reminderSchedule';
