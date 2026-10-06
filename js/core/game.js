// game.js — Master game loop and orchestrator for 3D Polygonal Tunnel Runner.

import { gameState, resetRun } from './state.js';
import { CANVAS, GAME_MODES, TIME_ATTACK, TUNNEL } from './config.js';
import { wasActionJustPressed, clearJustPressed, releaseAll } from '../engine/input.js';
import { updatePlayerPhysics } from '../engine/physics.js';
import { 
  resolvePlayerTunnel, 
  checkPlayerHazards3D, 
  checkPlayerCollectibles3D, 
  checkPlayerPowerups3D, 
  checkFallDeath3D 
} from '../engine/collision.js';
import { updateCamera3D, getCameraMatrices, triggerShake } from '../engine/camera.js';
import { initRenderer3D, renderScene3D } from '../engine/renderer3d.js';
import { 
  playJump, 
  playDoubleJump, 
  playLand, 
  playCollect, 
  playPowerupActivate, 
  playPowerupWarning, 
  playPowerupExpire, 
  playShieldBreak, 
  playDeath, 
  playRecovery, 
  playBiomeTransition, 
  playNewRecord, 
  startBiomeDrone, 
  stopBiomeDrone,
  updateMusicReactive,
  pauseMusic,
  resumeMusic,
  resumeAudio 
} from '../engine/audio.js';
import { initLevelGenerator, updateLevelGenerator } from '../world/levelGenerator.js';
import { getBiome } from '../world/biomes.js';
import { 
  activatePowerup, 
  updatePowerups, 
  tryAbsorbHit, 
  tryRecovery, 
  clearAllPowerups 
} from '../systems/powerupManager.js';
import { updateScore, collectFragment } from '../systems/scoreSystem.js';
import { checkMilestoneUnlocks } from '../systems/progression.js';
import { evaluateAchievements } from '../systems/achievements.js';
import { updateRecord, addFragments, updateDailyRun, getRecord, getTodayString } from '../storage.js';
import { updateHUD } from '../ui/hud.js';
import { showScreen } from '../ui/ui.js';

let canvas = null;
let lastTime = 0;
let animationFrameId = null;
let deathTimer = 0;
let fpsTimer = 0;
let frameCount = 0;

/**
 * Initialize 3D game core and WebGL renderer.
 * @param {HTMLCanvasElement} canvasElement
 */
export function initGame(canvasElement) {
  canvas = canvasElement;

  const success = initRenderer3D(canvas);
  if (!success) {
    alert('Erro: Seu navegador não suporta WebGL.');
    return;
  }

  showScreen('title');

  lastTime = performance.now();
  animationFrameId = requestAnimationFrame(gameLoop);
}

/**
 * Start a new game session.
 * @param {string} mode
 */
export function startGame(mode = GAME_MODES.ENDLESS) {
  gameState.hasRunStarted = true;
  resetRun();
  gameState.run.isPlayerSpawned = true;
  gameState.gameMode = mode;
  gameState.isPaused = false;
  deathTimer = 0;

  if (mode === GAME_MODES.TIME_ATTACK) {
    gameState.run.timeRemaining = TIME_ATTACK.DURATION;
  } else if (mode === GAME_MODES.DAILY) {
    gameState.run.dailySeed = getTodayString();
  }

  initLevelGenerator(gameState.run);
  clearAllPowerups(gameState.run);

  resumeAudio();
  startBiomeDrone(gameState.run.currentBiome);

  showScreen('playing');
}

/**
 * Pause game.
 */
export function pauseGame() {
  if (gameState.currentScreen !== 'playing') return;
  gameState.isPaused = true;
  releaseAll();
  pauseMusic();
  showScreen('paused');
}

/**
 * Resume game without delta-time jump.
 */
export function resumeGame() {
  if (!gameState.isPaused) return;
  gameState.isPaused = false;
  lastTime = performance.now();
  resumeMusic();
  showScreen('playing');
}

/**
 * Restart game with same mode.
 */
export function restartGame() {
  startGame(gameState.gameMode);
}

/**
 * Master Game Loop.
 */
function gameLoop(currentTime) {
  const dtMs = currentTime - lastTime;
  lastTime = currentTime;

  const dt = Math.min(dtMs / 1000, 0.1);

  // Track FPS
  frameCount++;
  fpsTimer += dt;
  if (fpsTimer >= 0.5) {
    gameState.fps = (frameCount / fpsTimer);
    frameCount = 0;
    fpsTimer = 0;
  }

  handleHotkeys();

  if (gameState.currentScreen === 'playing' && !gameState.isPaused) {
    update(dt);
  }

  render(currentTime / 1000);

  clearJustPressed();
  animationFrameId = requestAnimationFrame(gameLoop);
}

function handleHotkeys() {
  if (wasActionJustPressed('PAUSE')) {
    if (gameState.currentScreen === 'playing') {
      pauseGame();
    } else if (gameState.currentScreen === 'paused') {
      resumeGame();
    }
  }

  if (wasActionJustPressed('RESTART')) {
    if (gameState.currentScreen === 'playing' || gameState.currentScreen === 'gameOver' || gameState.currentScreen === 'paused') {
      restartGame();
    }
  }

  if (wasActionJustPressed('DEBUG')) {
    gameState.debugMode = !gameState.debugMode;
  }
}

/**
 * Update 3D simulation for one frame.
 */
function update(dt) {
  const run = gameState.run;

  // Death sequence
  if (run.isDead) {
    deathTimer += dt;
    updateCamera3D(run, dt);
    if (deathTimer >= 0.8) {
      handleGameOver();
    }
    return;
  }

  // Time Attack mode timer check
  if (gameState.gameMode === GAME_MODES.TIME_ATTACK) {
    run.timeRemaining -= dt;
    if (run.timeRemaining <= 0) {
      handleVictory('TEMPO ESGOTADO!');
      return;
    }
  }

  // Normal mode victory condition (reach ~2500 Z units)
  if (gameState.gameMode === GAME_MODES.NORMAL && run.currentBiome === 'pulsarCore' && run.distance > 2400) {
    handleVictory('EXPEDIÇÃO CONCLUÍDA!');
    return;
  }

  // 1. Update 3D Physics
  updatePlayerPhysics(run, dt);

  // Jump Audio
  if (run._jumpEvent) {
    if (run._jumpEvent === 'doubleJump') playDoubleJump();
    else playJump();
    run._jumpEvent = null;
  }

  // 2. Update 3D Tunnel Rings
  updateLevelGenerator(run);

  // 3. Collision: Player vs Tunnel Panels
  const landingEvents = resolvePlayerTunnel(run, run.activeRings);
  for (const ev of landingEvents) {
    if (ev.type === 'land') playLand();
  }

  // 4. Collision: Player vs 3D Hazards
  const hazardHits = checkPlayerHazards3D(run, run.activeRings);
  if (hazardHits.length > 0) {
    const absorbResult = tryAbsorbHit(run);
    if (absorbResult.absorbed) {
      run._shieldAbsorbedEvent = true;
      playShieldBreak();
      triggerShake(run, 0.4);
    } else {
      triggerDeath();
      return;
    }
  }

  // 5. Collision: Collectibles
  const collectEvents = checkPlayerCollectibles3D(run, run.activeRings, dt);
  for (const c of collectEvents) {
    collectFragment(run, c.value);
    playCollect();
  }

  // 6. Collision: Powerup Pickups
  const puEvents = checkPlayerPowerups3D(run, run.activeRings);
  for (const p of puEvents) {
    activatePowerup(run, p.powerup.powerupId);
    playPowerupActivate();
  }

  // 7. Check Fall into Void
  if (checkFallDeath3D(run)) {
    triggerDeath();
    return;
  }

  // 8. Update Active Power-ups
  const puUpdates = updatePowerups(run, dt);
  for (const ev of puUpdates) {
    if (ev.type === 'powerupWarning') playPowerupWarning();
    if (ev.type === 'powerupExpired') playPowerupExpire();
  }

  // 9. Update Score
  updateScore(run, dt);

  // 10. Update Procedural Layered Music (tempo, density, intensity reactive to progress)
  updateMusicReactive(run);

  // 11. Evaluate Achievements
  evaluateAchievements(run);

  // 12. Biome Transition
  if (run._biomeEvent === 'transition') {
    playBiomeTransition();
    startBiomeDrone(run.currentBiome);
    run._biomeEvent = null;
  }

  // 13. Update 3D Camera (Roll & Position)
  updateCamera3D(run, dt);

  // 14. Update HUD
  const curRecord = getRecord(gameState.gameMode);
  updateHUD(run, gameState.gameMode, curRecord);
}

/**
 * Handle death or recovery.
 */
function triggerDeath() {
  const run = gameState.run;

  // Try Recovery Core
  if (tryRecovery(run)) {
    run._recoveryEvent = true;
    playRecovery();
    triggerShake(run, 0.5);

    // Save player: snap back onto nearest solid face of current ring
    const currentRing = run.activeRings.find(r => run.z >= r.zStart && run.z < r.zEnd);
    if (currentRing) {
      const numFaces = currentRing.numFaces || TUNNEL.FACES;
      const solidFace = currentRing.facesSolid.findIndex(s => s === true);
      if (solidFace !== -1) {
        run.currentFace = solidFace;
        run.theta = -Math.PI / 2 + solidFace * ((Math.PI * 2) / numFaces);
        run.targetGravityAngle = run.theta;
        run.targetRoll = run.theta;
      }
    }
    run.r = run.currentApothem || TUNNEL.RADIUS;
    run.vr = 0;
    run.isFallingInVoid = false;
    run.isGrounded = true;

    activatePowerup(run, 'spectralPhase');
    return;
  }

  // Definite death
  run.isDead = true;
  deathTimer = 0;
  playDeath();
  triggerShake(run, 0.6);
  stopBiomeDrone();
}

function handleGameOver() {
  const run = gameState.run;
  const isNewRecord = updateRecord(gameState.gameMode, run.score, run.distance);
  addFragments(run.fragmentsCollected);

  if (gameState.gameMode === GAME_MODES.DAILY) {
    updateDailyRun(getTodayString(), run.score, run.distance);
  }

  checkMilestoneUnlocks();

  if (isNewRecord) {
    playNewRecord();
  }

  showScreen('gameOver', { isNewRecord });
}

function handleVictory(title) {
  const run = gameState.run;
  updateRecord(gameState.gameMode, run.score, run.distance);
  addFragments(run.fragmentsCollected);
  checkMilestoneUnlocks();
  playNewRecord();
  showScreen('results', { title });
}

/**
 * Render 3D scene.
 */
function render(time) {
  const run = gameState.run;
  const aspect = canvas.width / canvas.height;
  const matrices = getCameraMatrices(run, aspect);

  renderScene3D(run, matrices, time);
}
