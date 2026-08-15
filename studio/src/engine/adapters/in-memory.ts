/**
 * engine/adapters/in-memory.ts
 *
 * Lightweight in-browser adapters for the pilot app. The full game will supply
 * these same interfaces with the real implementations (toast container, the
 * immutable economy audit ledger, and the haptic/SFX engine), preserving the
 * exact `window.__EconomyAuditLog` / `createToastNotification` behavior.
 */
import type { AuditPort, HapticsPort, ToastPort } from '../ports';

export class ToastAdapter implements ToastPort {
  private container: HTMLElement | null = null;

  private el(): HTMLElement {
    if (!this.container) {
      this.container = document.getElementById('toast-container');
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        document.body.appendChild(this.container);
      }
    }
    return this.container;
  }

  notify(message: string, tone: 'normal' | 'good' | 'error'): void {
    const node = document.createElement('div');
    node.className = `toast ${tone}`;
    node.textContent = message;
    this.el().appendChild(node);
    window.setTimeout(() => node.remove(), 4000);
  }
}

export class AuditAdapter implements AuditPort {
  private readonly log: Array<{ event: string; detail: string; amount: number; at: number }> = [];

  record(event: string, detail: string, amount: number): void {
    this.log.push({ event, detail, amount, at: Date.now() });
    // The full game persists to localStorage and mirrors to window.__EconomyAuditLog.
  }

  entries(): ReadonlyArray<{ event: string; detail: string; amount: number; at: number }> {
    return this.log;
  }
}

export class HapticsAdapter implements HapticsPort {
  effect(name: 'place' | 'click' | 'door' | 'remove'): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      const pattern = name === 'place' ? [30, 50, 30] : name === 'remove' ? [15, 30, 15] : [20];
      try {
        navigator.vibrate(pattern);
      } catch {
        /* no-op */
      }
    }
  }
}
