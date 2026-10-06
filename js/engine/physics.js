// physics.js — 3D Polygonal Tunnel Physics & Movement Integration.

import { PHYSICS, PLAYER, TUNNEL, DIFFICULTY } from '../core/config.js';
import { isActionActive, wasActionJustPressed } from './input.js';

const TWO_PI = Math.PI * 2;

/**
 * Given continuous angle theta around the tunnel circumference,
 * derive the face index [0..numFaces-1] for a regular polygon of numFaces.
 * Face 0 is centered at -PI/2 (bottom floor).
 */
export function getFaceAtAngle(theta, numFaces) {
  const faceAngle = TWO_PI / numFaces;
  const deltaFromBase = ((theta - (-Math.PI / 2)) % TWO_PI + TWO_PI) % TWO_PI;
  return Math.floor((deltaFromBase + faceAngle / 2) / faceAngle) % numFaces;
}

/**
 * Return the center angle of a face index [0..numFaces-1].
 */
export function getFaceAngle(faceIndex, numFaces) {
  const faceAngle = TWO_PI / numFaces;
  return -Math.PI / 2 + faceIndex * faceAngle;
}

/**
 * Update 3D player physics within the polygonal tunnel.
 * @param {object} run - current run state
 * @param {number} dt - delta time in seconds
 */
export function updatePlayerPhysics(run, dt) {
  if (run.isDead) return;

  // 1. Forward auto-run (Z axis)
  const baseSpeed = PLAYER.BASE_SPEED;
  const speedCap = baseSpeed * PLAYER.SPEED_CAP_MULTIPLIER;
  const distanceBonus = Math.min(
    run.distance * DIFFICULTY.V_GROWTH_RATE * baseSpeed,
    speedCap - baseSpeed
  );
  let effectiveSpeed = (baseSpeed + distanceBonus) * run.speedMultiplier;

  // Velocity Surge power-up bonus
  if (run.activePowerups.has('velocitySurge')) {
    effectiveSpeed *= 1.3;
  }

  run.vz = effectiveSpeed;
  run.z += run.vz * dt;
  run.distance = run.z;

  // 2. Lateral circumferential movement (Theta axis) — continuous angle is SOURCE OF TRUTH
  let targetVTheta = 0;
  if (isActionActive('MOVE_RIGHT')) {
    targetVTheta = -PHYSICS.LATERAL_SPEED;
  } else if (isActionActive('MOVE_LEFT')) {
    targetVTheta = PHYSICS.LATERAL_SPEED;
  }

  // Smooth lateral acceleration/friction
  if (targetVTheta !== 0) {
    if (run.vTheta < targetVTheta) {
      run.vTheta = Math.min(run.vTheta + PHYSICS.LATERAL_ACCEL * dt, targetVTheta);
    } else if (run.vTheta > targetVTheta) {
      run.vTheta = Math.max(run.vTheta - PHYSICS.LATERAL_ACCEL * dt, targetVTheta);
    }
  } else {
    // Decelerate
    if (run.vTheta > 0) {
      run.vTheta = Math.max(0, run.vTheta - PHYSICS.LATERAL_FRICTION * dt);
    } else if (run.vTheta < 0) {
      run.vTheta = Math.min(0, run.vTheta + PHYSICS.LATERAL_FRICTION * dt);
    }
  }

  run.theta += run.vTheta * dt;
  // Normalize theta into [0, TWO_PI)
  run.theta = ((run.theta % TWO_PI) + TWO_PI) % TWO_PI;

  // 3. Determine current ring, face count N, and active floor apothem
  const currentRing = run.activeRings?.find(r => run.z >= r.zStart && run.z < r.zEnd) || run.activeRings?.[0];
  let numFaces = TUNNEL.FACES;
  let activeApothem = TUNNEL.APOTHEM;

  if (currentRing) {
    if (currentRing.isTransition) {
      const t = Math.max(0, Math.min(1, (run.z - currentRing.zStart) / (currentRing.zEnd - currentRing.zStart)));
      numFaces = t < 0.5 ? currentRing.numFacesStart : currentRing.numFacesEnd;
      const a0 = currentRing.apothemStart || (TUNNEL.RADIUS * Math.cos(Math.PI / currentRing.numFacesStart));
      const a1 = currentRing.apothemEnd || (TUNNEL.RADIUS * Math.cos(Math.PI / currentRing.numFacesEnd));
      activeApothem = (1 - t) * a0 + t * a1;
    } else {
      numFaces = currentRing.numFaces || TUNNEL.FACES;
      activeApothem = currentRing.apothem || (TUNNEL.RADIUS * Math.cos(Math.PI / numFaces));
    }
  }

  run.currentN = numFaces;
  run.currentApothem = activeApothem;

  // Face index is DERIVED from continuous theta + N (not stored as primary truth)
  run.currentFace = getFaceAtAngle(run.theta, numFaces);

  // Target gravity angle: aligns radial gravity and camera roll with the center of the active face
  run.targetGravityAngle = getFaceAngle(run.currentFace, numFaces);
  run.targetRoll = run.targetGravityAngle;

  // 4. Radial movement (Jump & Gravity)
  if (!run.isGrounded && !run.isFallingInVoid) {
    run.coyoteTimer = Math.max(0, run.coyoteTimer - dt);
  }

  if (run.jumpBufferTimer > 0) {
    run.jumpBufferTimer = Math.max(0, run.jumpBufferTimer - dt);
  }

  if (wasActionJustPressed('JUMP')) {
    run.jumpBufferTimer = PHYSICS.JUMP_BUFFER;
  }

  const canJump = (run.isGrounded || run.coyoteTimer > 0) && !run.isFallingInVoid;
  const hasDoubleJump = run.activePowerups.has('doubleJump');
  const canDoubleJump = hasDoubleJump && run.isJumping && !run._usedDoubleJump && !run.isFallingInVoid;

  // Execute Jump
  if (run.jumpBufferTimer > 0 && (canJump || canDoubleJump)) {
    let jumpVel = PHYSICS.JUMP_VELOCITY;
    if (run.gravityMultiplier < 1.0) {
      jumpVel *= Math.sqrt(run.gravityMultiplier);
    }

    run.vr = jumpVel;
    run.isGrounded = false;
    run.isJumping = true;
    run.jumpHeld = true;
    run.jumpBufferTimer = 0;
    run.coyoteTimer = 0;

    if (!canJump && canDoubleJump) {
      run._usedDoubleJump = true;
    }

    run._jumpEvent = canDoubleJump && run._usedDoubleJump ? 'doubleJump' : 'jump';
  }

  // Variable jump height cut
  if (run.isJumping && !isActionActive('JUMP') && run.vr < 0) {
    run.vr *= PHYSICS.JUMP_CUT_MULTIPLIER;
    run.isJumping = false;
    run.jumpHeld = false;
  }

  // Apply radial gravity (pulls outward toward tunnel wall)
  const gravity = PHYSICS.GRAVITY * run.gravityMultiplier;
  run.vr += gravity * dt;
  run.vr = Math.min(run.vr, PHYSICS.MAX_RADIAL_SPEED);

  // Integrate radial position
  run.r += run.vr * dt;
}

/**
 * Land the player safely onto a solid face panel.
 * @param {object} run
 * @param {number} [apothem]
 */
export function landPlayerOnFace(run, apothem = null) {
  run.r = apothem != null ? apothem : (run.currentApothem || TUNNEL.APOTHEM);
  run.vr = 0;
  run.isGrounded = true;
  run.isJumping = false;
  run.isFallingInVoid = false;
  run.coyoteTimer = PHYSICS.COYOTE_TIME;
  run._usedDoubleJump = false;
  run._landEvent = true;
}
