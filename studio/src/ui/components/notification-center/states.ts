/**
 * ui/components/notification-center/states.ts — NotificationCenter state machine.
 *
 * Notifications have a severity, a read/unread flag, and an auto-dismiss
 * lifetime. The state machine owns queueing, reading, dismissing, and filtering
 * by severity — the view just renders it.
 */

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export interface NotificationItem {
  id: string;
  severity: NotificationSeverity;
  message: string;
  at: number;
  read: boolean;
}

export interface NotificationCenterState {
  items: NotificationItem[];
  /** Auto-dismiss lifetime in ms (0 = never). */
  ttlMs: number;
  maxItems: number;
}

export function notificationState(ttlMs = 8000, maxItems = 50): NotificationCenterState {
  return { items: [], ttlMs, maxItems };
}

export function notify(
  state: NotificationCenterState,
  id: string,
  severity: NotificationSeverity,
  message: string,
  at: number,
): NotificationCenterState {
  const item: NotificationItem = { id, severity, message, at, read: false };
  const items = [item, ...state.items];
  if (items.length > state.maxItems) items.length = state.maxItems;
  return { ...state, items };
}

export function markRead(state: NotificationCenterState, id: string): NotificationCenterState {
  return {
    ...state,
    items: state.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
  };
}

export function dismiss(state: NotificationCenterState, id: string): NotificationCenterState {
  return { ...state, items: state.items.filter((n) => n.id !== id) };
}

/** Remove notifications whose ttl has expired (returns new state + removed ids). */
export function expire(state: NotificationCenterState, now: number): { state: NotificationCenterState; removed: string[] } {
  if (state.ttlMs <= 0) return { state, removed: [] };
  const removed: string[] = [];
  const items = state.items.filter((n) => {
    const expired = now - n.at >= state.ttlMs;
    if (expired) removed.push(n.id);
    return !expired;
  });
  return { state: { ...state, items }, removed };
}

export function filterBySeverity(state: NotificationCenterState, severity: NotificationSeverity): NotificationItem[] {
  return state.items.filter((n) => n.severity === severity);
}

export function unreadCount(state: NotificationCenterState): number {
  return state.items.filter((n) => !n.read).length;
}
