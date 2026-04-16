type ScheduleKey = string;

const timers = new Map<ScheduleKey, ReturnType<typeof setTimeout>>();

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function currentPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'default') {
    return await Notification.requestPermission();
  }
  return Notification.permission;
}

function show(title: string, body: string): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/icon-192.png', silent: false });
  } catch {
    // Some browsers require SW registration for Notification; ignore silently in dev.
  }
}

/** Schedule a one-shot notification. Replaces any existing timer with the same key. */
export function scheduleAt(key: ScheduleKey, whenMs: number, title: string, body: string): void {
  cancel(key);
  const delay = whenMs - Date.now();
  if (delay <= 0) return;
  // setTimeout delays clamp at ~24.8 days; skip anything further out.
  if (delay > 2_147_000_000) return;
  const handle = setTimeout(() => {
    show(title, body);
    timers.delete(key);
  }, delay);
  timers.set(key, handle);
}

export function cancel(key: ScheduleKey): void {
  const handle = timers.get(key);
  if (handle) {
    clearTimeout(handle);
    timers.delete(key);
  }
}

export function cancelByPrefix(prefix: string): void {
  for (const key of Array.from(timers.keys())) {
    if (key.startsWith(prefix)) cancel(key);
  }
}
