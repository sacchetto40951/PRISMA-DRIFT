// hud.js — Real-time Head-Up Display controller during gameplay.

import { formatScore, formatDistance } from '../systems/scoreSystem.js';
import { getActivePowerupInfo } from '../systems/powerupManager.js';
import { getBiome } from '../world/biomes.js';
import { GAME_MODES } from '../core/config.js';

let elScore = null;
let elDistance = null;
let elMultiplier = null;
let elBiome = null;
let elRecord = null;
let elTimerContainer = null;
let elTimerValue = null;
let elPowerups = null;
let elRecoveryBadge = null;

/**
 * Cache DOM elements for high performance updates.
 */
export function initHUD() {
  elScore = document.getElementById('hud-score');
  elDistance = document.getElementById('hud-distance');
  elMultiplier = document.getElementById('hud-multiplier');
  elBiome = document.getElementById('hud-biome');
  elRecord = document.getElementById('hud-record');
  elTimerContainer = document.getElementById('hud-timer-container');
  elTimerValue = document.getElementById('hud-timer-value');
  elPowerups = document.getElementById('hud-powerups-list');
  elRecoveryBadge = document.getElementById('hud-recovery-badge');
}

/**
 * Update the HUD for the current frame.
 * @param {object} run - run state
 * @param {string} gameMode - current game mode
 * @param {object} record - record for the current mode
 */
export function updateHUD(run, gameMode, record) {
  if (!elScore) initHUD();

  if (elScore) elScore.textContent = formatScore(run.score);
  if (elDistance) elDistance.textContent = formatDistance(run.distance);

  // Multiplier
  if (elMultiplier) {
    if (run.scoreMultiplier > 1) {
      elMultiplier.textContent = `×${run.scoreMultiplier.toFixed(1)}`;
      elMultiplier.classList.add('boosted');
    } else {
      elMultiplier.textContent = '×1.0';
      elMultiplier.classList.remove('boosted');
    }
  }

  // Biome label
  if (elBiome) {
    const biome = getBiome(run.currentBiome);
    elBiome.textContent = biome.name.toUpperCase();
    elBiome.style.color = biome.colors.platformEdge;
  }

  // Personal record
  if (elRecord) {
    const recScore = record?.score || 0;
    elRecord.textContent = `RECORDE: ${formatScore(recScore)}`;
  }

  // Time Attack mode timer
  if (elTimerContainer && elTimerValue) {
    if (gameMode === GAME_MODES.TIME_ATTACK) {
      elTimerContainer.style.display = 'flex';
      const remaining = Math.max(0, run.timeRemaining || 0);
      elTimerValue.textContent = remaining.toFixed(1) + 's';
      if (remaining <= 10) {
        elTimerValue.classList.add('critical');
      } else {
        elTimerValue.classList.remove('critical');
      }
    } else {
      elTimerContainer.style.display = 'none';
    }
  }

  // Recovery core badge
  if (elRecoveryBadge) {
    if (run.hasRecoveryCore) {
      elRecoveryBadge.classList.add('active');
    } else {
      elRecoveryBadge.classList.remove('active');
    }
  }

  // Active powerups list
  if (elPowerups) {
    renderPowerupBadges(run);
  }
}

function renderPowerupBadges(run) {
  const activePowerups = getActivePowerupInfo(run);

  if (activePowerups.length === 0) {
    elPowerups.innerHTML = '';
    return;
  }

  // Build HTML for active powerup badges
  let html = '';
  for (const pu of activePowerups) {
    const percent = pu.duration > 0 ? Math.max(0, Math.min(100, (pu.timeLeft / pu.duration) * 100)) : 100;
    const warningClass = pu.warned ? 'warning-pulse' : '';

    html += `
      <div class="hud-powerup-badge ${warningClass}" style="--pu-color: ${pu.color}">
        <span class="pu-icon">${pu.icon}</span>
        <div class="pu-info">
          <span class="pu-name">${pu.name}</span>
          ${pu.duration > 0 ? `
            <div class="pu-bar-bg">
              <div class="pu-bar-fill" style="width: ${percent}%; background-color: ${pu.color};"></div>
            </div>
          ` : `<span class="pu-status">ATIVO</span>`}
        </div>
      </div>
    `;
  }

  elPowerups.innerHTML = html;
}
