// main.js — Application entry point, canvas setup, and system bootstrap.

import { CANVAS } from './core/config.js';
import { initInput } from './engine/input.js';
import { loadSave } from './storage.js';
import { initProgression } from './systems/progression.js';
import { initUI } from './ui/ui.js';
import { initGame, startGame, resumeGame, pauseGame, restartGame } from './core/game.js';

function setupCanvas(canvas) {
  // Use fixed logical coordinates for consistent game physics & rendering
  canvas.width = CANVAS.BASE_WIDTH;
  canvas.height = CANVAS.BASE_HEIGHT;
}

function handleResize(canvas) {
  const container = document.getElementById('game-container');
  if (!container) return;

  const windowW = window.innerWidth;
  const windowH = window.innerHeight;

  const targetRatio = CANVAS.BASE_WIDTH / CANVAS.BASE_HEIGHT;
  const windowRatio = windowW / windowH;

  let width, height;
  if (windowRatio > targetRatio) {
    height = windowH;
    width = height * targetRatio;
  } else {
    width = windowW;
    height = width / targetRatio;
  }

  canvas.style.width = `${Math.floor(width)}px`;
  canvas.style.height = `${Math.floor(height)}px`;
}

function bootstrap() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) {
    console.error('Canvas element #game-canvas not found.');
    return;
  }

  setupCanvas(canvas);
  handleResize(canvas);
  window.addEventListener('resize', () => handleResize(canvas));

  // Initialize data & systems
  loadSave();
  initProgression();
  initInput();

  // Initialize UI with game hooks
  initUI({
    startGame,
    resumeGame,
    pauseGame,
    restartGame,
  });

  // Initialize game loop
  initGame(canvas);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
}
