// player.js — Player entity: procedural rendering (the "Ion" character) + animations.
// The character is drawn entirely via Canvas paths, no external sprites.

import { PLAYER } from '../core/config.js';
import { getBiome } from '../world/biomes.js';
import { getEquippedCosmetics } from '../systems/progression.js';

/**
 * Render the player character ("Ion" — a small energy entity).
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} run - current run state
 * @param {number} camX - camera X offset
 * @param {number} camY - camera Y offset
 * @param {number} time - total elapsed time (for animation)
 */
export function renderPlayer(ctx, run, camX, camY, time) {
  if (run.isDead) return;

  const sx = run.playerX - camX;
  const sy = run.playerY - camY;
  const cx = sx + PLAYER.WIDTH / 2;
  const cy = sy + PLAYER.HEIGHT / 2;

  const cosmetics = getEquippedCosmetics();
  const coreColor = cosmetics.colorHex || PLAYER.COLORS.core;

  // Squash & stretch based on velocity
  let scaleX = 1;
  let scaleY = 1;
  if (run.playerVY < -200) {
    // Rising: stretch vertically, squash horizontally
    scaleX = 0.85;
    scaleY = 1.15;
  } else if (run.playerVY > 200) {
    // Falling: squash vertically, stretch horizontally
    scaleX = 1.1;
    scaleY = 0.9;
  } else if (run.isGrounded) {
    // Subtle idle breathing
    scaleX = 1 + Math.sin(time * 3) * 0.03;
    scaleY = 1 - Math.sin(time * 3) * 0.03;
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scaleX, scaleY);

  // --- Outer glow ---
  const glowSize = 28 + Math.sin(time * 4) * 3;
  const glowGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, glowSize);
  glowGrad.addColorStop(0, coreColor + '44');
  glowGrad.addColorStop(0.5, coreColor + '18');
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(-glowSize, -glowSize, glowSize * 2, glowSize * 2);

  // --- Power-up auras ---
  if (run.activePowerups.size > 0) {
    renderPowerupAuras(ctx, run, time, coreColor);
  }

  // --- Body (energy diamond/crystal shape) ---
  const w = PLAYER.WIDTH * 0.5;
  const h = PLAYER.HEIGHT * 0.5;

  ctx.beginPath();
  ctx.moveTo(0, -h);          // top
  ctx.lineTo(w * 0.7, -h * 0.3); // upper right
  ctx.lineTo(w, h * 0.1);     // mid right
  ctx.lineTo(w * 0.5, h);     // lower right
  ctx.lineTo(-w * 0.5, h);    // lower left
  ctx.lineTo(-w, h * 0.1);    // mid left
  ctx.lineTo(-w * 0.7, -h * 0.3); // upper left
  ctx.closePath();

  // Gradient fill
  const bodyGrad = ctx.createLinearGradient(0, -h, 0, h);
  bodyGrad.addColorStop(0, lightenColor(coreColor, 40));
  bodyGrad.addColorStop(0.4, coreColor);
  bodyGrad.addColorStop(1, darkenColor(coreColor, 40));
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // Edge glow
  ctx.strokeStyle = coreColor;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = coreColor;
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // --- Inner core (bright spot) ---
  const corePulse = 3 + Math.sin(time * 6) * 1.5;
  const innerGrad = ctx.createRadialGradient(0, -2, 0, 0, -2, corePulse);
  innerGrad.addColorStop(0, '#ffffff');
  innerGrad.addColorStop(0.5, coreColor);
  innerGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.arc(0, -2, corePulse, 0, Math.PI * 2);
  ctx.fill();

  // --- Eyes (two small bright dots) ---
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-4, -4, 2, 0, Math.PI * 2);
  ctx.arc(4, -4, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // --- Trail rendering ---
  renderTrail(ctx, run, camX, camY, coreColor, time);
}

/**
 * Render power-up aura effects around the player.
 */
function renderPowerupAuras(ctx, run, time, baseColor) {
  // Spectral Phase: ghostly transparency
  if (run.activePowerups.has('spectralPhase')) {
    ctx.globalAlpha = 0.4 + Math.sin(time * 8) * 0.15;
  }

  // Shield: hexagonal aura
  if (run.activePowerups.has('prismaShield')) {
    ctx.strokeStyle = '#00ccff88';
    ctx.lineWidth = 2;
    const shieldSize = 22 + Math.sin(time * 3) * 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + time * 0.5;
      const x = Math.cos(angle) * shieldSize;
      const y = Math.sin(angle) * shieldSize;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // Gravity field: floating particles
  if (run.activePowerups.has('gravityField')) {
    ctx.fillStyle = '#aa66ff66';
    for (let i = 0; i < 5; i++) {
      const angle = time * 1.5 + (Math.PI * 2 / 5) * i;
      const r = 20 + Math.sin(time * 2 + i) * 5;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Double jump: golden trail at feet
  if (run.activePowerups.has('doubleJump') && !run._usedDoubleJump) {
    ctx.fillStyle = '#ffcc0066';
    const footY = PLAYER.HEIGHT * 0.45;
    for (let i = 0; i < 3; i++) {
      const ox = (Math.random() - 0.5) * 12;
      const oy = footY + Math.random() * 4;
      ctx.beginPath();
      ctx.arc(ox, oy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Magnet: circular field
  if (run.activePowerups.has('fragmentMagnet')) {
    ctx.strokeStyle = '#88ffcc22';
    ctx.lineWidth = 1;
    const radius = 40 + Math.sin(time * 4) * 5;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Velocity surge: speed lines from body
  if (run.activePowerups.has('velocitySurge')) {
    ctx.strokeStyle = '#ff660066';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const lx = -15 - Math.random() * 20;
      const ly = -8 + i * 5 + Math.sin(time * 10 + i) * 3;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx - 15 - Math.random() * 10, ly);
      ctx.stroke();
    }
  }

  ctx.globalAlpha = 1;
}

/**
 * Render player trail effect.
 */
function renderTrail(ctx, run, camX, camY, color, time) {
  const trail = run.trail;
  if (!trail || trail.length < 2) return;

  for (let i = 0; i < trail.length; i++) {
    const t = trail[i];
    const alpha = (i / trail.length) * 0.3;
    const size = 4 * (i / trail.length);

    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(t.x - camX, t.y - camY, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/**
 * Update player trail positions.
 */
export function updatePlayerTrail(run) {
  run.trail.unshift({
    x: run.playerX + PLAYER.WIDTH / 2,
    y: run.playerY + PLAYER.HEIGHT / 2,
  });
  while (run.trail.length > PLAYER.TRAIL_LENGTH) {
    run.trail.pop();
  }
}

/**
 * Render death animation (particle explosion).
 * Returns true while animation is still playing.
 */
export function renderDeathEffect(ctx, deathX, deathY, camX, camY, progress) {
  const sx = deathX - camX;
  const sy = deathY - camY;
  const alpha = 1 - progress;

  // Flash
  if (progress < 0.15) {
    ctx.fillStyle = `rgba(255, 255, 255, ${(0.15 - progress) * 5})`;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  // Expanding ring
  const ringRadius = progress * 80;
  ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * 0.6})`;
  ctx.lineWidth = 3 - progress * 2;
  ctx.beginPath();
  ctx.arc(sx, sy, ringRadius, 0, Math.PI * 2);
  ctx.stroke();

  return progress < 1;
}

// --- Color utility helpers ---

function lightenColor(hex, amount) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgb(${Math.min(255, rgb.r + amount)}, ${Math.min(255, rgb.g + amount)}, ${Math.min(255, rgb.b + amount)})`;
}

function darkenColor(hex, amount) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgb(${Math.max(0, rgb.r - amount)}, ${Math.max(0, rgb.g - amount)}, ${Math.max(0, rgb.b - amount)})`;
}

function hexToRgb(hex) {
  const cleaned = hex.replace('#', '').slice(0, 6);
  if (cleaned.length < 6) return null;
  return {
    r: parseInt(cleaned.substring(0, 2), 16),
    g: parseInt(cleaned.substring(2, 4), 16),
    b: parseInt(cleaned.substring(4, 6), 16),
  };
}
