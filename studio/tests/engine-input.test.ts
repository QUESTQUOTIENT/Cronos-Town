import { describe, expect, it } from 'vitest';

import {
  facingEdgeDirection,
  isMovementKey,
  movementFor,
  MOVEMENT_KEYS,
  movementSpriteDirection,
  normalizeKey,
} from '../src/engine/input/mapping';

describe('engine/input/mapping — movement + facing', () => {
  it('movement table maps arrows + WASD', () => {
    expect(MOVEMENT_KEYS.ArrowUp).toEqual([0, -1]);
    expect(MOVEMENT_KEYS.ArrowDown).toEqual([0, 1]);
    expect(MOVEMENT_KEYS.ArrowLeft).toEqual([-1, 0]);
    expect(MOVEMENT_KEYS.ArrowRight).toEqual([1, 0]);
    expect(MOVEMENT_KEYS.w).toEqual([0, -1]);
    expect(MOVEMENT_KEYS.s).toEqual([0, 1]);
    expect(MOVEMENT_KEYS.a).toEqual([-1, 0]);
    expect(MOVEMENT_KEYS.d).toEqual([1, 0]);
    expect(Object.keys(MOVEMENT_KEYS)).toHaveLength(8);
  });

  it('normalizes single-char keys to lowercase, leaves named keys intact', () => {
    expect(normalizeKey('W')).toBe('w');
    expect(normalizeKey('z')).toBe('z');
    expect(normalizeKey('ArrowUp')).toBe('ArrowUp');
    expect(normalizeKey('Enter')).toBe('Enter');
  });

  it('isMovementKey / movementFor', () => {
    expect(isMovementKey('w')).toBe(true);
    expect(isMovementKey('ArrowLeft')).toBe(true);
    expect(isMovementKey('z')).toBe(false);
    expect(movementFor('d')).toEqual([1, 0]);
    expect(movementFor('x')).toBeNull();
  });

  it('facing vector → cardinal direction', () => {
    expect(facingEdgeDirection({ x: -1, y: 0 })).toBe('west');
    expect(facingEdgeDirection({ x: 1, y: 0 })).toBe('east');
    expect(facingEdgeDirection({ x: 0, y: -1 })).toBe('north');
    expect(facingEdgeDirection({ x: 0, y: 1 })).toBe('south');
    expect(facingEdgeDirection({ x: 0, y: 0 })).toBe('south'); // default
  });

  it('movement vector → sprite direction', () => {
    expect(movementSpriteDirection(-1, 0)).toBe('left');
    expect(movementSpriteDirection(1, 0)).toBe('right');
    expect(movementSpriteDirection(0, -1)).toBe('up');
    expect(movementSpriteDirection(0, 1)).toBe('down');
  });
});
