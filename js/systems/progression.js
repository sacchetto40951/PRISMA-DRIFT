// progression.js — Tracks progression, milestone rewards, and cosmetic unlocks in 3D.

import { loadSave, saveToDisk } from '../storage.js';

export const COSMETIC_COLORS = [
  { id: 'default', name: 'Ciano Clássico', hex: '#00f0ff', reqType: null, reqVal: 0 },
  { id: 'solarFlare', name: 'Chama Solar', hex: '#ff9900', reqType: 'distance', reqVal: 150 },
  { id: 'emeraldSurge', name: 'Surto Esmeralda', hex: '#00ff88', reqType: 'fragments', reqVal: 30 },
  { id: 'voidPhantom', name: 'Fantasma do Vazio', hex: '#bf44ff', reqType: 'distance', reqVal: 500 },
  { id: 'pulsarPink', name: 'Pulso Magenta', hex: '#ff007f', reqType: 'fragments', reqVal: 100 },
  { id: 'supernova', name: 'Supernova Branca', hex: '#ffffff', reqType: 'distance', reqVal: 1200 },
];

export const COSMETIC_TRAILS = [
  { id: 'default', name: 'Rastro Padrão', reqType: null, reqVal: 0 },
  { id: 'stardust', name: 'Poeira Estelar', reqType: 'distance', reqVal: 250 },
  { id: 'neonWave', name: 'Onda Neon', reqType: 'fragments', reqVal: 50 },
  { id: 'hyperPulse', name: 'Hiper Pulso', reqType: 'distance', reqVal: 800 },
];

let equippedColor = 'default';
let equippedTrail = 'default';

/**
 * Initialize progression system from save data.
 */
export function initProgression() {
  const save = loadSave();
  if (save.unlocked && save.unlocked.equippedColor) {
    equippedColor = save.unlocked.equippedColor;
  }
  if (save.unlocked && save.unlocked.equippedTrail) {
    equippedTrail = save.unlocked.equippedTrail;
  }
}

/**
 * Check and apply any new unlocks based on accumulated distance and fragments.
 * @returns {Array<{type: string, name: string}>} List of newly unlocked cosmetics
 */
export function checkMilestoneUnlocks() {
  const save = loadSave();
  if (!save.unlocked) {
    save.unlocked = { colors: ['default'], trails: ['default'], equippedColor: 'default', equippedTrail: 'default' };
  }
  if (!Array.isArray(save.unlocked.colors)) save.unlocked.colors = ['default'];
  if (!Array.isArray(save.unlocked.trails)) save.unlocked.trails = ['default'];

  const newlyUnlocked = [];

  // Check Colors
  for (const c of COSMETIC_COLORS) {
    if (save.unlocked.colors.includes(c.id)) continue;
    let unlocked = false;
    if (c.reqType === 'distance' && save.totalDistance >= c.reqVal) unlocked = true;
    if (c.reqType === 'fragments' && save.totalFragments >= c.reqVal) unlocked = true;

    if (unlocked) {
      save.unlocked.colors.push(c.id);
      newlyUnlocked.push({ type: 'Cor', name: c.name });
    }
  }

  // Check Trails
  for (const t of COSMETIC_TRAILS) {
    if (save.unlocked.trails.includes(t.id)) continue;
    let unlocked = false;
    if (t.reqType === 'distance' && save.totalDistance >= t.reqVal) unlocked = true;
    if (t.reqType === 'fragments' && save.totalFragments >= t.reqVal) unlocked = true;

    if (unlocked) {
      save.unlocked.trails.push(t.id);
      newlyUnlocked.push({ type: 'Rastro', name: t.name });
    }
  }

  if (newlyUnlocked.length > 0) {
    saveToDisk(save);
  }

  return newlyUnlocked;
}

/**
 * Equip a cosmetic.
 */
export function equipCosmetic(category, id) {
  const save = loadSave();
  if (category === 'color') {
    if (save.unlocked.colors.includes(id)) {
      equippedColor = id;
      save.unlocked.equippedColor = id;
      saveToDisk(save);
      return true;
    }
  } else if (category === 'trail') {
    if (save.unlocked.trails.includes(id)) {
      equippedTrail = id;
      save.unlocked.equippedTrail = id;
      saveToDisk(save);
      return true;
    }
  }
  return false;
}

export function getEquippedCosmetics() {
  const colorDef = COSMETIC_COLORS.find(c => c.id === equippedColor) || COSMETIC_COLORS[0];
  const trailDef = COSMETIC_TRAILS.find(t => t.id === equippedTrail) || COSMETIC_TRAILS[0];
  return {
    colorId: equippedColor,
    colorHex: colorDef.hex,
    trailId: equippedTrail,
  };
}
