/**
 * features/smart-menu/types.ts
 *
 * Public types for the SmartHouse PC "smart menu".
 */

export type SmartMenuView = 'main' | 'ai' | 'wallet' | 'flipsuite';

export type SmartAction = 'ai' | 'wallet' | 'flipsuite' | 'battle-cards' | 'close';

export interface SmartMenuState {
  open: boolean;
  view: SmartMenuView;
  index: number;
}

export const SMART_OPTION_COUNT = 5; // ai, wallet, flipsuite, battle-cards, close
