import type {
  NotificationScheduler,
  ScheduledNotification,
  NotificationPermissionState,
} from '@islamic-dashboard/shared';

/** setTimeout delay caps at ~24.8 days; any longer is effectively "not scheduled". */
const MAX_TIMEOUT_DELAY_MS = 2_147_000_000;

/**
 * Web implementation of NotificationScheduler.
 * Uses setTimeout + the browser Notification API. Timers are in-memory only and
 * DO NOT survive a page reload — callers must re-hydrate on app boot.
 */
/** Non-port extension used by the orchestrator to react to permission changes. */
export interface WebPermissionSignal {
  onPermissionChange(listener: () => void): () => void;
}

class WebNotificationScheduler implements NotificationScheduler, WebPermissionSignal {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly permissionListeners = new Set<() => void>();

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  currentPermission(): NotificationPermissionState {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission as NotificationPermissionState;
  }

  async requestPermission(): Promise<NotificationPermissionState> {
    if (!this.isSupported()) return 'unsupported';
    const before = Notification.permission;
    let result: NotificationPermission = before;
    if (before === 'default') {
      result = await Notification.requestPermission();
    }
    if (result !== before) {
      for (const listener of this.permissionListeners) listener();
    }
    return result as NotificationPermissionState;
  }

  onPermissionChange(listener: () => void): () => void {
    this.permissionListeners.add(listener);
    return () => {
      this.permissionListeners.delete(listener);
    };
  }

  async schedule(notification: ScheduledNotification): Promise<void> {
    await this.cancel(notification.key);
    const delay = notification.whenMs - Date.now();
    if (delay <= 0 || delay > MAX_TIMEOUT_DELAY_MS) return;

    const handle = setTimeout(() => {
      this.show(notification.title, notification.body);
      this.timers.delete(notification.key);
    }, delay);
    this.timers.set(notification.key, handle);
  }

  async cancel(key: string): Promise<void> {
    const handle = this.timers.get(key);
    if (handle) {
      clearTimeout(handle);
      this.timers.delete(key);
    }
  }

  async cancelByPrefix(prefix: string): Promise<void> {
    for (const key of Array.from(this.timers.keys())) {
      if (key.startsWith(prefix)) await this.cancel(key);
    }
  }

  private show(title: string, body: string): void {
    if (!this.isSupported() || Notification.permission !== 'granted') return;
    try {
      new Notification(title, { body, icon: '/icon-192.png', silent: false });
    } catch {
      // Some browsers require SW registration for Notification; ignore silently.
    }
  }
}

export const notificationScheduler: NotificationScheduler & WebPermissionSignal =
  new WebNotificationScheduler();
