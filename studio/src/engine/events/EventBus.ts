/**
 * engine/events/EventBus.ts
 *
 * Central, typed publish/subscribe bus. Every cross-module message flows through
 * here; no feature may call another feature's controller directly.
 */
export type EventHandler<T> = (payload: T) => void;
export type Unsubscribe = () => void;

export class EventBus {
  private readonly handlers = new Map<string, Set<EventHandler<unknown>>>();

  on<T>(event: string, handler: EventHandler<T>): Unsubscribe {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as EventHandler<unknown>);
    return () => this.off(event, handler);
  }

  off<T>(event: string, handler: EventHandler<T>): void {
    this.handlers.get(event)?.delete(handler as EventHandler<unknown>);
  }

  once<T>(event: string, handler: EventHandler<T>): Unsubscribe {
    const off = this.on(event, (payload: T) => {
      off();
      handler(payload);
    });
    return off;
  }

  emit<T>(event: string, payload: T): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of [...set]) {
      (handler as EventHandler<T>)(payload);
    }
  }
}
