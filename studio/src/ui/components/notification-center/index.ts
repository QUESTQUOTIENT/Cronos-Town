/**
 * ui/components/notification-center/index.ts — the NotificationCenter component.
 *
 * Atomic component (following the Button pattern): owns its state machine. The
 * view renders the queue; the controller here drives notify/read/dismiss/expire.
 */
import {
  dismiss,
  expire,
  markRead,
  notify,
  notificationState,
  unreadCount,
  type NotificationCenterState,
  type NotificationItem,
  type NotificationSeverity,
} from './states';

export { dismiss, expire, markRead, notify, notificationState, unreadCount };
export type { NotificationCenterState, NotificationItem, NotificationSeverity };

export class NotificationCenter {
  private state = notificationState();

  constructor(ttlMs = 8000, maxItems = 50) {
    this.state = notificationState(ttlMs, maxItems);
  }

  get snapshot(): NotificationCenterState {
    return { ...this.state, items: [...this.state.items] };
  }

  push(id: string, severity: NotificationSeverity, message: string, at: number): void {
    this.state = notify(this.state, id, severity, message, at);
  }

  read(id: string): void {
    this.state = markRead(this.state, id);
  }

  dismiss(id: string): void {
    this.state = dismiss(this.state, id);
  }

  /** Expire timed-out notifications; returns the removed ids. */
  tick(now: number): string[] {
    const { state, removed } = expire(this.state, now);
    this.state = state;
    return removed;
  }

  get unread(): number {
    return unreadCount(this.state);
  }
}
