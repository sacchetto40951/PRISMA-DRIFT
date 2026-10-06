// storage.js — localStorage persistence with versioning and error handling.

const STORAGE_KEY = 'prismadrift_save_v1';
const SCHEMA_VERSION = 1;

/**
 * Default save data structure.
 */
function getDefaultSave() {
  return {
    version: SCHEMA_VERSION,
    records: {
      endless: { score: 0, distance: 0 },
      normal: { score: 0, distance: 0 },
      timeAttack: { score: 0, distance: 0 },
      challenge: { score: 0, distance: 0 },
      daily: {},
    },
    totalDistance: 0,
    totalFragments: 0,
    unlocked: {
      colors: ['default'],
      trails: ['default'],
      biomePalettes: [],
    },
    achievements: {},
    settings: {
      masterVolume: 0.7,
      musicVolume: 0.5,
      sfxVolume: 0.7,
      audioEnabled: true,
      graphicsQuality: 1.0,
      keyBindings: null, // null = use defaults
    },
    dailyRuns: {}, // { 'YYYY-MM-DD': { score, distance } }
    stats: {
      totalRuns: 0,
      totalDeaths: 0,
      powerupsCollected: 0,
      longestRun: 0,
    },
  };
}

/**
 * Load save data from localStorage.
 */
export function loadSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSave();

    const data = JSON.parse(raw);

    // Version migration
    if (data.version !== SCHEMA_VERSION) {
      return migrateSave(data);
    }

    // Merge with defaults to fill any missing fields
    return mergeDeep(getDefaultSave(), data);
  } catch (e) {
    console.warn('[Storage] Failed to load save data:', e);
    return getDefaultSave();
  }
}

/**
 * Save data to localStorage.
 */
export function saveToDisk(data) {
  try {
    data.version = SCHEMA_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('[Storage] Failed to save:', e);
    return false;
  }
}

/**
 * Update a specific record if it's a new high score.
 */
export function updateRecord(mode, score, distance) {
  const save = loadSave();

  if (!save.records[mode]) {
    save.records[mode] = { score: 0, distance: 0 };
  }

  let isNewRecord = false;
  if (score > save.records[mode].score) {
    save.records[mode].score = score;
    isNewRecord = true;
  }
  if (distance > save.records[mode].distance) {
    save.records[mode].distance = distance;
    isNewRecord = true;
  }

  // Update totals
  save.totalDistance += distance;
  save.stats.totalRuns++;
  save.stats.longestRun = Math.max(save.stats.longestRun, distance);

  saveToDisk(save);
  return isNewRecord;
}

/**
 * Add fragments to total.
 */
export function addFragments(count) {
  const save = loadSave();
  save.totalFragments += count;
  saveToDisk(save);
  return save.totalFragments;
}

/**
 * Update daily run score.
 */
export function updateDailyRun(dateStr, score, distance) {
  const save = loadSave();

  if (!save.dailyRuns[dateStr] || score > save.dailyRuns[dateStr].score) {
    save.dailyRuns[dateStr] = { score, distance };
  }

  // Prune old daily runs (keep last 30 days)
  const keys = Object.keys(save.dailyRuns).sort();
  while (keys.length > 30) {
    delete save.dailyRuns[keys.shift()];
  }

  saveToDisk(save);
  return save.dailyRuns[dateStr];
}

/**
 * Save settings.
 */
export function saveSettings(settings) {
  const save = loadSave();
  Object.assign(save.settings, settings);
  saveToDisk(save);
}

/**
 * Load settings.
 */
export function loadSettings() {
  const save = loadSave();
  return save.settings;
}

/**
 * Get record for a mode.
 */
export function getRecord(mode) {
  const save = loadSave();
  return save.records[mode] || { score: 0, distance: 0 };
}

/**
 * Reset all save data.
 */
export function resetAllData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (e) {
    console.warn('[Storage] Failed to reset:', e);
    return false;
  }
}

/**
 * Migrate save data from an older version.
 */
function migrateSave(oldData) {
  // For now, just merge with defaults (graceful degradation)
  const fresh = getDefaultSave();
  return mergeDeep(fresh, oldData, { version: SCHEMA_VERSION });
}

/**
 * Deep merge utility — target values are overwritten by source values.
 */
function mergeDeep(target, ...sources) {
  for (const source of sources) {
    if (!source) continue;
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        mergeDeep(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
  return target;
}

/**
 * Get today's date string for daily runs.
 */
export function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Generate a seed number from a date string (for daily run generation).
 */
export function seedFromDate(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}
