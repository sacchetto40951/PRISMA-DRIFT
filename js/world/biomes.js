// biomes.js — Biome definitions with visual, audio, and gameplay modifiers.

export const BIOMES = {
  aurora: {
    id: 'aurora',
    name: 'Setor Aurora',
    faces: 8, // Octagonal standard corridor
    description: 'Zona de calibração — plataformas largas, riscos mínimos.',
    // Visual
    colors: {
      bg0: '#050520',
      bg1: '#0a0a35',
      bg2: '#0f1845',
      bg3: '#152050',
      platform: '#1a6b8a',
      platformEdge: '#00e5ff',
      platformGlow: '#00e5ff33',
      hazard: '#ff3366',
      collectible: '#00ffcc',
      speedLineColor: 'rgba(0, 229, 255, 0.12)',
      ambientParticle: ['#00e5ff44', '#00ccff33', '#00ffcc22'],
      portalColor: '#00e5ff',
    },
    // Gameplay modifiers
    speedMultiplier: 0.85,
    gravityMultiplier: 1.0,
    hazardDensity: 0.3,
    platformWidthBonus: 60,
    gapReduction: 0.7,
    // Power-up weights (relative frequency)
    powerupWeights: {
      prismaShield: 0.3,
      doubleJump: 0.2,
      fragmentMagnet: 0.1,
      velocitySurge: 0.05,
      gravityField: 0.05,
      spectralPhase: 0,
      dimensionalDash: 0,
      recoveryCore: 0.05,
      scoreMultiplier: 0.1,
    },
    // Ambient particle config
    ambientParticleCount: 8,
    ambientParticleSpeed: 15,
  },

  currentV: {
    id: 'currentV',
    name: 'Corrente-V',
    faces: 6, // Hexagonal high-speed tube
    description: 'Zona de alta velocidade — aceleração constante.',
    colors: {
      bg0: '#0a0008',
      bg1: '#1a0020',
      bg2: '#2a0535',
      bg3: '#3a0a45',
      platform: '#8a2060',
      platformEdge: '#ff4488',
      platformGlow: '#ff448833',
      hazard: '#ffaa00',
      collectible: '#ffdd44',
      speedLineColor: 'rgba(255, 68, 136, 0.2)',
      ambientParticle: ['#ff448844', '#ff668833', '#ffaa0022'],
      portalColor: '#ff4488',
    },
    speedMultiplier: 1.25,
    gravityMultiplier: 1.0,
    hazardDensity: 0.6,
    platformWidthBonus: 30,
    gapReduction: 1.0,
    powerupWeights: {
      prismaShield: 0.1,
      doubleJump: 0.1,
      fragmentMagnet: 0.15,
      velocitySurge: 0.35,
      gravityField: 0.05,
      spectralPhase: 0.02,
      dimensionalDash: 0.05,
      recoveryCore: 0.05,
      scoreMultiplier: 0.3,
    },
    ambientParticleCount: 15,
    ambientParticleSpeed: 50,
  },

  debris: {
    id: 'debris',
    name: 'Cinturão de Destroços',
    faces: 4, // 4 faces: angular, sharp square-cross section
    description: 'Zona de perigo denso — obstáculos por toda parte.',
    colors: {
      bg0: '#0a0505',
      bg1: '#1a0a08',
      bg2: '#2a1510',
      bg3: '#3a2018',
      platform: '#6a4030',
      platformEdge: '#ff6633',
      platformGlow: '#ff663322',
      hazard: '#ff2200',
      collectible: '#ffcc00',
      speedLineColor: 'rgba(255, 102, 51, 0.15)',
      ambientParticle: ['#ff663344', '#ff443322', '#ff880022'],
      portalColor: '#ff6633',
    },
    speedMultiplier: 1.0,
    gravityMultiplier: 1.0,
    hazardDensity: 1.4,
    platformWidthBonus: 0,
    gapReduction: 1.0,
    powerupWeights: {
      prismaShield: 0.4,
      doubleJump: 0.15,
      fragmentMagnet: 0.05,
      velocitySurge: 0.05,
      gravityField: 0.05,
      spectralPhase: 0.1,
      dimensionalDash: 0.08,
      recoveryCore: 0.15,
      scoreMultiplier: 0.05,
    },
    ambientParticleCount: 12,
    ambientParticleSpeed: 25,
  },

  magnetic: {
    id: 'magnetic',
    name: 'Deriva Magnética',
    faces: 6, // Hexagonal magnetic flux chamber
    description: 'Zona de plataformas móveis — leitura de padrões é essencial.',
    colors: {
      bg0: '#030a0a',
      bg1: '#051515',
      bg2: '#082828',
      bg3: '#0a3838',
      platform: '#207060',
      platformEdge: '#00ffaa',
      platformGlow: '#00ffaa33',
      hazard: '#ff5566',
      collectible: '#88ffcc',
      speedLineColor: 'rgba(0, 255, 170, 0.12)',
      ambientParticle: ['#00ffaa33', '#00cc8833', '#44ffcc22'],
      portalColor: '#00ffaa',
    },
    speedMultiplier: 0.95,
    gravityMultiplier: 1.0,
    hazardDensity: 0.7,
    platformWidthBonus: 10,
    gapReduction: 0.9,
    movingPlatformChance: 0.6,
    powerupWeights: {
      prismaShield: 0.1,
      doubleJump: 0.2,
      fragmentMagnet: 0.35,
      velocitySurge: 0.05,
      gravityField: 0.1,
      spectralPhase: 0.05,
      dimensionalDash: 0.1,
      recoveryCore: 0.08,
      scoreMultiplier: 0.1,
    },
    ambientParticleCount: 10,
    ambientParticleSpeed: 20,
  },

  nullZone: {
    id: 'nullZone',
    name: 'Zona Nula',
    faces: 10, // 10 faces: rounded decagonal cylinder for smooth zero-G floating
    description: 'Gravidade reduzida — saltos longos e flutuantes.',
    colors: {
      bg0: '#050510',
      bg1: '#0a0a25',
      bg2: '#1a1040',
      bg3: '#251560',
      platform: '#5030a0',
      platformEdge: '#aa66ff',
      platformGlow: '#aa66ff33',
      hazard: '#ff4488',
      collectible: '#cc88ff',
      speedLineColor: 'rgba(170, 102, 255, 0.12)',
      ambientParticle: ['#aa66ff44', '#8844ff33', '#cc88ff22'],
      portalColor: '#aa66ff',
    },
    speedMultiplier: 1.0,
    gravityMultiplier: 0.6,
    hazardDensity: 0.8,
    platformWidthBonus: 20,
    gapReduction: 1.2,
    powerupWeights: {
      prismaShield: 0.1,
      doubleJump: 0.15,
      fragmentMagnet: 0.1,
      velocitySurge: 0.1,
      gravityField: 0.35,
      spectralPhase: 0.05,
      dimensionalDash: 0.1,
      recoveryCore: 0.05,
      scoreMultiplier: 0.1,
    },
    ambientParticleCount: 20,
    ambientParticleSpeed: 10,
  },

  abyssPrisma: {
    id: 'abyssPrisma',
    name: 'Abismo Prisma',
    faces: 5, // Pentagonal prism: asymmetric, challenging angles
    description: 'Zona de alta dificuldade — múltiplos perigos combinados.',
    colors: {
      bg0: '#020202',
      bg1: '#050508',
      bg2: '#080810',
      bg3: '#0a0a18',
      platform: '#303040',
      platformEdge: '#66ffff',
      platformGlow: '#66ffff22',
      hazard: '#ff0044',
      collectible: '#ff88ff',
      speedLineColor: 'rgba(102, 255, 255, 0.18)',
      ambientParticle: ['#66ffff22', '#ff00ff22', '#ff004422'],
      portalColor: '#66ffff',
    },
    speedMultiplier: 1.15,
    gravityMultiplier: 1.0,
    hazardDensity: 1.8,
    platformWidthBonus: -20,
    gapReduction: 1.1,
    powerupWeights: {
      prismaShield: 0.15,
      doubleJump: 0.1,
      fragmentMagnet: 0.05,
      velocitySurge: 0.08,
      gravityField: 0.05,
      spectralPhase: 0.08,
      dimensionalDash: 0.08,
      recoveryCore: 0.1,
      scoreMultiplier: 0.08,
    },
    ambientParticleCount: 6,
    ambientParticleSpeed: 35,
  },

  pulsarCore: {
    id: 'pulsarCore',
    name: 'Núcleo Pulsar',
    faces: 12, // Dodecagonal: smooth, round, rapid cyber tunnel
    description: 'Zona bônus — neon pulsante, alto risco e alta recompensa.',
    colors: {
      bg0: '#050005',
      bg1: '#100818',
      bg2: '#1a1028',
      bg3: '#251838',
      platform: '#604080',
      platformEdge: '#ff44ff',
      platformGlow: '#ff44ff44',
      hazard: '#ff6600',
      collectible: '#44ff88',
      speedLineColor: 'rgba(255, 68, 255, 0.2)',
      ambientParticle: ['#ff44ff44', '#44ff8844', '#ffff0033'],
      portalColor: '#ff44ff',
    },
    speedMultiplier: 1.1,
    gravityMultiplier: 1.0,
    hazardDensity: 1.2,
    platformWidthBonus: 0,
    gapReduction: 1.0,
    pulseIntensity: 0.3,
    powerupWeights: {
      prismaShield: 0.1,
      doubleJump: 0.1,
      fragmentMagnet: 0.15,
      velocitySurge: 0.15,
      gravityField: 0.05,
      spectralPhase: 0.1,
      dimensionalDash: 0.1,
      recoveryCore: 0.08,
      scoreMultiplier: 0.35,
    },
    ambientParticleCount: 25,
    ambientParticleSpeed: 30,
  },
};

// Biome sequence for Normal mode (curated progression)
export const NORMAL_BIOME_SEQUENCE = [
  'aurora', 'currentV', 'debris', 'magnetic',
  'nullZone', 'abyssPrisma', 'pulsarCore'
];

// Biome selection for Endless mode — distance thresholds where new biomes unlock
export const ENDLESS_BIOME_UNLOCKS = [
  { distance: 0, biome: 'aurora' },
  { distance: 3000, biome: 'currentV' },
  { distance: 6000, biome: 'debris' },
  { distance: 9000, biome: 'magnetic' },
  { distance: 13000, biome: 'nullZone' },
  { distance: 18000, biome: 'abyssPrisma' },
  { distance: 25000, biome: 'pulsarCore' },
];

/**
 * Get the biome data for a given biome ID.
 */
export function getBiome(biomeId) {
  return BIOMES[biomeId] || BIOMES.aurora;
}

/**
 * Get available biomes at a given distance (Endless mode).
 */
export function getAvailableBiomes(distance) {
  const available = [];
  for (const unlock of ENDLESS_BIOME_UNLOCKS) {
    if (distance >= unlock.distance) {
      available.push(unlock.biome);
    }
  }
  return available;
}

/**
 * Pick a random biome from available ones, weighted toward newer biomes.
 */
export function pickRandomBiome(distance, currentBiome) {
  const available = getAvailableBiomes(distance);
  if (available.length <= 1) return available[0];

  // Weight toward more recently unlocked biomes, but allow any
  const weights = available.map((_, i) => 1 + i * 0.5);
  // Reduce weight of current biome to encourage variety
  const currentIdx = available.indexOf(currentBiome);
  if (currentIdx >= 0) weights[currentIdx] *= 0.3;

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;

  for (let i = 0; i < available.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return available[i];
  }

  return available[available.length - 1];
}
