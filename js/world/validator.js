// validator.js — Validates 3D tunnel ring transitions and reachability.
// Uses arc-distance (physical units) instead of face-index counts,
// ensuring correctness across variable face-count N.

import { TUNNEL, PLAYER, PHYSICS } from '../core/config.js';

const TWO_PI = Math.PI * 2;

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
 * Calculate the maximum lateral arc-distance (in physical units) the player
 * can traverse during one ring transition (the time it takes to cross one ring).
 * lateral_max = LATERAL_SPEED * (RING_LENGTH / v_run)
 * Measured in radians of tunnel circumference.
 */
export function getMaxLateralAngle() {
  const ringTime = TUNNEL.RING_LENGTH / PLAYER.BASE_SPEED;
  return PHYSICS.LATERAL_SPEED * ringTime;
}

/**
 * Compute the shortest angular distance between two face centers,
 * properly wrapping around the circle.
 * @param {number} faceA - face index in polygon A
 * @param {number} faceB - face index in polygon B
 * @param {number} nA - face count of polygon A
 * @param {number} nB - face count of polygon B
 * @returns {number} shortest angular distance in radians
 */
function angularDistanceBetweenFaces(faceA, faceB, nA, nB) {
  const angleA = -Math.PI / 2 + faceA * (TWO_PI / nA);
  const angleB = -Math.PI / 2 + faceB * (TWO_PI / nB);
  let diff = Math.abs(angleA - angleB) % TWO_PI;
  if (diff > Math.PI) diff = TWO_PI - diff;
  return diff;
}

/**
 * Check reachability between two consecutive rings using arc-distance (radians).
 * This works correctly regardless of face count N on either ring.
 * @param {object} prevRing - preceding ring
 * @param {object} nextRing - newly generated candidate ring
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateRingTransition(prevRing, nextRing) {
  if (!prevRing) return { valid: true };
  if (prevRing.isTransition || nextRing.isTransition) return { valid: true };

  const prevN = prevRing.facesSolid?.length || prevRing.numFaces || TUNNEL.FACES;
  const nextN = nextRing.facesSolid?.length || nextRing.numFaces || TUNNEL.FACES;

  const prevSolid = [];
  const nextSolid = [];

  for (let i = 0; i < prevN; i++) {
    if (prevRing.facesSolid[i]) prevSolid.push(i);
  }
  for (let i = 0; i < nextN; i++) {
    if (nextRing.facesSolid[i]) nextSolid.push(i);
  }

  // Next ring must have at least one solid face
  if (nextSolid.length === 0) {
    return { valid: false, reason: 'Next ring has zero solid faces' };
  }

  // Maximum angular distance the player can traverse laterally in one ring transition
  const maxAngle = getMaxLateralAngle() * 1.5; // 1.5x margin for comfort

  // Check that at least one solid face in prevRing has a reachable path to nextRing
  let foundReachablePath = false;

  for (const p of prevSolid) {
    for (const n of nextSolid) {
      const angDist = angularDistanceBetweenFaces(p, n, prevN, nextN);

      // Reachable if angular distance is within lateral movement budget
      if (angDist <= maxAngle) {
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
    return { valid: false, reason: `No reachable solid face in next ring (prevN=${prevN}, nextN=${nextN}, maxAngle=${maxAngle.toFixed(3)}rad)` };
  }

  return { valid: true };
}

/**
 * Validate that no single face has more consecutive gap rings than the player
 * can jump across. Checks against the live d_max calculation.
 *
 * @param {object[]} activeRings - The current ring list (including the new candidate at the end)
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
