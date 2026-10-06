// validator.js — Validates 3D tunnel ring transitions and reachability.
// Ensures gap sequences never exceed the player's maximum jump distance.

import { TUNNEL, PLAYER, PHYSICS } from '../core/config.js';

/**
 * Calculate the maximum Z distance the player can clear in a single jump.
 * Always reads live from PLAYER.BASE_SPEED and PHYSICS — never cached.
 * d_max = v_run * t_air, where t_air = 2 * |JUMP_VELOCITY| / GRAVITY.
 */
export function getMaxJumpDistance() {
  const tAir = 2 * Math.abs(PHYSICS.JUMP_VELOCITY) / PHYSICS.GRAVITY;
  return PLAYER.BASE_SPEED * tAir;
}

/**
 * Maximum allowed gap span in Z units.
 * Set to 80% of d_max so the player always has comfortable margin.
 */
export function getMaxAllowedGapZ() {
  return getMaxJumpDistance() * 0.80;
}

/**
 * Maximum consecutive gap rings allowed based on current speed/physics.
 * Each ring is TUNNEL.RING_LENGTH long on Z; we floor to be safe.
 */
export function getMaxGapRings() {
  return Math.floor(getMaxAllowedGapZ() / TUNNEL.RING_LENGTH);
}

/**
 * Check reachability between two consecutive rings.
 * @param {object} prevRing - preceding ring
 * @param {object} nextRing - newly generated candidate ring
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateRingTransition(prevRing, nextRing) {
  if (!prevRing) return { valid: true };
  if (prevRing.isTransition || nextRing.isTransition) return { valid: true };

  const prevLen = prevRing.facesSolid?.length || TUNNEL.FACES;
  const nextLen = nextRing.facesSolid?.length || TUNNEL.FACES;

  if (prevLen !== nextLen) {
    // Cross-N rings are connected by a dedicated transition funnel
    return { valid: true };
  }

  const N = nextLen;
  const prevSolid = [];
  const nextSolid = [];

  for (let i = 0; i < prevLen; i++) {
    if (prevRing.facesSolid[i]) prevSolid.push(i);
  }
  for (let i = 0; i < nextLen; i++) {
    if (nextRing.facesSolid[i]) nextSolid.push(i);
  }

  // Next ring must have at least one solid face
  if (nextSolid.length === 0) {
    return { valid: false, reason: 'Next ring has zero solid faces' };
  }

  // Check that at least one solid face in prevRing has a reachable path to nextRing
  // A face is reachable if within 2 lateral face shifts (or straight ahead)
  let foundReachablePath = false;

  for (const p of prevSolid) {
    for (const n of nextSolid) {
      const diff = Math.min(
        Math.abs(p - n),
        N - Math.abs(p - n)
      );

      // Within 2 face shifts is safe and comfortable
      if (diff <= 2) {
        // Also check that the landing face isn't completely blocked by an unavoidable hazard
        const hasBlockingHazard = nextRing.hazards?.some(h => h.face === n);
        if (!hasBlockingHazard || nextSolid.length > 1) {
          foundReachablePath = true;
          break;
        }
      }
    }
    if (foundReachablePath) break;
  }

  if (!foundReachablePath) {
    return { valid: false, reason: 'No reachable solid face in next ring' };
  }

  return { valid: true };
}

/**
 * Validate that no single face has more consecutive gap rings than the player
 * can jump across. Checks against the live d_max calculation.
 *
 * @param {object[]} activeRings - The current ring list (including the new candidate at the end)
 * @param {number} lookback - How many most recent rings to inspect (default: maxGapRings + 2)
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateGapSequence(activeRings) {
  const maxGap = getMaxGapRings();
  // Only need to check the tail of the ring list (the most recent rings)
  const lookback = maxGap + 2;
  const startIdx = Math.max(0, activeRings.length - lookback);

  const tailRings = activeRings.slice(startIdx);
  if (tailRings.length < maxGap + 1) return { valid: true };

  // Get face count from the newest ring
  const newest = tailRings[tailRings.length - 1];
  if (newest.isTransition) return { valid: true };
  const N = newest.numFaces || TUNNEL.FACES;

  // For each face, count consecutive gap rings ending at the newest ring
  for (let face = 0; face < N; face++) {
    let consecutiveGaps = 0;
    for (let i = tailRings.length - 1; i >= 0; i--) {
      const ring = tailRings[i];
      if (ring.isTransition) break; // Transitions are safe, break the chain
      const ringN = ring.numFaces || TUNNEL.FACES;
      if (ringN !== N) break; // Different polygon, incomparable

      if (!ring.facesSolid[face % ringN]) {
        consecutiveGaps++;
      } else {
        break;
      }
    }

    if (consecutiveGaps > maxGap) {
      return {
        valid: false,
        reason: `Face ${face} has ${consecutiveGaps} consecutive gap rings (max ${maxGap}, d_max=${getMaxJumpDistance().toFixed(1)})`
      };
    }
  }

  return { valid: true };
}
