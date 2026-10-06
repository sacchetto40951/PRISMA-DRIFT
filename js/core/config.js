// config.js — All tunable game constants in one place (3D Polygonal Tunnel Architecture).

export const CANVAS = {
  BASE_WIDTH: 1280,
  BASE_HEIGHT: 720,
  MAX_DPR: 2,
};

export const TUNNEL = {
  FACES: 8,                  // Octagonal tunnel cross-section
  RADIUS: 4.2,               // Vertex radius
  APOTHEM: 3.88,             // Distance to flat face floor (4.2 * cos(pi/8))
  RING_LENGTH: 5.5,          // Length of each ring segment along Z
  SPAWN_AHEAD_RINGS: 26,     // Number of rings spawned ahead of the player
  DESPAWN_BEHIND_RINGS: 5,   // Rings kept behind player before recycling
  WALL_THICKNESS: 0.15,      // Thickness of panel meshes
};

export const PHYSICS = {
  GRAVITY: 32.0,             // Radial acceleration toward current face (units/s²)
  JUMP_VELOCITY: -13.8,      // Initial radial velocity toward tunnel center (units/s)
  MAX_RADIAL_SPEED: 25.0,    // Terminal fall speed
  COYOTE_TIME: 0.12,         // Seconds after leaving a solid edge where jump is allowed
  JUMP_BUFFER: 0.14,         // Seconds before touching ground where jump input is queued
  JUMP_CUT_MULTIPLIER: 0.4,  // Cut jump height on early button release
  LATERAL_SPEED: 4.2,        // Angular velocity (radians/s) around circumference
  LATERAL_ACCEL: 22.0,       // Angular acceleration
  LATERAL_FRICTION: 18.0,    // Angular deceleration when no input
};

export const PLAYER = {
  SIZE: 0.7,                 // Player collision bounding sphere/box size
  BASE_SPEED: 11.0,          // Velocidade base automática real (v0) - calibrada para pular 1 ring-gap com folga
  SPEED_CAP_MULTIPLIER: 1.6, // Max forward speed with distance scaling (teto: 11.0 * 1.6 = 17.6)
  STRIDE_LENGTH: 2.8,        // Deslocamento real (Z) por ciclo completo de passada (~3.9 ciclos/s a v0)
  TRAIL_LENGTH: 16,
  COLORS: {
    core: '#00f0ff',
    glow: '#00f0ff88',
    trail: '#00b8cc',
  },
};

export const DIFFICULTY = {
  B_BASE: 1.5,              // Starting difficulty budget
  B_MAX: 10.0,              // Maximum difficulty budget
  K: 0.75,                  // Growth coefficient
  D_REF: 400,               // Reference distance in Z units
  V_CAP_MULTIPLIER: 1.6,    // Teto de velocidade compatível com novo ritmo
  V_GROWTH_RATE: 0.0002,    // Speed increase per Z unit
  REST_INTERVAL_MAX: 6,     // Max consecutive hazard rings before guaranteed rest ring
  REST_INTERVAL_MIN: 3,
  REST_FLOOR: 1,
  TUTORIAL_RINGS: 12,       // Rings of tutorial-only gameplay at start
  // Unlock thresholds (in Z distance units)
  UNLOCK_NARROW_GAPS: 150,
  UNLOCK_ALTERNATING_GAPS: 300,
  UNLOCK_SPIKES: 450,
  UNLOCK_DUAL_HAZARDS: 700,
  UNLOCK_COMPLEX_COMBOS: 1000,
};

export const CAMERA = {
  DISTANCE_Z: 3.5,          // Camera offset behind player along Z (meio-termo: visão limpa do túnel)
  DISTANCE_R: 0.96,         // Inward offset from floor toward tunnel center (ângulo baixo com visão livre)
  LOOK_AHEAD_Z: 18.0,       // Look-at point distance ahead of camera
  ROLL_LERP: 0.14,          // Interpolation speed for gravity camera reorientation
  POSITION_LERP: 0.22,      // Follow smoothing
  FOV: 68,                  // Field of view in degrees
  NEAR: 0.1,                // Near clip plane (prevents player clipping)
  FAR: 160.0,
  SHAKE_DECAY: 8.0,
  SHAKE_MAX: 0.6,
};

export const POWERUP = {
  SPAWN_MIN_DISTANCE: 40,   // Min Z units between power-up spawns
  WARNING_TIME: 2.0,        // Seconds before expiry to warn player
  ITEM_SIZE: 0.8,           // Visual size
};

export const PARTICLES = {
  MAX_COUNT: 200,
};

export const COLLECTIBLE = {
  SIZE: 0.5,
  BASE_VALUE: 10,
  MAGNET_RADIUS: 7.2,       // Raio em unidades 3D no túnel (alcança faces vizinhas e à frente)
  MAGNET_SPEED: 24.0,       // Velocidade máxima de atração suave
};

export const SCORING = {
  DISTANCE_MULTIPLIER: 1.0, // Points per unit traveled
  COLLECTIBLE_BASE: 10,
  SPEED_BONUS_THRESHOLD: 1.2,
  SPEED_BONUS_MULTIPLIER: 1.5,
};

export const AUDIO_CONFIG = {
  MASTER_VOLUME: 0.7,
  MUSIC_VOLUME: 0.5,
  SFX_VOLUME: 0.7,
};

export const GAME_MODES = {
  ENDLESS: 'endless',
  NORMAL: 'normal',
  TIME_ATTACK: 'timeAttack',
  CHALLENGE: 'challenge',
  DAILY: 'daily',
};

export const TIME_ATTACK = {
  DURATION: 75, // Seconds
};

export const DEBUG = {
  SHOW_HITBOXES: false,
  SHOW_FPS: true,
  KEY: '`',
};
