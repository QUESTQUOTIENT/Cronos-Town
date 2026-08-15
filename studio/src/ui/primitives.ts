/**
 * ui/primitives.ts — design-system primitives (spec layer).
 *
 * The full primitive set — Button, Input, Checkbox, Slider, Toggle, Dropdown.
 * These are pure data specs (like `ui/components.ts`); the `DomUiAdapter` (or a
 * richer adapter) renders them. Keeps every screen composed from the same
 * primitive vocabulary instead of bespoke markup.
 */

import type { ComponentTone } from './components';

export interface InputSpec {
  kind: 'input';
  id: string;
  label?: string;
  placeholder?: string;
  value?: string;
  type?: 'text' | 'number' | 'password';
}

export interface CheckboxSpec {
  kind: 'checkbox';
  id: string;
  label: string;
  checked?: boolean;
}

export interface SliderSpec {
  kind: 'slider';
  id: string;
  label?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
}

export interface ToggleSpec {
  kind: 'toggle';
  id: string;
  label: string;
  on?: boolean;
}

export interface DropdownSpec {
  kind: 'dropdown';
  id: string;
  label?: string;
  value?: string;
  options: Array<{ value: string; label: string }>;
}

export type PrimitiveSpec = InputSpec | CheckboxSpec | SliderSpec | ToggleSpec | DropdownSpec;

export type { ComponentTone };

/** Clamp a slider value to its [min,max]/step range (pure helper). */
export function clampSlider(value: number, min: number, max: number, step = 1): number {
  const clamped = Math.min(max, Math.max(min, value));
  if (!step || step <= 0) return clamped;
  const steps = Math.round((clamped - min) / step);
  const stepped = min + steps * step;
  return Math.min(max, Math.max(min, Number(stepped.toFixed(6))));
}

/** A dropdown option is selected by value (pure helper). */
export function selectedOption(options: Array<{ value: string; label: string }>, value: string): string {
  return options.some((o) => o.value === value) ? value : (options[0]?.value ?? '');
}
