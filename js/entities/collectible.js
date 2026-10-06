// collectible.js — Factory and helpers for fragment/coin pickups.

import { COLLECTIBLE } from '../core/config.js';

/**
 * Create a collectible fragment entity.
 * @param {number} x
 * @param {number} y
 * @param {number} [value=10]
 */
export function createCollectible(x, y, value = COLLECTIBLE.BASE_VALUE) {
  return {
    x,
    y,
    width: COLLECTIBLE.SIZE,
    height: COLLECTIBLE.SIZE,
    value,
    active: true,
    bobPhase: Math.random() * Math.PI * 2,
  };
}
