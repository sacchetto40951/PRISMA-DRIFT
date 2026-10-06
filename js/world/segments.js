// segments.js — Ring templates for 3D Polygonal Tunnel procedural generation.

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
