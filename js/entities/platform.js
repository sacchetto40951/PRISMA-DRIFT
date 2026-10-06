// platform.js — Factory and helpers for static and moving platforms.

/**
 * Create a standard static platform.
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} [height=20]
 */
export function createPlatform(x, y, width, height = 20) {
  return {
    x,
    y,
    width,
    height,
    active: true,
  };
}

/**
 * Create a moving platform.
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {'vertical' | 'horizontal' | 'circular'} moveType
 * @param {number} moveRange
 * @param {number} moveSpeed
 */
export function createMovingPlatform(x, y, width, height = 20, moveType = 'vertical', moveRange = 50, moveSpeed = 1.5) {
  return {
    x,
    baseX: x,
    y,
    baseY: y,
    width,
    height,
    moveType,
    moveRange,
    moveSpeed,
    movePhase: Math.random() * Math.PI * 2,
    active: true,
  };
}
