// ui.js — Master UI coordinator: manages overlays, screen routing, and button interactions.

import { gameState, resetRun } from '../core/state.js';
import { 
  renderTitleScreen, 
  renderModeSelectScreen, 
  renderPauseScreen, 
  renderGameOverScreen, 
  renderResultsScreen, 
  renderSettingsScreen, 
  renderHangarScreen 
} from './screens.js';
import { setVolume, playUIClick, initAudio, resumeAudio } from '../engine/audio.js';
import { saveSettings, resetAllData } from '../storage.js';
import { equipCosmetic } from '../systems/progression.js';
import { GAME_MODES } from '../core/config.js';

let overlayContainer = null;
let hudContainer = null;
let gameCallbacks = null;

/**
 * Initialize UI system with references to core game functions.
 * @param {object} callbacks - { startGame, resumeGame, pauseGame, restartGame }
 */
export function initUI(callbacks) {
  gameCallbacks = callbacks;
  overlayContainer = document.getElementById('overlay-screens');
  hudContainer = document.getElementById('hud');

  // Pause button in HUD
  const btnPause = document.getElementById('btn-pause-hud');
  if (btnPause) {
    btnPause.addEventListener('click', () => {
      playUIClick();
      if (gameState.currentScreen === 'playing') {
        gameCallbacks.pauseGame();
      }
    });
  }

  // Audio start trigger on any early click
  document.addEventListener('click', () => {
    initAudio();
    resumeAudio();
  }, { once: true });
}

/**
 * Switch the visible UI screen.
 * @param {'title' | 'modeSelect' | 'playing' | 'paused' | 'gameOver' | 'results' | 'settings' | 'hangar'} screenName
 * @param {object} [extraData]
 */
export function showScreen(screenName, extraData = {}) {
  // Normalize screen alias
  if (screenName === 'menu') screenName = 'title';
  gameState.currentScreen = screenName;

  if (screenName === 'title' || screenName === 'modeSelect' || screenName === 'hangar' || screenName === 'settings') {
    gameState.hasRunStarted = false;
    if (gameState.run) gameState.run.isPlayerSpawned = false;
  }

  if (screenName === 'playing') {
    if (overlayContainer) overlayContainer.classList.remove('active');
    if (hudContainer) hudContainer.classList.add('visible');
    return;
  }

  // Show overlay for non-gameplay screens
  if (hudContainer) {
    if (screenName !== 'paused') {
      hudContainer.classList.remove('visible');
    }
  }

  if (!overlayContainer) return;
  overlayContainer.classList.add('active');

  let html = '';
  switch (screenName) {
    case 'title':
    case 'menu':
      html = renderTitleScreen();
      break;
    case 'modeSelect':
      html = renderModeSelectScreen();
      break;
    case 'paused':
      html = renderPauseScreen();
      break;
    case 'gameOver':
      html = renderGameOverScreen(gameState.run, extraData.isNewRecord);
      break;
    case 'results':
      html = renderResultsScreen(gameState.run, extraData.title);
      break;
    case 'settings':
      html = renderSettingsScreen();
      break;
    case 'hangar':
      html = renderHangarScreen();
      break;
  }

  overlayContainer.innerHTML = html;
  bindScreenEvents(screenName);
}

/**
 * Bind DOM events for the newly rendered screen.
 */
function bindScreenEvents(screenName) {
  // Title screen
  const btnPlayQuick = document.getElementById('btn-play-quick');
  if (btnPlayQuick) {
    btnPlayQuick.addEventListener('click', () => {
      playUIClick();
      gameCallbacks.startGame(GAME_MODES.ENDLESS);
    });
  }

  const btnSelectMode = document.getElementById('btn-select-mode');
  if (btnSelectMode) {
    btnSelectMode.addEventListener('click', () => {
      playUIClick();
      showScreen('modeSelect');
    });
  }

  const btnOpenHangar = document.getElementById('btn-open-hangar');
  if (btnOpenHangar) {
    btnOpenHangar.addEventListener('click', () => {
      playUIClick();
      showScreen('hangar');
    });
  }

  const btnOpenSettings = document.getElementById('btn-open-settings');
  if (btnOpenSettings) {
    btnOpenSettings.addEventListener('click', () => {
      playUIClick();
      showScreen('settings');
    });
  }

  // Mode select screen
  const modeItems = document.querySelectorAll('.mode-item');
  modeItems.forEach(item => {
    item.addEventListener('click', () => {
      playUIClick();
      const mode = item.getAttribute('data-mode');
      gameCallbacks.startGame(mode);
    });
  });

  const btnBackTitle = document.getElementById('btn-back-to-title');
  if (btnBackTitle) {
    btnBackTitle.addEventListener('click', () => {
      playUIClick();
      showScreen('title');
    });
  }

  // Pause screen
  const btnResume = document.getElementById('btn-resume');
  if (btnResume) {
    btnResume.addEventListener('click', () => {
      playUIClick();
      gameCallbacks.resumeGame();
    });
  }

  const btnRestartPause = document.getElementById('btn-restart-pause');
  if (btnRestartPause) {
    btnRestartPause.addEventListener('click', () => {
      playUIClick();
      gameCallbacks.restartGame();
    });
  }

  const btnSettingsPause = document.getElementById('btn-settings-pause');
  if (btnSettingsPause) {
    btnSettingsPause.addEventListener('click', () => {
      playUIClick();
      showScreen('settings');
    });
  }

  const btnQuitPause = document.getElementById('btn-quit-pause');
  if (btnQuitPause) {
    btnQuitPause.addEventListener('click', () => {
      playUIClick();
      showScreen('title');
    });
  }

  // Game over screen
  const btnRetry = document.getElementById('btn-retry');
  if (btnRetry) {
    btnRetry.addEventListener('click', () => {
      playUIClick();
      gameCallbacks.restartGame();
    });
  }

  const btnMenuFromGameOver = document.getElementById('btn-menu-from-gameover');
  if (btnMenuFromGameOver) {
    btnMenuFromGameOver.addEventListener('click', () => {
      playUIClick();
      showScreen('title');
    });
  }

  // Results screen
  const btnResultsRetry = document.getElementById('btn-results-retry');
  if (btnResultsRetry) {
    btnResultsRetry.addEventListener('click', () => {
      playUIClick();
      gameCallbacks.restartGame();
    });
  }

  const btnResultsMenu = document.getElementById('btn-results-menu');
  if (btnResultsMenu) {
    btnResultsMenu.addEventListener('click', () => {
      playUIClick();
      showScreen('title');
    });
  }

  // Settings screen
  const sliderMaster = document.getElementById('slider-master-volume');
  const sliderMusic = document.getElementById('slider-music-volume');
  const sliderSfx = document.getElementById('slider-sfx-volume');
  const selectQuality = document.getElementById('select-quality');

  if (sliderMaster) {
    sliderMaster.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      setVolume('master', v);
      document.getElementById('label-master-volume').textContent = `${Math.round(v * 100)}%`;
      saveSettings({ masterVolume: v });
    });
  }

  if (sliderMusic) {
    sliderMusic.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      setVolume('music', v);
      document.getElementById('label-music-volume').textContent = `${Math.round(v * 100)}%`;
      saveSettings({ musicVolume: v });
    });
  }

  if (sliderSfx) {
    sliderSfx.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      setVolume('sfx', v);
      document.getElementById('label-sfx-volume').textContent = `${Math.round(v * 100)}%`;
      saveSettings({ sfxVolume: v });
    });
  }

  if (selectQuality) {
    selectQuality.addEventListener('change', (e) => {
      const q = parseFloat(e.target.value);
      gameState.adaptiveQuality = q;
      saveSettings({ graphicsQuality: q });
    });
  }

  const btnResetData = document.getElementById('btn-reset-data');
  if (btnResetData) {
    btnResetData.addEventListener('click', () => {
      if (confirm('Tem certeza que deseja apagar todo o seu progresso e recordes?')) {
        resetAllData();
        alert('Progresso resetado com sucesso.');
        showScreen('title');
      }
    });
  }

  const btnCloseSettings = document.getElementById('btn-close-settings');
  if (btnCloseSettings) {
    btnCloseSettings.addEventListener('click', () => {
      playUIClick();
      if (gameState.isPaused) {
        showScreen('paused');
      } else {
        showScreen('title');
      }
    });
  }

  // Hangar screen tabs and equip buttons
  const tabCosmetics = document.getElementById('tab-cosmetics');
  const tabAchievements = document.getElementById('tab-achievements');
  const sectionCosmetics = document.getElementById('hangar-content-cosmetics');
  const sectionAchievements = document.getElementById('hangar-content-achievements');

  if (tabCosmetics && tabAchievements) {
    tabCosmetics.addEventListener('click', () => {
      playUIClick();
      tabCosmetics.classList.add('active');
      tabAchievements.classList.remove('active');
      sectionCosmetics.classList.add('active');
      sectionAchievements.classList.remove('active');
    });

    tabAchievements.addEventListener('click', () => {
      playUIClick();
      tabAchievements.classList.add('active');
      tabCosmetics.classList.remove('active');
      sectionAchievements.classList.add('active');
      sectionCosmetics.classList.remove('active');
    });
  }

  const equipBtns = document.querySelectorAll('.btn-equip');
  equipBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      playUIClick();
      const parent = btn.closest('.cosmetic-item');
      const cat = parent.getAttribute('data-cat');
      const id = parent.getAttribute('data-id');
      equipCosmetic(cat, id);
      showScreen('hangar'); // refresh UI
    });
  });

  const btnCloseHangar = document.getElementById('btn-close-hangar');
  if (btnCloseHangar) {
    btnCloseHangar.addEventListener('click', () => {
      playUIClick();
      showScreen('title');
    });
  }
}
