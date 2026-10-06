// state.js — Central mutable state for 3D tunnel runner.

import { PLAYER, TUNNEL, GAME_MODES } from './config.js';

/** Create a fresh run state for a 3D tunnel session */
export function createRunState() {
  return {
    // 3D Cylindrical Coordinates within Tunnel
    // z = forward axis along tunnel
    // theta = angle around tunnel circumference (face 0 is bottom: -PI/2)
    // r = radial distance from center axis (r = TUNNEL.RADIUS when on ground)
    z: 0,
    theta: -Math.PI / 2, // Face 0 (bottom floor)
    r: TUNNEL.APOTHEM,

    // Velocities
    vz: PLAYER.BASE_SPEED,
    vTheta: 0,
    vr: 0,

    // Current face index (0 to TUNNEL.FACES - 1)
    currentFace: 0,
    targetFace: 0,

    // States
    isPlayerSpawned: false,
    isGrounded: true,
    isJumping: false,
    isDead: false,
    isFallingInVoid: false,

    // Jump feel timers
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    jumpHeld: false,
    _usedDoubleJump: false,

    // Run metrics
    distance: 0,
    score: 0,
    scoreMultiplier: 1,
    fragmentsCollected: 0,
    powerupsUsed: 0,

    // Shared Gravity & Camera Orientation (Unified Angle State)
    gravityAngle: -Math.PI / 2,       // Current smoothed gravity orientation angle (Floor is -PI/2)
    targetGravityAngle: -Math.PI / 2, // Target gravity angle for active face
    cameraRoll: -Math.PI / 2,         // Camera roll (synchronized with gravityAngle)
    targetRoll: -Math.PI / 2,
    currentApothem: TUNNEL.APOTHEM,
    cameraZ: -4.0,
    shakeMagnitude: 0,
    shakeX: 0,
    shakeY: 0,

    // Active power-ups: Map<powerupId, { timeLeft, data }>
    activePowerups: new Map(),
    hasRecoveryCore: false,

    // Biome
    currentBiome: 'aurora',
    biomeDistance: 0,
    biomeTransition: 0,

    // Tunnel Rings
    activeRings: [],
    nextRingZ: 0,
    ringsSinceRest: 0,

    // Mode specific
    timeRemaining: 0,
    dailySeed: null,

    // 3D Trail
    trail: [],

    // Modifiers
    gravityMultiplier: 1.0,
    speedMultiplier: 1.0,
  };
}

/** Global game state across runs */
export const gameState = {
  currentScreen: 'title',
  hasRunStarted: false,
  gameMode: GAME_MODES.ENDLESS,
  run: createRunState(),
  isPaused: false,
  debugMode: false,

  // Performance tracking
  fps: 60,
  frameTimeAvg: 16,
  adaptiveQuality: 1.0,

  // Audio settings
  audioEnabled: true,
  masterVolume: 0.7,
  musicVolume: 0.5,
  sfxVolume: 0.7,

  // Persistence
  records: {},
  unlocked: {},
  achievements: {},
  totalDistance: 0,
  totalFragments: 0,
  dailyRuns: {},

  // Key bindings
  keyBindings: {
    moveLeft: ['ArrowLeft', 'KeyA'],
    moveRight: ['ArrowRight', 'KeyD'],
    jump: ['Space', 'ArrowUp', 'KeyW'],
    pause: ['Escape', 'KeyP'],
    restart: ['KeyR'],
    debug: ['Backquote'],
  },
};

/** Reset run state for a new game */
export function resetRun() {
  gameState.run = createRunState();
  gameState.run.isPlayerSpawned = gameState.hasRunStarted;
  gameState.isPaused = false;
}
