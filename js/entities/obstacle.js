// obstacle.js — Factory and helpers for hazards and obstacles.

/**
 * Create a new obstacle / hazard entity.
 * @param {string} type - 'spike' | 'wall' | 'rotating'
 * @param {number} x - world X position
 * @param {number} y - world Y position
 * @param {number} width
 * @param {number} height
 * @param {object} [options]
 */
export function createObstacle(type, x, y, width, height, options = {}) {
  return {
    type,
    x,
    y,
    width,
    height,
    active: true,
    rotation: options.rotation || 0,
    rotationSpeed: options.rotationSpeed || (type === 'rotating' ? 2 : 0),
    damage: options.damage || 1,
    telegraphTimer: 0,
    ...options,
  };
}
