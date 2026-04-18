export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface ScheduledNotification {
  /** Unique key. Scheduling the same key replaces the previous one. */
  key: string;
  /** Absolute wall-clock time (Unix ms) when the notification should fire. */
  whenMs: number;
  title: string;
  body: string;
}

/**
 * Platform-agnostic notification scheduler port.
 * Web: setTimeout + Notification API (in-memory; must re-hydrate on boot).
 * Mobile: expo-notifications (persists across reloads).
 */
export interface NotificationScheduler {
  isSupported(): boolean;
  currentPermission(): NotificationPermissionState;
  requestPermission(): Promise<NotificationPermissionState>;
  /** Idempotent: scheduling a key that already exists replaces the previous schedule. */
  schedule(notification: ScheduledNotification): Promise<void>;
  cancel(key: string): Promise<void>;
  cancelByPrefix(prefix: string): Promise<void>;
}
