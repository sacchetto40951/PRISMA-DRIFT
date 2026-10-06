// scoreSystem.js — Scoring, distance tracking, and fragment collection for 3D tunnel.

import { SCORING, PLAYER } from '../core/config.js';

/**
 * Update score based on distance traveled this frame.
 */
export function updateScore(run, dt) {
  const speed = run.vz || PLAYER.BASE_SPEED;
  const distThisFrame = speed * dt;

  // Base distance score
  let points = distThisFrame * SCORING.DISTANCE_MULTIPLIER;

  // Speed bonus
  const speedRatio = speed / PLAYER.BASE_SPEED;
  if (speedRatio > SCORING.SPEED_BONUS_THRESHOLD) {
    points *= SCORING.SPEED_BONUS_MULTIPLIER;
  }

  // Apply score multiplier (from power-ups)
  points *= run.scoreMultiplier;

  run.score += points;
}

/**
 * Add fragment collection to score and total.
 */
export function collectFragment(run, value = 10) {
  const points = value * run.scoreMultiplier;
  run.score += points;
  run.fragmentsCollected++;
  return points;
}

/**
 * Format score for display.
 */
export function formatScore(score) {
  return Math.floor(score).toLocaleString();
}

/**
 * Format distance for display in meters.
 */
export function formatDistance(distance) {
  return Math.floor(distance).toLocaleString() + 'm';
}
