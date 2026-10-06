// powerup.js — Factory and helpers for power-up pickup items in the world.

/**
 * Create a power-up pickup item in the world.
 * @param {string} powerupId - Key matching POWERUP_REGISTRY
 * @param {number} x
 * @param {number} y
 * @param {number} [width=24]
 * @param {number} [height=24]
 */
export function createPowerupItem(powerupId, x, y, width = 24, height = 24) {
  return {
    powerupId,
    x,
    y,
    width,
    height,
    active: true,
    bobPhase: Math.random() * Math.PI * 2,
  };
}
