/** A user-created custom reminder. */
export interface Reminder {
  id: string;
  title: string;
  dueTime: number | null;  // Unix timestamp ms, null if untimed
  repeat: 'none' | 'daily' | 'weekly';
  complete: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Input for creating a new reminder. */
export interface CreateReminderInput {
  title: string;
  dueTime: number | null;
  repeat: 'none' | 'daily' | 'weekly';
}
