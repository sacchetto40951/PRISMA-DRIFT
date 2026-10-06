// collision.js — 3D Polygonal Tunnel collision detection and resolution.

import { TUNNEL, PLAYER, COLLECTIBLE } from '../core/config.js';
import { landPlayerOnFace, getFaceAtAngle } from './physics.js';

/**
 * Resolve player vs tunnel face panels.
 * Determines if player lands on a solid panel or falls through an opening.
 */
export function resolvePlayerTunnel(run, activeRings) {
  const events = [];

  // Find ring containing player Z
  const ring = activeRings.find(r => run.z >= r.zStart && run.z < r.zEnd);

  if (!ring) {
    // If no ring found under player, treat as falling
    if (run.r >= (run.currentApothem || TUNNEL.APOTHEM)) {
      run.isFallingInVoid = true;
      run.isGrounded = false;
    }
    return events;
  }

  let ringApothem = TUNNEL.APOTHEM;
  let isSolid = true;

  if (ring.isTransition) {
    const t = Math.max(0, Math.min(1, (run.z - ring.zStart) / (ring.zEnd - ring.zStart)));
    const a0 = ring.apothemStart || (TUNNEL.RADIUS * Math.cos(Math.PI / ring.numFacesStart));
    const a1 = ring.apothemEnd || (TUNNEL.RADIUS * Math.cos(Math.PI / ring.numFacesEnd));
    ringApothem = (1 - t) * a0 + t * a1;
    isSolid = true; // Transition funnel acts as a continuous solid conduit
  } else {
    const numFaces = ring.numFaces || TUNNEL.FACES;
    ringApothem = ring.apothem || (TUNNEL.RADIUS * Math.cos(Math.PI / numFaces));
    // Derive face strictly from continuous theta
    const faceIndex = getFaceAtAngle(run.theta, numFaces);
    isSolid = !!ring.facesSolid[faceIndex];
  }

  run.currentApothem = ringApothem;

  if (isSolid) {
    // If approaching or passing ground level on a solid face
    if (run.r >= ringApothem && run.vr >= 0 && !run.isFallingInVoid) {
      const wasAirborne = !run.isGrounded;
      landPlayerOnFace(run, ringApothem);
      if (wasAirborne) {
        events.push({ type: 'land' });
      }
    }
  } else {
    // Gap / opening in tunnel!
    if (run.r >= ringApothem) {
      run.isGrounded = false;
      run.isFallingInVoid = true;
    }
  }

  return events;
}

/**
 * Check player vs 3D hazards (spikes, barriers) on tunnel faces.
 */
export function checkPlayerHazards3D(run, activeRings) {
  const events = [];
  if (run.activePowerups.has('spectralPhase')) return events;

  // Check rings near player Z
  for (const ring of activeRings) {
    if (Math.abs(ring.zStart - run.z) > TUNNEL.RING_LENGTH * 1.5) continue;
    if (ring.isTransition) continue; // No hazards on transition funnels

    const numFaces = ring.numFaces || TUNNEL.FACES;
    const apothem = ring.apothem || (TUNNEL.RADIUS * Math.cos(Math.PI / numFaces));
    const playerFace = getFaceAtAngle(run.theta, numFaces);

    for (const h of ring.hazards) {
      if (!h.active) continue;

      // Must be on same face
      if (h.face === playerFace) {
        // Distance check along Z and radial clearance
        const dz = Math.abs(run.z - h.z);
        const nearRadial = run.r > apothem - 0.7; // Player is close to ground level

        if (dz < 0.65 && nearRadial) {
          events.push({ type: 'hazardHit', hazard: h });
        }
      }
    }
  }

  return events;
}

/**
 * Check player vs 3D collectibles (energy fragments).
 * Features true 3D Euclidean distance detection and smooth accelerating attraction with Fragment Magnet.
 */
export function checkPlayerCollectibles3D(run, activeRings, dt = 0.016) {
  const events = [];
  const hasMagnet = run.activePowerups.has('fragmentMagnet');
  const magnetRadius = COLLECTIBLE.MAGNET_RADIUS || 7.2;
  const TWO_PI = Math.PI * 2;

  // Player position in 3D Cartesian coordinates
  const playerElevation = 0.38;
  const playerR = run.r - playerElevation;
  const px = playerR * Math.cos(run.theta);
  const py = playerR * Math.sin(run.theta);
  const pz = run.z;

  for (const ring of activeRings) {
    if (Math.abs(ring.zStart - run.z) > TUNNEL.RING_LENGTH * 2.5) continue;

    const numFaces = ring.numFaces || TUNNEL.FACES;
    const apothem = ring.apothem || (TUNNEL.RADIUS * Math.cos(Math.PI / numFaces));
    const dPhi = TWO_PI / numFaces;
    const playerFace = getFaceAtAngle(run.theta, numFaces);

    for (const c of ring.collectibles) {
      if (!c.active) continue;

      // Ensure 3D position is initialized
      if (c.x === undefined || c.y === undefined) {
        const angle = -Math.PI / 2 + (c.face % numFaces) * dPhi;
        const floatR = apothem - 0.6;
        c.x = floatR * Math.cos(angle);
        c.y = floatR * Math.sin(angle);
      }

      // (a) True 3D Euclidean distance (detects orbs on same and neighbor faces)
      const dx = px - c.x;
      const dy = py - c.y;
      const dz = pz - c.z;
      const dist3D = Math.hypot(dx, dy, dz);

      if (hasMagnet && dist3D <= magnetRadius) {
        // (b) Frame-by-frame smooth 3D interpolation, accelerating as it gets closer
        const prox = Math.max(0, 1.0 - (dist3D / magnetRadius)); // 0 at edge -> 1 at player
        const speed = 14.0 + 32.0 * prox * prox;
        const moveDist = speed * dt;

        if (dist3D > 0.001) {
          const nx = dx / dist3D;
          const ny = dy / dist3D;
          const nz = dz / dist3D;

          // Progressive vector step + smooth lerp blend
          const blend = Math.min(1.0, (10.0 + 16.0 * prox) * dt);
          c.x += nx * moveDist + (px - c.x) * blend * 0.5;
          c.y += ny * moveDist + (py - c.y) * blend * 0.5;
          c.z += nz * moveDist + (pz - c.z) * blend * 0.5;
        }

        // Recalculate distance after movement
        const updatedDist = Math.hypot(px - c.x, py - c.y, pz - c.z);

        // (c) Trigger normal collection as soon as the orb gets close enough
        if (updatedDist < 0.85 || dist3D < 0.85) {
          c.active = false;
          events.push({ type: 'collect', item: c, value: c.value || 10 });
        }
      } else {
        // Normal collection without magnet: contact on same face or direct 3D proximity
        const isSameFace = (c.face === playerFace);
        const nearZ = Math.abs(dz) < 0.70;
        const groundedOrNear = run.r > apothem - 1.2;

        if ((isSameFace && nearZ && groundedOrNear) || dist3D < 0.75) {
          c.active = false;
          events.push({ type: 'collect', item: c, value: c.value || 10 });
        }
      }
    }
  }

  return events;
}

/**
 * Check player vs 3D power-up pickups.
 * Strictly requires the player to occupy the SAME face as the power-up item.
 */
export function checkPlayerPowerups3D(run, activeRings) {
  const events = [];

  for (const ring of activeRings) {
    if (Math.abs(ring.zStart - run.z) > TUNNEL.RING_LENGTH * 1.5) continue;

    const numFaces = ring.numFaces || TUNNEL.FACES;
    const apothem = ring.apothem || (TUNNEL.RADIUS * Math.cos(Math.PI / numFaces));
    const playerFace = getFaceAtAngle(run.theta, numFaces);

    for (const p of ring.powerupItems) {
      if (!p.active) continue;

      const isSameFace = (p.face === playerFace);
      const dz = Math.abs(run.z - p.z);

      if (isSameFace && dz < 0.65 && run.r > apothem - 1.2) {
        p.active = false;
        events.push({ type: 'powerupCollect', powerup: p });
      }
    }
  }

  return events;
}

/**
 * Check if player has fallen out of the tunnel into the void.
 */
export function checkFallDeath3D(run) {
  return run.isFallingInVoid && run.r > TUNNEL.RADIUS + 1.2;
}
