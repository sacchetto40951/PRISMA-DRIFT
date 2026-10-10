// segments.js — Ring templates for 3D Polygonal Tunnel procedural generation.
// Includes named hole/obstacle patterns parametrized by face count N.

import { TUNNEL } from '../core/config.js';

// Helper to build a boolean solid mask for N faces.
function makeMask(solidFaces, numFaces = TUNNEL.FACES) {
  const mask = new Array(numFaces).fill(false);
  for (const f of solidFaces) {
    mask[((f % numFaces) + numFaces) % numFaces] = true;
  }
  return mask;
}

export const RING_TEMPLATES = {
  // === VOCABULARY LEVEL 0: Basic Solid & Small Gaps ===

  all_solid: {
    id: 'all_solid',
    cost: 1.0,
    minVocab: 0,
    isRest: true,
    generate(params) {
      const N = params.numFaces || TUNNEL.FACES;
      const baseFace = params.face || 0;
      return {
        facesSolid: new Array(N).fill(true),
        hazards: [],
        collectibles: [
          { face: baseFace % N, offsetZ: 0.5 },
          { face: (baseFace + 1) % N, offsetZ: 0.5 },
        ],
        powerupSpawns: [{ face: baseFace % N, offsetZ: 0.5, chance: 0.15 }],
      };
    },
  },

  single_gap: {
    id: 'single_gap',
    cost: 1.8,
    minVocab: 0,
    isRest: false,
    generate(params) {
      const N = params.numFaces || TUNNEL.FACES;
      const gapFace = Math.floor(Math.random() * N);
      const mask = new Array(N).fill(true);
      mask[gapFace] = false;
      return {
        facesSolid: mask,
        hazards: [],
        collectibles: [{ face: (gapFace + Math.floor(N / 2)) % N, offsetZ: 0.5 }],
        powerupSpawns: [],
      };
    },
  },

  single_spike: {
    id: 'single_spike',
    cost: 2.2,
    minVocab: 0,
    isRest: false,
    generate(params) {
      const N = params.numFaces || TUNNEL.FACES;
      const spikeFace = Math.floor(Math.random() * N);
      return {
        facesSolid: new Array(N).fill(true),
        hazards: [{ face: spikeFace, type: 'spike', offsetZ: 0.5 }],
        collectibles: [{ face: (spikeFace + Math.floor(N / 2)) % N, offsetZ: 0.5 }],
        powerupSpawns: [],
      };
    },
  },

  // === VOCABULARY LEVEL 1: Dual Gaps & Spikes ===

  dual_gaps: {
    id: 'dual_gaps',
    cost: 2.8,
    minVocab: 1,
    isRest: false,
    generate(params) {
      const N = params.numFaces || TUNNEL.FACES;
      const gap1 = Math.floor(Math.random() * N);
      const gap2 = (gap1 + Math.max(1, Math.floor(N / 2))) % N;
      const mask = new Array(N).fill(true);
      mask[gap1] = false;
      mask[gap2] = false;
      return {
        facesSolid: mask,
        hazards: [],
        collectibles: [{ face: (gap1 + 1) % N, offsetZ: 0.5 }],
        powerupSpawns: [{ face: (gap2 + 1) % N, offsetZ: 0.5, chance: 0.2 }],
      };
    },
  },

  narrow_bridge: {
    id: 'narrow_bridge',
    cost: 3.5,
    minVocab: 1,
    isRest: false,
    generate(params) {
      const N = params.numFaces || TUNNEL.FACES;
      const centerFace = Math.floor(Math.random() * N);
      const f1 = (centerFace - 1 + N) % N;
      const f2 = centerFace;
      const f3 = (centerFace + 1) % N;
      return {
        facesSolid: makeMask([f1, f2, f3], N),
        hazards: [],
        collectibles: [{ face: f2, offsetZ: 0.5 }],
        powerupSpawns: [{ face: f2, offsetZ: 0.5, chance: 0.25 }],
      };
    },
  },

  // === VOCABULARY LEVEL 2: Alternating Checkerboard ===

  alternating_checker: {
    id: 'alternating_checker',
    cost: 4.2,
    minVocab: 2,
    isRest: false,
    generate(params) {
      const N = params.numFaces || TUNNEL.FACES;
      const shift = params.ringIndex % 2 === 0 ? 0 : 1;
      const solidFaces = [];
      for (let i = 0; i < N; i += 2) {
        solidFaces.push((i + shift) % N);
      }
      return {
        facesSolid: makeMask(solidFaces, N),
        hazards: [],
        collectibles: [{ face: solidFaces[0] ?? 0, offsetZ: 0.5 }],
        powerupSpawns: [{ face: solidFaces[1] ?? 0, offsetZ: 0.5, chance: 0.2 }],
      };
    },
  },

  // === VOCABULARY LEVEL 3: Spike Gauntlet ===

  spike_gauntlet_3d: {
    id: 'spike_gauntlet_3d',
    cost: 5.0,
    minVocab: 3,
    isRest: false,
    generate(params) {
      const N = params.numFaces || TUNNEL.FACES;
      const s1 = Math.floor(Math.random() * N);
      const s2 = (s1 + Math.max(1, Math.floor(N / 3))) % N;
      return {
        facesSolid: new Array(N).fill(true),
        hazards: [
          { face: s1, type: 'spike', offsetZ: 0.3 },
          { face: s2, type: 'spike', offsetZ: 0.7 },
        ],
        collectibles: [{ face: (s1 + Math.floor(N / 2)) % N, offsetZ: 0.5 }],
        powerupSpawns: [{ face: (s1 + Math.floor(N / 2)) % N, offsetZ: 0.5, chance: 0.3 }],
      };
    },
  },

  // === VOCABULARY LEVEL 4: Spiral Run ===

  spiral_run: {
    id: 'spiral_run',
    cost: 5.8,
    minVocab: 4,
    isRest: false,
    generate(params) {
      const N = params.numFaces || TUNNEL.FACES;
      const baseFace = (params.ringIndex * 2) % N;
      const solid = [baseFace, (baseFace + 1) % N, (baseFace + 2) % N];
      return {
        facesSolid: makeMask(solid, N),
        hazards: [{ face: (baseFace + 1) % N, type: 'spike', offsetZ: 0.5 }],
        collectibles: [{ face: baseFace, offsetZ: 0.5 }],
        powerupSpawns: [{ face: (baseFace + 2) % N, offsetZ: 0.5, chance: 0.3 }],
      };
    },
  },

  // === VOCABULARY LEVEL 5: Alternating Holes (forced lateral weaving) ===

  alternating_holes: {
    id: 'alternating_holes',
    cost: 4.5,
    minVocab: 5,
    isRest: false,
    generate(params) {
      const N = params.numFaces || TUNNEL.FACES;
      // The gap face alternates side each ring, forcing continuous lateral dodging
      const shift = params.ringIndex % 2 === 0 ? 0 : Math.max(1, Math.floor(N / 4));
      const baseFace = params.face || 0;
      const gapFace = (baseFace + shift + 1) % N; // Always near but offset from player
      const mask = new Array(N).fill(true);
      mask[gapFace] = false;
      return {
        facesSolid: mask,
        hazards: [],
        collectibles: [{ face: (gapFace + Math.floor(N / 2)) % N, offsetZ: 0.5 }],
        powerupSpawns: [],
      };
    },
  },

  // === VOCABULARY LEVEL 6: Double Adjacent Gaps ===

  double_adjacent: {
    id: 'double_adjacent',
    cost: 5.5,
    minVocab: 6,
    isRest: false,
    generate(params) {
      const N = params.numFaces || TUNNEL.FACES;
      // Two adjacent faces missing — requires wider dodge or precise single-face landing
      const gapStart = Math.floor(Math.random() * N);
      const gap1 = gapStart;
      const gap2 = (gapStart + 1) % N;
      const mask = new Array(N).fill(true);
      mask[gap1] = false;
      mask[gap2] = false;

      // Place collectible on the opposite side to reward safe navigation
      const safeFace = (gapStart + Math.floor(N / 2)) % N;
      return {
        facesSolid: mask,
        hazards: [],
        collectibles: [{ face: safeFace, offsetZ: 0.5 }],
        powerupSpawns: [{ face: safeFace, offsetZ: 0.5, chance: 0.2 }],
      };
    },
  },

  // === VOCABULARY LEVEL 6: Spiral Pattern (diagonal gap progression) ===

  spiral_gap: {
    id: 'spiral_gap',
    cost: 6.0,
    minVocab: 6,
    isRest: false,
    generate(params) {
      const N = params.numFaces || TUNNEL.FACES;
      // The gap rotates 1 face position each ring — creates a diagonal path
      // that the player must follow or jump over
      const gapFace = (params.ringIndex + (params.face || 0)) % N;
      const mask = new Array(N).fill(true);
      mask[gapFace] = false;

      // Collectible leads the player along the safe path
      const leadFace = (gapFace + 2) % N;
      return {
        facesSolid: mask,
        hazards: [],
        collectibles: [{ face: leadFace, offsetZ: 0.5 }],
        powerupSpawns: [],
      };
    },
  },

  // === VOCABULARY LEVEL 7: Chaser (echoes player position with delay) ===

  chaser: {
    id: 'chaser',
    cost: 7.0,
    minVocab: 7,
    isRest: false,
    generate(params) {
      const N = params.numFaces || TUNNEL.FACES;
      // The gap appears at the player's current face position,
      // forcing them to always be moving laterally.
      // Player's current face serves as the "echo" — the hole appears where they WERE.
      const playerFace = params.face || 0;
      const mask = new Array(N).fill(true);
      mask[playerFace] = false;

      // Optional adjacent gap for higher N (more punishing)
      if (N >= 8 && Math.random() < 0.4) {
        mask[(playerFace + 1) % N] = false;
      }

      // Collectible on opposite side rewards fast lateral movement
      const rewardFace = (playerFace + Math.floor(N / 2)) % N;
      return {
        facesSolid: mask,
        hazards: [],
        collectibles: [{ face: rewardFace, offsetZ: 0.5 }],
        powerupSpawns: [],
      };
    },
  },

  // === VOCABULARY LEVEL 7: Safe Window (most faces missing, precision landing) ===

  safe_window: {
    id: 'safe_window',
    cost: 8.0,
    minVocab: 7,
    isRest: false,
    generate(params) {
      const N = params.numFaces || TUNNEL.FACES;
      // Only 1-2 faces are solid — the rest are open void.
      // Requires precise lateral positioning.
      const safeFace = Math.floor(Math.random() * N);
      const solidFaces = [safeFace];

      // For higher N, add a second safe face (otherwise too punishing)
      if (N >= 8) {
        solidFaces.push((safeFace + 1) % N);
      }

      // For very high N (10+), add a third safe face
      if (N >= 10) {
        solidFaces.push((safeFace - 1 + N) % N);
      }

      return {
        facesSolid: makeMask(solidFaces, N),
        hazards: [],
        collectibles: [{ face: safeFace, offsetZ: 0.5 }],
        powerupSpawns: [{ face: safeFace, offsetZ: 0.5, chance: 0.35 }],
      };
    },
  },

  // === REST RINGS (Guaranteed safe recovery) ===

  rest_ring: {
    id: 'rest_ring',
    cost: 0.5,
    minVocab: 0,
    isRest: true,
    generate(params) {
      const N = params.numFaces || TUNNEL.FACES;
      return {
        facesSolid: new Array(N).fill(true),
        hazards: [],
        collectibles: [
          { face: 0, offsetZ: 0.3 },
          { face: 0, offsetZ: 0.7 },
          { face: 1 % N, offsetZ: 0.5 },
          { face: (N - 1) % N, offsetZ: 0.5 },
        ],
        powerupSpawns: [{ face: 0, offsetZ: 0.5, chance: 0.4 }],
      };
    },
  },
};

/**
 * Filter templates by vocabulary level and budget.
 */
export function getAvailableTemplates(vocabLevel, budget) {
  const list = [];
  for (const key in RING_TEMPLATES) {
    const t = RING_TEMPLATES[key];
    if (t.minVocab <= vocabLevel && t.cost <= budget + 1.0) {
      list.push(t);
    }
  }
  return list.length > 0 ? list : [RING_TEMPLATES.all_solid];
}
