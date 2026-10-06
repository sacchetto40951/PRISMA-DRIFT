// input.js — Abstracts keyboard and touch input into game actions.
// The rest of the game only sees action states (MOVE_LEFT, MOVE_RIGHT, JUMP, PAUSE),
// never raw keycodes or touch events.

import { gameState } from '../core/state.js';

const actions = {
  MOVE_LEFT: false,
  MOVE_RIGHT: false,
  JUMP: false,
  PAUSE: false,
  RESTART: false,
  DEBUG: false,
};

// Track just-pressed for single-fire actions
const justPressed = {
  JUMP: false,
  PAUSE: false,
  RESTART: false,
  DEBUG: false,
};

const keysDown = new Set();
let touchState = { left: false, right: false, jump: false };

// Virtual button elements (populated on init)
let virtualButtons = {};

function keyToAction(code) {
  const b = gameState.keyBindings;
  if (b.moveLeft.includes(code)) return 'MOVE_LEFT';
  if (b.moveRight.includes(code)) return 'MOVE_RIGHT';
  if (b.jump.includes(code)) return 'JUMP';
  if (b.pause.includes(code)) return 'PAUSE';
  if (b.restart.includes(code)) return 'RESTART';
  if (b.debug.includes(code)) return 'DEBUG';
  return null;
}

function onKeyDown(e) {
  if (keysDown.has(e.code)) return;
  keysDown.add(e.code);
  const action = keyToAction(e.code);
  if (action) {
    actions[action] = true;
    if (action in justPressed) justPressed[action] = true;
    // Prevent default for game keys to avoid scrolling
    e.preventDefault();
  }
}

function onKeyUp(e) {
  keysDown.delete(e.code);
  const action = keyToAction(e.code);
  if (action) {
    actions[action] = false;
  }
}

function setupTouchControls() {
  const container = document.getElementById('touch-controls');
  if (!container) return;

  const btnLeft = document.getElementById('touch-left');
  const btnRight = document.getElementById('touch-right');
  const btnJump = document.getElementById('touch-jump');

  if (btnLeft) {
    btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); touchState.left = true; actions.MOVE_LEFT = true; }, { passive: false });
    btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); touchState.left = false; actions.MOVE_LEFT = false; }, { passive: false });
    btnLeft.addEventListener('touchcancel', () => { touchState.left = false; actions.MOVE_LEFT = false; });
  }
  if (btnRight) {
    btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); touchState.right = true; actions.MOVE_RIGHT = true; }, { passive: false });
    btnRight.addEventListener('touchend', (e) => { e.preventDefault(); touchState.right = false; actions.MOVE_RIGHT = false; }, { passive: false });
    btnRight.addEventListener('touchcancel', () => { touchState.right = false; actions.MOVE_RIGHT = false; });
  }
  if (btnJump) {
    btnJump.addEventListener('touchstart', (e) => { e.preventDefault(); touchState.jump = true; actions.JUMP = true; justPressed.JUMP = true; }, { passive: false });
    btnJump.addEventListener('touchend', (e) => { e.preventDefault(); touchState.jump = false; actions.JUMP = false; }, { passive: false });
    btnJump.addEventListener('touchcancel', () => { touchState.jump = false; actions.JUMP = false; });
  }

  // Swipe up for jump on game canvas
  let touchStartY = 0;
  const canvas = document.getElementById('game-canvas');
  if (canvas) {
    canvas.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });
    canvas.addEventListener('touchend', (e) => {
      const dy = touchStartY - (e.changedTouches[0]?.clientY ?? touchStartY);
      if (dy > 30) { // swipe up threshold
        actions.JUMP = true;
        justPressed.JUMP = true;
        setTimeout(() => { actions.JUMP = false; }, 100);
      }
    }, { passive: true });
  }
}

/** Call once at startup */
export function initInput() {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // Detect touch device and show controls
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    const tc = document.getElementById('touch-controls');
    if (tc) tc.classList.add('visible');
    setupTouchControls();
  }
}

/** Clear all just-pressed flags. Call at end of each frame. */
export function clearJustPressed() {
  for (const key in justPressed) justPressed[key] = false;
}

/** Read current action state */
export function isActionActive(action) {
  return actions[action] || false;
}

/** Read just-pressed (true only on the frame the key went down) */
export function wasActionJustPressed(action) {
  return justPressed[action] || false;
}

/** Force-release all actions (e.g., on blur/pause) */
export function releaseAll() {
  for (const key in actions) actions[key] = false;
  for (const key in justPressed) justPressed[key] = false;
  keysDown.clear();
  touchState = { left: false, right: false, jump: false };
}

/** Cleanup listeners (not usually needed, but good practice) */
export function destroyInput() {
  window.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('keyup', onKeyUp);
}
