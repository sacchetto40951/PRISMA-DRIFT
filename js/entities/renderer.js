// renderer.js — Centralized world rendering: platforms, hazards, collectibles, power-ups.
// Draws everything in the game world using Canvas 2D.

import { getBiome } from '../world/biomes.js';
import { POWERUP_REGISTRY } from '../systems/powerupManager.js';

/**
 * Render all platforms in view.
 */
export function renderPlatforms(ctx, platforms, camX, camY, biomeId, time) {
  const biome = getBiome(biomeId);
  const colors = biome.colors;

  for (const p of platforms) {
    if (!p.active) continue;

    const sx = p.x - camX;
    const sy = p.y - camY;

    // Main platform body
    const grad = ctx.createLinearGradient(sx, sy, sx, sy + (p.height || 20));
    grad.addColorStop(0, colors.platform);
    grad.addColorStop(1, darken(colors.platform, 30));
    ctx.fillStyle = grad;
    ctx.fillRect(sx, sy, p.width, p.height || 20);

    // Top edge glow
    ctx.strokeStyle = colors.platformEdge;
    ctx.lineWidth = 2;
    ctx.shadowColor = colors.platformEdge;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + p.width, sy);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Corner accents
    ctx.fillStyle = colors.platformEdge + '44';
    ctx.fillRect(sx, sy, 4, p.height || 20);
    ctx.fillRect(sx + p.width - 4, sy, 4, p.height || 20);

    // Subtle grid pattern on surface
    ctx.strokeStyle = colors.platformEdge + '15';
    ctx.lineWidth = 0.5;
    for (let gx = sx + 20; gx < sx + p.width; gx += 30) {
      ctx.beginPath();
      ctx.moveTo(gx, sy + 2);
      ctx.lineTo(gx, sy + (p.height || 20));
      ctx.stroke();
    }
  }
}

/**
 * Render moving platforms with visual distinction.
 */
export function renderMovingPlatforms(ctx, movingPlatforms, camX, camY, biomeId, time) {
  const biome = getBiome(biomeId);
  const colors = biome.colors;

  for (const mp of movingPlatforms) {
    if (!mp.active) continue;

    const sx = mp.x - camX;
    const sy = mp.y - camY;

    // Moving platform body (slightly different style)
    ctx.fillStyle = colors.platform;
    ctx.fillRect(sx, sy, mp.width, mp.height || 20);

    // Pulsing edge
    const pulse = 0.5 + Math.sin(time * 4 + mp.movePhase) * 0.5;
    ctx.strokeStyle = colors.platformEdge;
    ctx.lineWidth = 2 + pulse;
    ctx.shadowColor = colors.platformEdge;
    ctx.shadowBlur = 8 * pulse;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + mp.width, sy);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Direction indicator arrows
    ctx.fillStyle = colors.platformEdge + '66';
    const arrowSize = 4;
    if (mp.moveType === 'vertical') {
      // Up/down arrows
      drawArrow(ctx, sx + mp.width / 2, sy - 8, 0, arrowSize);
      drawArrow(ctx, sx + mp.width / 2, sy + (mp.height || 20) + 8, Math.PI, arrowSize);
    } else if (mp.moveType === 'horizontal') {
      // Left/right arrows
      drawArrow(ctx, sx - 8, sy + (mp.height || 20) / 2, Math.PI / 2, arrowSize);
      drawArrow(ctx, sx + mp.width + 8, sy + (mp.height || 20) / 2, -Math.PI / 2, arrowSize);
    }
  }
}

/**
 * Render hazards.
 */
export function renderHazards(ctx, hazards, camX, camY, biomeId, time) {
  const biome = getBiome(biomeId);
  const colors = biome.colors;

  for (const h of hazards) {
    if (!h.active) continue;

    const sx = h.x - camX;
    const sy = h.y - camY;

    ctx.save();

    if (h.type === 'spike') {
      renderSpike(ctx, sx, sy, h.width, h.height, colors.hazard, time);
    } else if (h.type === 'wall') {
      renderWall(ctx, sx, sy, h.width, h.height, colors.hazard, time);
    } else if (h.type === 'rotating') {
      renderRotatingHazard(ctx, sx, sy, h.width, h.height, h.rotation, colors.hazard, time);
      h.rotation += h.rotationSpeed * 0.016; // approximate dt
    } else {
      // Generic hazard fallback
      ctx.fillStyle = colors.hazard;
      ctx.fillRect(sx, sy, h.width, h.height);
    }

    ctx.restore();
  }
}

function renderSpike(ctx, x, y, w, h, color, time) {
  // Triangular spike
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;

  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Warning pulse
  const pulse = 0.3 + Math.sin(time * 6) * 0.2;
  ctx.strokeStyle = color;
  ctx.globalAlpha = pulse;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Bright tip
  ctx.fillStyle = '#ffffff88';
  ctx.beginPath();
  ctx.arc(x + w / 2, y + 3, 2, 0, Math.PI * 2);
  ctx.fill();
}

function renderWall(ctx, x, y, w, h, color, time) {
  // Solid wall with warning stripes
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, color);
  grad.addColorStop(1, darken(color, 30));
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Danger stripes
  ctx.fillStyle = '#00000044';
  const stripeH = 8;
  for (let sy = y; sy < y + h; sy += stripeH * 2) {
    ctx.fillRect(x, sy, w, stripeH);
  }

  // Glow edge
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 5;
  ctx.strokeRect(x, y, w, h);
  ctx.shadowBlur = 0;
}

function renderRotatingHazard(ctx, x, y, w, h, rotation, color, time) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const radius = w / 2;

  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  // Spinning blades
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;

  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((Math.PI / 2) * i);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius * 0.3, -radius);
    ctx.lineTo(-radius * 0.3, -radius);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Center
  ctx.fillStyle = '#ffffff88';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
}

/**
 * Render collectibles (fragments).
 */
export function renderCollectibles(ctx, collectibles, camX, camY, biomeId, time) {
  const biome = getBiome(biomeId);
  const color = biome.colors.collectible;

  for (const c of collectibles) {
    if (!c.active) continue;

    const bobOffset = Math.sin(time * 3 + (c.bobPhase || 0)) * 4;
    const sx = c.x - camX;
    const sy = c.y - camY + bobOffset;

    // Glow
    const glowGrad = ctx.createRadialGradient(sx + 8, sy + 8, 0, sx + 8, sy + 8, 16);
    glowGrad.addColorStop(0, color + '44');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(sx - 8, sy - 8, 32, 32);

    // Diamond shape
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(sx + 8, sy);
    ctx.lineTo(sx + 16, sy + 8);
    ctx.lineTo(sx + 8, sy + 16);
    ctx.lineTo(sx, sy + 8);
    ctx.closePath();
    ctx.fill();

    // Shine
    ctx.fillStyle = '#ffffffaa';
    ctx.beginPath();
    ctx.arc(sx + 6, sy + 5, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Render power-up items on the ground.
 */
export function renderPowerupItems(ctx, powerupItems, camX, camY, time) {
  for (const pu of powerupItems) {
    if (!pu.active) continue;

    const def = POWERUP_REGISTRY[pu.powerupId];
    if (!def) continue;

    const bobOffset = Math.sin(time * 2.5 + (pu.bobPhase || 0)) * 6;
    const sx = pu.x - camX;
    const sy = pu.y - camY + bobOffset;
    const size = pu.width || 24;

    // Outer glow
    const glowGrad = ctx.createRadialGradient(sx + size / 2, sy + size / 2, 0, sx + size / 2, sy + size / 2, size);
    glowGrad.addColorStop(0, def.color + '66');
    glowGrad.addColorStop(0.5, def.color + '22');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(sx - size / 2, sy - size / 2, size * 2, size * 2);

    // Rotating outer ring
    ctx.save();
    ctx.translate(sx + size / 2, sy + size / 2);
    ctx.rotate(time * 2);
    ctx.strokeStyle = def.color + '88';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, size / 2 + 3, 0, Math.PI * 1.5);
    ctx.stroke();
    ctx.restore();

    // Inner body
    ctx.fillStyle = def.color;
    ctx.shadowColor = def.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(sx + size / 2, sy + size / 2, size / 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Icon text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.icon, sx + size / 2, sy + size / 2);
  }
}

/**
 * Render biome transition effect.
 */
export function renderBiomeTransition(ctx, transition, width, height, fromBiome, toBiome, time) {
  if (transition <= 0) return;

  const toColors = getBiome(toBiome).colors;

  // Vertical gradient wipe
  const alpha = transition * 0.4;
  ctx.fillStyle = toColors.portalColor + Math.floor(alpha * 255).toString(16).padStart(2, '0');
  ctx.fillRect(0, 0, width, height);

  // Portal line effect
  const lineX = width * (1 - transition);
  ctx.strokeStyle = toColors.portalColor;
  ctx.lineWidth = 3;
  ctx.shadowColor = toColors.portalColor;
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.moveTo(lineX, 0);
  ctx.lineTo(lineX, height);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

/**
 * Render debug overlay: hitboxes and info.
 */
export function renderDebugOverlay(ctx, run, entities, camX, camY, fps, particleCount) {
  ctx.strokeStyle = '#00ff0088';
  ctx.lineWidth = 1;

  // Player hitbox
  ctx.strokeRect(
    run.playerX - camX,
    run.playerY - camY,
    28, 36
  );

  // Platform hitboxes
  ctx.strokeStyle = '#0088ff66';
  for (const p of entities.platforms) {
    ctx.strokeRect(p.x - camX, p.y - camY, p.width, p.height || 20);
  }

  // Hazard hitboxes
  ctx.strokeStyle = '#ff000088';
  for (const h of entities.hazards) {
    ctx.strokeRect(h.x - camX, h.y - camY, h.width, h.height);
  }

  // Debug text
  ctx.fillStyle = '#00ff00';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  const lines = [
    `FPS: ${fps.toFixed(1)}`,
    `Pos: ${run.playerX.toFixed(0)}, ${run.playerY.toFixed(0)}`,
    `Speed: ${run.currentSpeed.toFixed(0)} px/s`,
    `VY: ${run.playerVY.toFixed(0)}`,
    `Distance: ${run.distance.toFixed(0)}`,
    `Segments: ${run.activeSegments.length}`,
    `Particles: ${particleCount}`,
    `Biome: ${run.currentBiome}`,
    `Grounded: ${run.isGrounded}`,
    `Gravity: ${run.gravityMultiplier.toFixed(2)}x`,
  ];
  lines.forEach((line, i) => {
    ctx.fillText(line, 10, 20 + i * 16);
  });
}

// --- Helpers ---

function drawArrow(ctx, x, y, angle, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size, size);
  ctx.lineTo(-size, size);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function darken(hex, amount) {
  const c = hex.replace('#', '').slice(0, 6);
  if (c.length < 6) return hex;
  const r = Math.max(0, parseInt(c.substring(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(c.substring(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(c.substring(4, 6), 16) - amount);
  return `rgb(${r},${g},${b})`;
}
