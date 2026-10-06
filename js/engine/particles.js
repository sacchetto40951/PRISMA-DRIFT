// particles.js — Object-pooled particle system.
// Never allocates new particles per frame; recycles from a fixed pool.

import { PARTICLES } from '../core/config.js';

const pool = [];
let activeCount = 0;
let maxActive = PARTICLES.MAX_COUNT;

function createParticle() {
  return {
    active: false,
    x: 0, y: 0,
    vx: 0, vy: 0,
    life: 0, maxLife: 1,
    size: 2,
    color: '#ffffff',
    alpha: 1,
    gravity: 0,
    shrink: true,
    shape: 'circle', // 'circle', 'square', 'line'
    rotation: 0,
    rotationSpeed: 0,
  };
}

// Pre-allocate pool
for (let i = 0; i < PARTICLES.MAX_COUNT; i++) {
  pool.push(createParticle());
}

function getInactiveParticle() {
  for (let i = 0; i < pool.length; i++) {
    if (!pool[i].active) return pool[i];
  }
  return null; // pool exhausted
}

/**
 * Emit a burst of particles.
 * @param {object} config - { x, y, count, speed, spread, life, color, size, gravity, shape }
 */
export function emitParticles(config) {
  const count = Math.min(config.count || 5, maxActive - activeCount);

  for (let i = 0; i < count; i++) {
    const p = getInactiveParticle();
    if (!p) break;

    const angle = (config.angle ?? Math.random() * Math.PI * 2) +
                  (Math.random() - 0.5) * (config.spread ?? Math.PI * 2);
    const speed = (config.speed || 100) * (0.5 + Math.random() * 0.5);

    p.active = true;
    p.x = config.x + (Math.random() - 0.5) * (config.offsetX || 0);
    p.y = config.y + (Math.random() - 0.5) * (config.offsetY || 0);
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.life = (config.life || 0.5) * (0.7 + Math.random() * 0.3);
    p.maxLife = p.life;
    p.size = (config.size || 3) * (0.5 + Math.random() * 0.5);
    p.color = Array.isArray(config.color)
      ? config.color[Math.floor(Math.random() * config.color.length)]
      : (config.color || '#ffffff');
    p.alpha = 1;
    p.gravity = config.gravity ?? 200;
    p.shrink = config.shrink ?? true;
    p.shape = config.shape || 'circle';
    p.rotation = Math.random() * Math.PI * 2;
    p.rotationSpeed = (Math.random() - 0.5) * 5;

    activeCount++;
  }
}

/**
 * Emit trail particle (single particle, called each frame).
 */
export function emitTrailParticle(x, y, color, size) {
  const p = getInactiveParticle();
  if (!p) return;

  p.active = true;
  p.x = x + (Math.random() - 0.5) * 4;
  p.y = y + (Math.random() - 0.5) * 4;
  p.vx = -20 + (Math.random() - 0.5) * 20;
  p.vy = (Math.random() - 0.5) * 30;
  p.life = 0.25 + Math.random() * 0.15;
  p.maxLife = p.life;
  p.size = size || 3;
  p.color = color || '#00f0ff';
  p.alpha = 0.8;
  p.gravity = 50;
  p.shrink = true;
  p.shape = 'circle';

  activeCount++;
}

/**
 * Update all active particles.
 */
export function updateParticles(dt) {
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    if (!p.active) continue;

    p.life -= dt;
    if (p.life <= 0) {
      p.active = false;
      activeCount--;
      continue;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.gravity * dt;
    p.rotation += p.rotationSpeed * dt;

    const lifeRatio = p.life / p.maxLife;
    p.alpha = lifeRatio;
    if (p.shrink) {
      p.size *= 0.98;
    }
  }
}

/**
 * Render all active particles.
 */
export function renderParticles(ctx, cameraX, cameraY) {
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    if (!p.active) continue;

    const sx = p.x - cameraX;
    const sy = p.y - cameraY;

    // Skip off-screen particles
    if (sx < -50 || sx > 1400 || sy < -50 || sy > 800) continue;

    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;

    if (p.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(p.size * 0.5, 0.5), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'square') {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(p.rotation);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    } else if (p.shape === 'line') {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(p.rotation);
      ctx.fillRect(-p.size, -0.5, p.size * 2, 1);
      ctx.restore();
    }
  }

  ctx.globalAlpha = 1;
}

/**
 * Set adaptive quality (reduce max particles if performance is low).
 */
export function setParticleQuality(quality) {
  maxActive = quality < 0.5 ? PARTICLES.REDUCED_MAX : PARTICLES.MAX_COUNT;
}

/**
 * Get active particle count (for debug display).
 */
export function getActiveParticleCount() {
  return activeCount;
}

/**
 * Kill all active particles (on reset).
 */
export function clearAllParticles() {
  for (let i = 0; i < pool.length; i++) {
    pool[i].active = false;
  }
  activeCount = 0;
}
