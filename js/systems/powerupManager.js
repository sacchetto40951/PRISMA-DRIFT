// powerupManager.js — Extensible power-up registry and lifecycle management.
// Adding a new power-up only requires adding to POWERUP_REGISTRY.

import { POWERUP } from '../core/config.js';
import { getBiome } from '../world/biomes.js';

/**
 * Power-up Registry — each entry defines a complete power-up.
 * The manager iterates this generically; no switch/case needed per power-up.
 */
export const POWERUP_REGISTRY = {
  prismaShield: {
    id: 'prismaShield',
    name: 'Escudo Prisma',
    duration: 0, // Usage-based, not time-based
    usageBased: true,
    maxUses: 1,
    color: '#00ccff',
    glowColor: '#00ccff44',
    icon: '◆',
    onActivate(run) {
      // Shield absorbs one hit
    },
    onTick(run, dt) {},
    onDeactivate(run) {},
    onHit(run) {
      // Called when player takes damage with shield
      return true; // Absorbed the hit
    },
  },

  doubleJump: {
    id: 'doubleJump',
    name: 'Salto Duplo',
    duration: 12,
    color: '#ffcc00',
    glowColor: '#ffcc0044',
    icon: '⇑',
    onActivate(run) {
      run._usedDoubleJump = false;
    },
    onTick(run, dt) {},
    onDeactivate(run) {
      run._usedDoubleJump = false;
    },
  },

  fragmentMagnet: {
    id: 'fragmentMagnet',
    name: 'Ímã de Fragmentos',
    duration: 8,
    color: '#88ffcc',
    glowColor: '#88ffcc44',
    icon: '⊕',
    onActivate(run) {},
    onTick(run, dt) {},
    onDeactivate(run) {},
  },

  velocitySurge: {
    id: 'velocitySurge',
    name: 'Sobrecarga de Velocidade',
    duration: 5,
    color: '#ff6600',
    glowColor: '#ff660044',
    icon: '»',
    onActivate(run) {
      // Speed boost handled in physics.js
    },
    onTick(run, dt) {},
    onDeactivate(run) {},
  },

  gravityField: {
    id: 'gravityField',
    name: 'Campo de Gravidade Leve',
    duration: 6,
    color: '#aa66ff',
    glowColor: '#aa66ff44',
    icon: '○',
    onActivate(run) {
      run.gravityMultiplier *= 0.5;
    },
    onTick(run, dt) {},
    onDeactivate(run) {
      run.gravityMultiplier /= 0.5;
    },
  },

  spectralPhase: {
    id: 'spectralPhase',
    name: 'Fase Espectral',
    duration: 4,
    color: '#00ffaa',
    glowColor: '#00ffaa66',
    icon: '◇',
    onActivate(run) {},
    onTick(run, dt) {},
    onDeactivate(run) {},
  },

  dimensionalDash: {
    id: 'dimensionalDash',
    name: 'Micro-Salto Dimensional',
    duration: 0,
    usageBased: true,
    instant: true,
    maxUses: 1,
    color: '#ff44ff',
    glowColor: '#ff44ff44',
    icon: '↯',
    onActivate(run) {
      // Instant dash forward
      run.playerX += 120;
      run.playerVY = Math.min(run.playerVY, -100); // Slight upward boost
    },
    onTick(run, dt) {},
    onDeactivate(run) {},
  },

  recoveryCore: {
    id: 'recoveryCore',
    name: 'Núcleo de Recuperação',
    duration: 0,
    usageBased: true,
    maxUses: 1,
    persistent: true, // Stays until used
    color: '#ff8844',
    glowColor: '#ff884444',
    icon: '♥',
    onActivate(run) {
      run.hasRecoveryCore = true;
    },
    onTick(run, dt) {},
    onDeactivate(run) {
      run.hasRecoveryCore = false;
    },
  },

  scoreMultiplier: {
    id: 'scoreMultiplier',
    name: 'Multiplicador de Pontuação',
    duration: 10,
    color: '#ffdd44',
    glowColor: '#ffdd4444',
    icon: '×2',
    onActivate(run) {
      run.scoreMultiplier *= 2;
    },
    onTick(run, dt) {},
    onDeactivate(run) {
      run.scoreMultiplier = Math.max(1, run.scoreMultiplier / 2);
    },
  },
};

/**
 * Activate a power-up on the run.
 */
export function activatePowerup(run, powerupId) {
  const def = POWERUP_REGISTRY[powerupId];
  if (!def) return;

  // If already active and not stackable, refresh duration
  if (run.activePowerups.has(powerupId)) {
    const active = run.activePowerups.get(powerupId);
    if (def.duration > 0) {
      active.timeLeft = def.duration;
    }
    return;
  }

  // Activate
  const data = {
    timeLeft: def.duration || Infinity,
    usesLeft: def.maxUses || 0,
    warned: false,
  };

  run.activePowerups.set(powerupId, data);
  def.onActivate(run);
  run.powerupsUsed++;

  // Instant power-ups deactivate immediately after activation
  if (def.instant) {
    run.activePowerups.delete(powerupId);
  }

  return { type: 'powerupActivated', powerupId, def };
}

/**
 * Update all active power-ups (tick + expiration).
 */
export function updatePowerups(run, dt) {
  const events = [];

  for (const [id, data] of run.activePowerups) {
    const def = POWERUP_REGISTRY[id];
    if (!def) continue;

    // Tick
    def.onTick(run, dt);

    // Usage-based power-ups persist until consumed
    if (def.usageBased && def.persistent) continue;

    // Time-based power-ups count down
    if (def.duration > 0) {
      data.timeLeft -= dt;

      // Warning at 2 seconds remaining
      if (data.timeLeft <= POWERUP.WARNING_TIME && !data.warned) {
        data.warned = true;
        events.push({ type: 'powerupWarning', powerupId: id });
      }

      // Expired
      if (data.timeLeft <= 0) {
        def.onDeactivate(run);
        run.activePowerups.delete(id);
        events.push({ type: 'powerupExpired', powerupId: id });
      }
    }
  }

  return events;
}

/**
 * Try to absorb a hit using active power-ups.
 * Returns true if the hit was absorbed.
 */
export function tryAbsorbHit(run) {
  // Check Prisma Shield first
  if (run.activePowerups.has('prismaShield')) {
    const def = POWERUP_REGISTRY.prismaShield;
    def.onDeactivate(run);
    run.activePowerups.delete('prismaShield');
    return { absorbed: true, type: 'shieldBreak' };
  }

  // Check Spectral Phase (invincibility)
  if (run.activePowerups.has('spectralPhase')) {
    return { absorbed: true, type: 'spectralPhase' };
  }

  return { absorbed: false };
}

/**
 * Try to use Recovery Core (on death).
 * Returns true if recovery succeeded.
 */
export function tryRecovery(run) {
  if (run.activePowerups.has('recoveryCore')) {
    const def = POWERUP_REGISTRY.recoveryCore;
    def.onDeactivate(run);
    run.activePowerups.delete('recoveryCore');
    return true;
  }
  return false;
}

/**
 * Pick a random power-up ID based on biome weights.
 */
export function pickPowerupForBiome(biomeId) {
  const biome = getBiome(biomeId);
  const weights = biome.powerupWeights || {};

  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0);

  if (totalWeight <= 0) return 'prismaShield'; // fallback

  let roll = Math.random() * totalWeight;
  for (const [id, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return id;
  }

  return entries[entries.length - 1][0];
}

/**
 * Get display info for an active power-up (for HUD).
 */
export function getActivePowerupInfo(run) {
  const result = [];
  for (const [id, data] of run.activePowerups) {
    const def = POWERUP_REGISTRY[id];
    if (!def) continue;
    result.push({
      id,
      name: def.name,
      icon: def.icon,
      color: def.color,
      timeLeft: data.timeLeft,
      duration: def.duration,
      warned: data.warned,
      usageBased: def.usageBased || false,
    });
  }
  return result;
}

/**
 * Clear all active power-ups (on run reset).
 */
export function clearAllPowerups(run) {
  for (const [id] of run.activePowerups) {
    const def = POWERUP_REGISTRY[id];
    if (def) def.onDeactivate(run);
  }
  run.activePowerups.clear();
  run.scoreMultiplier = 1;
  run.gravityMultiplier = 1.0;
  run.hasRecoveryCore = false;
}
