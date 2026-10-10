// levelGenerator.js — Procedural 3D Tunnel Ring Generation with Validation.

import { TUNNEL, DIFFICULTY } from '../core/config.js';
import { getDifficultyBudget, getVocabularyLevel, shouldForceRest, varyBudget } from './difficulty.js';
import { RING_TEMPLATES, getAvailableTemplates } from './segments.js';
import { validateRingTransition, validateGapSequence } from './validator.js';
import { getBiome, pickRandomBiome } from './biomes.js';
import { pickPowerupForBiome } from '../systems/powerupManager.js';
import { getFaceAtAngle } from '../engine/physics.js';

let ringCounter = 0;

/**
 * Initialize level generator for a new run.
 */
export function initLevelGenerator(run) {
  run.activeRings = [];
  run.nextRingZ = 0;
  run.ringsSinceRest = 0;
  run.currentBiome = 'aurora';
  run.biomeDistance = 0;
  run.biomeTransition = 0;
  ringCounter = 0;

  const startFaces = getBiome('aurora').faces || TUNNEL.FACES;

  // Initial runway: 8 completely solid rings for smooth start
  for (let i = 0; i < 8; i++) {
    const ring = createRing(run, RING_TEMPLATES.all_solid, true, null, startFaces);
    run.activeRings.push(ring);
  }

  // Generate ahead up to full view distance
  while (run.nextRingZ < run.z + TUNNEL.SPAWN_AHEAD_RINGS * TUNNEL.RING_LENGTH) {
    generateNextRing(run);
  }
}

/**
 * Update generator: spawn new rings ahead and recycle old ones behind.
 */
export function updateLevelGenerator(run) {
  // Spawn ahead
  while (run.nextRingZ < run.z + TUNNEL.SPAWN_AHEAD_RINGS * TUNNEL.RING_LENGTH) {
    generateNextRing(run);
  }

  // Cull old rings behind player
  const despawnZ = run.z - TUNNEL.DESPAWN_BEHIND_RINGS * TUNNEL.RING_LENGTH;
  run.activeRings = run.activeRings.filter(r => r.zEnd > despawnZ);

  // Check biome progression
  updateBiome(run);
}

/**
 * Helper to pick a template according to biome-specific pattern weights.
 */
function pickTemplateForBiome(available, biomeDef) {
  if (!available || available.length === 0) return RING_TEMPLATES.all_solid;
  if (!biomeDef || !biomeDef.patternWeights) {
    return available[Math.floor(Math.random() * available.length)];
  }

  const weights = available.map(t => {
    const w = biomeDef.patternWeights[t.id];
    return w !== undefined ? w : 1.0;
  });

  const total = weights.reduce((acc, val) => acc + val, 0);
  if (total <= 0) return available[Math.floor(Math.random() * available.length)];

  let roll = Math.random() * total;
  for (let i = 0; i < available.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return available[i];
  }

  return available[available.length - 1];
}

/**
 * Generate a single validated ring (or transition funnels if biome face count changed).
 */
function generateNextRing(run) {
  const biomeDef = getBiome(run.currentBiome);
  const targetFaces = biomeDef.faces || TUNNEL.FACES;

  const prevRing = run.activeRings[run.activeRings.length - 1];
  const prevFaces = prevRing ? (prevRing.numFacesEnd || prevRing.numFaces || TUNNEL.FACES) : targetFaces;

  // If faces changed between previous ring and target biome, insert 2-3 triangulated transition funnels
  if (prevRing && prevFaces !== targetFaces) {
    const numSteps = TUNNEL.TRANSITION_RING_COUNT || 3;
    for (let step = 0; step < numSteps; step++) {
      const t0 = step / numSteps;
      const t1 = (step + 1) / numSteps;
      const nStart = Math.round(prevFaces + (targetFaces - prevFaces) * t0);
      const nEnd = Math.round(prevFaces + (targetFaces - prevFaces) * t1);
      const transitionRing = createTransitionRing(run, nStart, nEnd, prevFaces, targetFaces, t0, t1);
      run.activeRings.push(transitionRing);
    }
  }

  const budget = varyBudget(getDifficultyBudget(run.distance));
  const rawVocab = getVocabularyLevel(run.distance);
  // Cap vocabulary if the biome specifies maxVocab
  const vocabLevel = biomeDef.maxVocab !== undefined ? Math.min(rawVocab, biomeDef.maxVocab) : rawVocab;
  const forceRest = shouldForceRest(run.distance, run.ringsSinceRest);

  let template = null;
  let candidateData = null;
  const currentFace = getFaceAtAngle(run.theta, targetFaces);

  for (let attempt = 0; attempt < 8; attempt++) {
    if (forceRest) {
      template = RING_TEMPLATES.rest_ring;
    } else {
      const available = getAvailableTemplates(vocabLevel, budget);
      template = pickTemplateForBiome(available, biomeDef);
    }

    const params = {
      ringIndex: ringCounter,
      face: currentFace,
      numFaces: targetFaces,
    };

    candidateData = template.generate(params);

    // Validate transition with previous ring
    const lastActive = run.activeRings[run.activeRings.length - 1];
    const validation = validateRingTransition(lastActive, candidateData);

    if (!validation.valid) {
      candidateData = null;
      continue;
    }

    // Validate gap sequence: tentatively add this ring and check that
    // no face has more consecutive gaps than the player can jump over.
    const tentativeRing = {
      numFaces: targetFaces,
      facesSolid: candidateData.facesSolid,
      isTransition: false,
    };
    const tentativeList = [...run.activeRings, tentativeRing];
    const gapCheck = validateGapSequence(tentativeList);

    if (gapCheck.valid) {
      break;
    } else {
      candidateData = null; // Rejected — gap chain too long
    }
  }

  // Fallback if all attempts failed: safe rest ring
  if (!candidateData) {
    template = RING_TEMPLATES.rest_ring;
    candidateData = template.generate({ ringIndex: ringCounter, face: currentFace, numFaces: targetFaces });
  }

  const ring = createRing(run, template, false, candidateData, targetFaces);
  run.activeRings.push(ring);

  if (template.isRest) {
    run.ringsSinceRest = 0;
  } else {
    run.ringsSinceRest++;
  }
}

/**
 * Create a transition ring funnel connecting two polygonal cross-sections with different N.
 */
function createTransitionRing(run, nStart, nEnd, overallNStart = nStart, overallNEnd = nEnd, t0 = 0, t1 = 1) {
  const zStart = run.nextRingZ;
  const zEnd = zStart + TUNNEL.RING_LENGTH;
  run.nextRingZ = zEnd;
  ringCounter++;

  const aTotalStart = TUNNEL.RADIUS * Math.cos(Math.PI / overallNStart);
  const aTotalEnd = TUNNEL.RADIUS * Math.cos(Math.PI / overallNEnd);
  const aStart = (1 - t0) * aTotalStart + t0 * aTotalEnd;
  const aEnd = (1 - t1) * aTotalStart + t1 * aTotalEnd;

  return {
    id: `ring_trans_${ringCounter}`,
    index: ringCounter,
    zStart,
    zEnd,
    biome: run.currentBiome,
    isTransition: true,
    numFacesStart: nStart,
    numFacesEnd: nEnd,
    numFaces: nEnd,
    apothemStart: aStart,
    apothemEnd: aEnd,
    apothem: (aStart + aEnd) / 2,
    facesSolid: new Array(Math.max(nStart, nEnd)).fill(true),
    hazards: [],
    collectibles: [
      { face: 0, offsetZ: 0.5 }
    ],
    powerupItems: [],
  };
}

/**
 * Build a complete ring object with world Z coordinates and dynamic face count.
 */
function createRing(run, template, isInitial = false, customData = null, numFaces = TUNNEL.FACES) {
  const zStart = run.nextRingZ;
  const zEnd = zStart + TUNNEL.RING_LENGTH;
  run.nextRingZ = zEnd;
  ringCounter++;

  const currentFace = getFaceAtAngle(run.theta, numFaces);
  const data = customData || template.generate({ ringIndex: ringCounter, face: currentFace, numFaces });
  const apothem = TUNNEL.RADIUS * Math.cos(Math.PI / numFaces);

  const ring = {
    id: `ring_${ringCounter}`,
    index: ringCounter,
    zStart,
    zEnd,
    biome: run.currentBiome,
    isTransition: false,
    numFaces,
    numFacesStart: numFaces,
    numFacesEnd: numFaces,
    apothem,
    facesSolid: data.facesSolid,
    hazards: [],
    collectibles: [],
    powerupItems: [],
  };

  // Build hazards
  for (const h of (data.hazards || [])) {
    ring.hazards.push({
      type: h.type || 'spike',
      face: h.face % numFaces,
      z: zStart + (h.offsetZ || 0.5) * TUNNEL.RING_LENGTH,
      active: true,
    });
  }

  // Build collectibles
  const colApothem = ring.apothem || (TUNNEL.RADIUS * Math.cos(Math.PI / numFaces));
  const colFloatR = colApothem - 0.6;
  const colPhi = (Math.PI * 2) / numFaces;
  for (const c of (data.collectibles || [])) {
    const colAngle = -Math.PI / 2 + (c.face % numFaces) * colPhi;
    ring.collectibles.push({
      face: c.face % numFaces,
      x: colFloatR * Math.cos(colAngle),
      y: colFloatR * Math.sin(colAngle),
      z: zStart + (c.offsetZ || 0.5) * TUNNEL.RING_LENGTH,
      value: 10,
      active: true,
    });
  }

  // Build powerup items
  for (const p of (data.powerupSpawns || [])) {
    if (Math.random() < p.chance) {
      ring.powerupItems.push({
        face: p.face % numFaces,
        z: zStart + (p.offsetZ || 0.5) * TUNNEL.RING_LENGTH,
        powerupId: pickPowerupForBiome(run.currentBiome),
        active: true,
      });
    }
  }

  return ring;
}

/**
 * Check and apply biome changes based on distance traveled.
 */
function updateBiome(run) {
  if (run.distance < 120) {
    run.currentBiome = 'aurora';
    return;
  }

  // Transition biome every ~300 Z units
  const distSinceLast = run.distance - (run._lastBiomeDist || 0);
  if (distSinceLast > 320) {
    const nextBiome = pickRandomBiome(run.distance, run.currentBiome);
    if (nextBiome !== run.currentBiome) {
      run._previousBiome = run.currentBiome;
      run.currentBiome = nextBiome;
      run.biomeTransition = 1.0;
      run._lastBiomeDist = run.distance;
      run._biomeEvent = 'transition';
    }
  }
}
