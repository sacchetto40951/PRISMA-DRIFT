// difficulty.js — Progressive difficulty curves and budget system.
// Each axis (speed, hazards, vocabulary, rest) scales independently.

import { DIFFICULTY, PLAYER } from '../core/config.js';

/**
 * Calculate the difficulty budget at a given distance.
 * Uses sqrt scaling for smooth, decelerating growth.
 * B(d) = clamp(B_base + k * sqrt(d / D_ref), B_base, B_max)
 */
export function getDifficultyBudget(distance) {
  const raw = DIFFICULTY.B_BASE + DIFFICULTY.K * Math.sqrt(distance / DIFFICULTY.D_REF);
  return Math.min(Math.max(raw, DIFFICULTY.B_BASE), DIFFICULTY.B_MAX);
}

/**
 * Get the effective run speed at a given distance.
 * Grows linearly toward a cap.
 */
export function getSpeedAtDistance(distance) {
  const bonus = Math.min(
    distance * DIFFICULTY.V_GROWTH_RATE * PLAYER.BASE_SPEED,
    PLAYER.BASE_SPEED * (DIFFICULTY.V_CAP_MULTIPLIER - 1)
  );
  return PLAYER.BASE_SPEED + bonus;
}

/**
 * Get hazard density multiplier at a given distance.
 * Starts at 0.3, grows toward 2.0.
 */
export function getHazardDensity(distance) {
  const base = 0.3;
  const max = 2.0;
  const growth = 0.15 * Math.sqrt(distance / DIFFICULTY.D_REF);
  return Math.min(base + growth, max);
}

/**
 * Get the vocabulary level (what types of segments/hazards are unlocked).
 * Higher level = more complex patterns available.
 */
export function getVocabularyLevel(distance) {
  if (distance < DIFFICULTY.UNLOCK_NARROW_GAPS) return 0;
  if (distance < DIFFICULTY.UNLOCK_ALTERNATING_GAPS) return 1;
  if (distance < DIFFICULTY.UNLOCK_SPIKES) return 2;
  if (distance < DIFFICULTY.UNLOCK_DUAL_HAZARDS) return 3;
  if (distance < DIFFICULTY.UNLOCK_COMPLEX_COMBOS) return 4;
  return 5;
}

/**
 * Get maximum consecutive hard segments before a rest segment is required.
 * Decreases with distance but never below a floor.
 */
export function getRestInterval(distance) {
  const base = DIFFICULTY.REST_INTERVAL_MAX;
  const reduction = Math.floor(distance / 8000);
  return Math.max(base - reduction, DIFFICULTY.REST_FLOOR);
}

/**
 * Should the next segment be a rest segment?
 * Returns true if segmentsSinceRest exceeds the current rest interval.
 */
export function shouldForceRest(distance, segmentsSinceRest) {
  return segmentsSinceRest >= getRestInterval(distance);
}

/**
 * Add random variation to the budget (±15%) for organic feel.
 */
export function varyBudget(budget) {
  return budget * (0.85 + Math.random() * 0.3);
}
