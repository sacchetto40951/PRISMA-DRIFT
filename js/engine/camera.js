// camera.js — 3D Camera with smooth gravity reorientation around tunnel axis.

import { CAMERA, TUNNEL } from '../core/config.js';
import { mat4, vec3 } from './math3d.js';

const TWO_PI = Math.PI * 2;

/**
 * Shortest angular difference between two angles in radians.
 */
export function angleDifference(target, current) {
  let diff = (target - current) % TWO_PI;
  if (diff > Math.PI) diff -= TWO_PI;
  if (diff < -Math.PI) diff += TWO_PI;
  return diff;
}

/**
 * Update 3D camera position, roll rotation, and screen shake.
 * Reads single shared state value: run.gravityAngle (synced with player model).
 * @param {object} run - run state
 * @param {number} dt - delta time in seconds
 */
export function updateCamera3D(run, dt) {
  // Smoothly interpolate unified gravityAngle toward targetGravityAngle (shortest arc)
  const targetAngle = run.targetGravityAngle != null ? run.targetGravityAngle : (run.targetRoll ?? -Math.PI / 2);
  const currentAngle = run.gravityAngle != null ? run.gravityAngle : (run.cameraRoll ?? -Math.PI / 2);

  const angleDiff = angleDifference(targetAngle, currentAngle);
  run.gravityAngle = currentAngle + angleDiff * CAMERA.ROLL_LERP;
  run.cameraRoll = run.gravityAngle;

  // Screen shake decay
  if (run.shakeMagnitude > 0.01) {
    run.shakeX = (Math.random() - 0.5) * 2 * run.shakeMagnitude;
    run.shakeY = (Math.random() - 0.5) * 2 * run.shakeMagnitude;
    run.shakeMagnitude *= Math.exp(-CAMERA.SHAKE_DECAY * dt);
  } else {
    run.shakeX = 0;
    run.shakeY = 0;
    run.shakeMagnitude = 0;
  }
}

/**
 * Trigger a screen shake impulse.
 */
export function triggerShake(run, magnitude) {
  run.shakeMagnitude = Math.min(magnitude, CAMERA.SHAKE_MAX);
}

/**
 * Build 3D View and Projection matrices.
 * @param {object} run - run state
 * @param {number} aspect - canvas aspect ratio (width / height)
 * @returns {{ view: Float32Array, proj: Float32Array, viewProj: Float32Array, eye: Float32Array }}
 */
export function getCameraMatrices(run, aspect) {
  const proj = mat4.create();
  mat4.perspective(proj, (CAMERA.FOV * Math.PI) / 180, aspect, CAMERA.NEAR, CAMERA.FAR);

  const view = mat4.create();
  // Shared gravity angle between camera roll and player model
  const roll = run.gravityAngle != null ? run.gravityAngle : run.cameraRoll;

  // Unit vector pointing from tunnel axis toward the active floor
  const floorDirX = Math.cos(roll);
  const floorDirY = Math.sin(roll);

  // Up vector in world space (pointing from floor toward tunnel center)
  // This keeps the active floor locked horizontally at the bottom of the screen
  const up = vec3.create(-floorDirX, -floorDirY, 0);

  // Position camera eye behind and slightly elevated above the active floor (Run 3 perspective)
  const apothem = run.currentApothem || TUNNEL.APOTHEM;
  const camElevation = apothem - CAMERA.DISTANCE_R;
  const eye = vec3.create(
    floorDirX * camElevation + run.shakeX,
    floorDirY * camElevation + run.shakeY,
    run.z - CAMERA.DISTANCE_Z
  );

  // Look-at center: aimed down the tunnel track ahead
  const targetElevation = apothem - 0.45;
  const center = vec3.create(
    floorDirX * targetElevation,
    floorDirY * targetElevation,
    run.z + CAMERA.LOOK_AHEAD_Z
  );

  mat4.lookAt(view, eye, center, up);

  const viewProj = mat4.create();
  mat4.multiply(viewProj, proj, view);

  return { view, proj, viewProj, eye };
}
