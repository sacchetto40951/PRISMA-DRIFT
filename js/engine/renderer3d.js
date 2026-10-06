// renderer3d.js — Pure WebGL 3D Polygonal Tunnel & Entity Renderer.
// Implements 3D crystal tunnel, starfield, 3D hazards, and the animated "Ion" character with scuttling gait.

import { TUNNEL, PLAYER } from '../core/config.js';
import { mat4, vec3 } from './math3d.js';
import { getBiome } from '../world/biomes.js';
import { getEquippedCosmetics } from '../systems/progression.js';
import { POWERUP_REGISTRY } from '../systems/powerupManager.js';

let gl = null;
let tunnelProgram = null;
let starProgram = null;
let tunnelVBO = null;
let starVBO = null;
let playerVBO = null;
const numStars = 1200;

// Shaders
const TUNNEL_VS = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUV;
attribute vec3 aColor;

uniform mat4 uViewProj;
uniform mat4 uModel;

varying vec3 vNormal;
varying vec2 vUV;
varying vec3 vColor;
varying float vDepth;
varying vec3 vWorldPos;

void main() {
  vec4 worldPos = uModel * vec4(aPosition, 1.0);
  gl_Position = uViewProj * worldPos;
  vNormal = mat3(uModel) * aNormal;
  vUV = aUV;
  vColor = aColor;
  vDepth = gl_Position.z;
  vWorldPos = worldPos.xyz;
}
`;

const TUNNEL_FS = `
precision mediump float;

varying vec3 vNormal;
varying vec2 vUV;
varying vec3 vColor;
varying float vDepth;
varying vec3 vWorldPos;

uniform vec3 uNeonColor;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform float uIsPlayer;
uniform float uAlpha;

void main() {
  vec3 norm = normalize(vNormal);
  // Directional lighting
  vec3 lightDir = normalize(vec3(0.2, 0.6, -0.75));
  float diff = max(dot(norm, -lightDir), 0.28);

  vec3 baseColor = vColor * diff;

  if (uIsPlayer > 0.5) {
    // Player Character Shading: bright glowing energy core with refined fine rim contour
    float rim = 1.0 - max(dot(norm, vec3(0.0, 0.0, -1.0)), 0.0);
    // Subtle fine luminous rim along the silhouette edges (accented by active power-up)
    vec3 rimAccent = mix(vec3(0.35, 0.5, 0.7), uNeonColor, 0.85);
    baseColor = vColor * (0.85 + 0.35 * diff) + rimAccent * pow(rim, 3.0) * 1.2;
  } else {
    // Tunnel Panels: neon borders along edges
    float edgeX = min(vUV.x, 1.0 - vUV.x);
    float edgeY = min(vUV.y, 1.0 - vUV.y);
    float edgeDist = min(edgeX, edgeY);

    if (edgeDist < 0.04) {
      baseColor = mix(baseColor, uNeonColor * 1.6, 0.95);
    } else if (edgeDist < 0.08) {
      baseColor = mix(baseColor, uNeonColor, 0.5);
    }
  }

  // Atmospheric distance fog into space
  float fogFactor = clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
  vec3 finalColor = mix(baseColor, uFogColor, fogFactor);

  gl_FragColor = vec4(finalColor, uAlpha);
}
`;

const STAR_VS = `
attribute vec3 aPosition;
attribute float aSize;

uniform mat4 uViewProj;
uniform float uCameraZ;

varying float vTwinkle;

void main() {
  vec3 pos = aPosition;
  pos.z = mod(pos.z - uCameraZ + 200.0, 400.0) + uCameraZ - 200.0;

  gl_Position = uViewProj * vec4(pos, 1.0);
  gl_PointSize = aSize * (160.0 / max(gl_Position.z, 1.0));
  vTwinkle = sin(aPosition.x * 12.0 + aPosition.y * 7.0) * 0.3 + 0.7;
}
`;

const STAR_FS = `
precision mediump float;
varying float vTwinkle;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  if (length(coord) > 0.5) discard;

  float intensity = (0.5 - length(coord)) * 2.0 * vTwinkle;
  gl_FragColor = vec4(0.85, 0.95, 1.0, intensity);
}
`;

function compileShader(gl, src, type) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('Shader compilation error:', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function createProgram(gl, vsSrc, fsSrc) {
  const vs = compileShader(gl, vsSrc, gl.VERTEX_SHADER);
  const fs = compileShader(gl, fsSrc, gl.FRAGMENT_SHADER);
  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(p));
  }
  return p;
}

/**
 * Initialize WebGL 3D Renderer on the canvas.
 */
export function initRenderer3D(canvas) {
  gl = canvas.getContext('webgl', { alpha: false, depth: true, antialias: true }) ||
       canvas.getContext('experimental-webgl');

  if (!gl) {
    console.error('WebGL is not supported by this browser.');
    return false;
  }

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  tunnelProgram = createProgram(gl, TUNNEL_VS, TUNNEL_FS);
  starProgram = createProgram(gl, STAR_VS, STAR_FS);

  tunnelVBO = gl.createBuffer();
  starVBO = gl.createBuffer();
  playerVBO = gl.createBuffer();

  // Procedural starfield around tunnel
  const starData = [];
  for (let i = 0; i < numStars; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 16.0 + Math.random() * 70.0;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    const z = (Math.random() - 0.5) * 400.0;
    const size = 1.0 + Math.random() * 2.5;
    starData.push(x, y, z, size);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, starVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(starData), gl.STATIC_DRAW);

  return true;
}

function hexToRGB(hex) {
  const c = (hex || '#00f0ff').replace('#', '').slice(0, 6);
  if (c.length < 6) return [0.5, 0.5, 0.5];
  return [
    parseInt(c.substring(0, 2), 16) / 255,
    parseInt(c.substring(2, 4), 16) / 255,
    parseInt(c.substring(4, 6), 16) / 255,
  ];
}

/**
 * Master 3D scene render.
 */
export function renderScene3D(run, matrices, time) {
  if (!gl) return;

  const biome = getBiome(run.currentBiome);
  const bgRGB = hexToRGB(biome.colors.bg0 || '#03030d');
  const neonRGB = hexToRGB(biome.colors.platformEdge || '#00f0ff');
  const platRGB = hexToRGB(biome.colors.platform || '#1a6b8a');

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(bgRGB[0], bgRGB[1], bgRGB[2], 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // 1. Starfield
  renderStars(matrices, run.z);

  // 2. Tunnel Panels
  renderTunnelRings(run, matrices, platRGB, neonRGB, bgRGB);

  // 3. Hazards & Collectibles
  renderHazardsAndPickups(run, matrices, time, neonRGB, bgRGB);

  // 4. Character "Ion" with Scuttling Run Animation (rendered only during active run)
  if (run.isPlayerSpawned && !run.isDead) {
    renderPlayer3D(run, matrices, time, bgRGB);
  }
}

/**
 * Draw Starfield background.
 */
function renderStars(matrices, cameraZ) {
  gl.useProgram(starProgram);

  const uViewProj = gl.getUniformLocation(starProgram, 'uViewProj');
  const uCameraZ = gl.getUniformLocation(starProgram, 'uCameraZ');
  gl.uniformMatrix4fv(uViewProj, false, matrices.viewProj);
  gl.uniform1f(uCameraZ, cameraZ);

  gl.bindBuffer(gl.ARRAY_BUFFER, starVBO);

  const aPosition = gl.getAttribLocation(starProgram, 'aPosition');
  const aSize = gl.getAttribLocation(starProgram, 'aSize');

  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 16, 0);

  gl.enableVertexAttribArray(aSize);
  gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, 16, 12);

  gl.drawArrays(gl.POINTS, 0, numStars);

  gl.disableVertexAttribArray(aPosition);
  gl.disableVertexAttribArray(aSize);
}
const TWO_PI = Math.PI * 2;

function calcTriInwardNormal(p0, p1, p2) {
  const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
  const bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
  let nx = ay * bz - az * by;
  let ny = az * bx - ax * bz;
  let nz = ax * by - ay * bx;
  const len = Math.hypot(nx, ny, nz) || 1;
  nx /= len; ny /= len; nz /= len;
  // Ensure normal points inward toward tunnel center (0, 0, z)
  const midX = (p0[0] + p1[0] + p2[0]) / 3;
  const midY = (p0[1] + p1[1] + p2[1]) / 3;
  if (nx * midX + ny * midY > 0) {
    nx = -nx; ny = -ny; nz = -nz;
  }
  return [nx, ny, nz];
}

/**
 * Draw Tunnel Panels.
 */
function renderTunnelRings(run, matrices, platRGB, neonRGB, bgRGB) {
  gl.useProgram(tunnelProgram);

  setTunnelUniforms(matrices, mat4.create(), neonRGB, bgRGB, 0.0, 1.0);

  const vertices = [];
  const R = TUNNEL.RADIUS;

  for (const ring of run.activeRings) {
    const z0 = ring.zStart;
    const z1 = ring.zEnd;

    // Check if this is a transition funnel connecting two different N-gons
    if (ring.isTransition) {
      const NA = ring.numFacesStart;
      const NB = ring.numFacesEnd;

      // Build vertex loops for polygon A (at z0) and polygon B (at z1)
      const loopA = [];
      for (let i = 0; i <= NA; i++) {
        const a = -Math.PI / 2 + i * (TWO_PI / NA);
        loopA.push([R * Math.cos(a), R * Math.sin(a), z0, a]);
      }
      const loopB = [];
      for (let j = 0; j <= NB; j++) {
        const b = -Math.PI / 2 + j * (TWO_PI / NB);
        loopB.push([R * Math.cos(b), R * Math.sin(b), z1, b]);
      }

      let i = 0, j = 0;
      while (i < NA || j < NB) {
        const pA0 = loopA[i];
        const pB0 = loopB[j];

        if (i === NA) {
          const pB1 = loopB[j + 1];
          const norm = calcTriInwardNormal(pA0, pB1, pB0);
          addTri(vertices, pA0, pB1, pB0, norm[0], norm[1], norm[2], platRGB);
          j++;
        } else if (j === NB) {
          const pA1 = loopA[i + 1];
          const norm = calcTriInwardNormal(pA0, pA1, pB0);
          addTri(vertices, pA0, pA1, pB0, norm[0], norm[1], norm[2], platRGB);
          i++;
        } else {
          const nextA = loopA[i + 1][3];
          const nextB = loopB[j + 1][3];
          if (nextA <= nextB) {
            const pA1 = loopA[i + 1];
            const norm = calcTriInwardNormal(pA0, pA1, pB0);
            addTri(vertices, pA0, pA1, pB0, norm[0], norm[1], norm[2], platRGB);
            i++;
          } else {
            const pB1 = loopB[j + 1];
            const norm = calcTriInwardNormal(pA0, pB1, pB0);
            addTri(vertices, pA0, pB1, pB0, norm[0], norm[1], norm[2], platRGB);
            j++;
          }
        }
      }
      continue;
    }

    // Standard Polygonal Tunnel Ring (N faces)
    const N = ring.numFaces || TUNNEL.FACES;
    const dPhi = TWO_PI / N;

    for (let f = 0; f < N; f++) {
      if (!ring.facesSolid[f]) continue; // Absent face reveals starfield

      const a0 = -Math.PI / 2 + f * dPhi - dPhi / 2;
      const a1 = -Math.PI / 2 + f * dPhi + dPhi / 2;

      const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
      const cos1 = Math.cos(a1), sin1 = Math.sin(a1);

      const midAngle = (a0 + a1) / 2;
      const nx = -Math.cos(midAngle);
      const ny = -Math.sin(midAngle);
      const nz = 0;

      const p0 = [R * cos0, R * sin0, z0];
      const p1 = [R * cos1, R * sin1, z0];
      const p2 = [R * cos1, R * sin1, z1];
      const p3 = [R * cos0, R * sin0, z1];

      addQuad(vertices, p0, p1, p2, p3, nx, ny, nz, platRGB);
    }
  }

  if (vertices.length === 0) return;

  gl.bindBuffer(gl.ARRAY_BUFFER, tunnelVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  setupTunnelAttribs();
  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 11);
  disableTunnelAttribs();
}

/**
 * Draw 3D Hazards & Pickups on tunnel faces.
 */
function renderHazardsAndPickups(run, matrices, time, neonRGB, bgRGB) {
  gl.useProgram(tunnelProgram);
  setTunnelUniforms(matrices, mat4.create(), neonRGB, bgRGB, 0.0, 1.0);

  const hazardVerts = [];

  for (const ring of run.activeRings) {
    if (ring.isTransition) continue; // Transition funnels are hazard-free safe passages

    const N = ring.numFaces || TUNNEL.FACES;
    const dPhi = TWO_PI / N;
    const R = ring.apothem || (TUNNEL.RADIUS * Math.cos(Math.PI / N));

    // Spikes
    for (const h of ring.hazards) {
      if (!h.active) continue;
      const angle = -Math.PI / 2 + (h.face % N) * dPhi;
      const baseX = R * Math.cos(angle);
      const baseY = R * Math.sin(angle);
      const tipX = (R - 0.7) * Math.cos(angle);
      const tipY = (R - 0.7) * Math.sin(angle);

      const redRGB = [1.0, 0.18, 0.18];
      const zCenter = h.z;
      const w = 0.32;

      const p0 = [baseX - Math.sin(angle) * w, baseY + Math.cos(angle) * w, zCenter - w];
      const p1 = [baseX + Math.sin(angle) * w, baseY - Math.cos(angle) * w, zCenter - w];
      const p2 = [baseX, baseY, zCenter + w];
      const tip = [tipX, tipY, zCenter];

      addTri(hazardVerts, p0, p1, tip, 0, 0, 1, redRGB);
      addTri(hazardVerts, p1, p2, tip, 1, 0, 0, redRGB);
      addTri(hazardVerts, p2, p0, tip, -1, 0, 0, redRGB);
    }

    // Collectibles (rotating crystals - rendered at exact 3D coordinates)
    for (const c of ring.collectibles) {
      if (!c.active) continue;
      const angle = -Math.PI / 2 + (c.face % N) * dPhi;
      const floatR = R - 0.6;
      const cx = c.x !== undefined ? c.x : floatR * Math.cos(angle);
      const cy = c.y !== undefined ? c.y : floatR * Math.sin(angle);
      const cz = c.z;
      const cyanMintRGB = [0.0, 1.0, 0.85];

      addOctahedron(hazardVerts, cx, cy, cz, 0.22, cyanMintRGB);
    }

    // Power-ups (floating powerup cubes)
    for (const p of ring.powerupItems) {
      if (!p.active) continue;
      const def = POWERUP_REGISTRY[p.powerupId];
      const colorRGB = hexToRGB(def?.color || '#ff00ff');
      const angle = -Math.PI / 2 + (p.face % N) * dPhi;
      const floatR = R - 0.75;
      const px = floatR * Math.cos(angle);
      const py = floatR * Math.sin(angle);
      const pz = p.z;

      addOctahedron(hazardVerts, px, py, pz, 0.32, colorRGB);
    }
  }

  if (hazardVerts.length === 0) return;

  gl.bindBuffer(gl.ARRAY_BUFFER, tunnelVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(hazardVerts), gl.DYNAMIC_DRAW);

  setupTunnelAttribs();
  gl.drawArrays(gl.TRIANGLES, 0, hazardVerts.length / 11);
  disableTunnelAttribs();
}

/**
 * Render the animated 3D character "Ion" with scuttling gait, squash-and-stretch, and body momentum.
 */
function renderPlayer3D(run, matrices, time, bgRGB) {
  gl.useProgram(tunnelProgram);

  const cosmetics = getEquippedCosmetics();
  const coreRGB = hexToRGB(cosmetics.colorHex || '#00f0ff');
  const eyeWhite = [1.0, 1.0, 1.0];
  const legColor = [coreRGB[0] * 0.75, coreRGB[1] * 0.75, coreRGB[2] * 0.75];

  // Active power-up rim contour accent color (fine luminous silhouette edge)
  let powerupRimColor = coreRGB;
  if (run.activePowerups.has('prismaShield')) {
    powerupRimColor = [0.0, 0.9, 1.0]; // Bright cyan rim
  } else if (run.activePowerups.has('fragmentMagnet')) {
    powerupRimColor = [0.0, 1.0, 0.75]; // Mint green rim
  } else if (run.activePowerups.has('velocitySurge')) {
    powerupRimColor = [1.0, 0.6, 0.1]; // Amber rim
  } else if (run.activePowerups.has('gravityField')) {
    powerupRimColor = [0.8, 0.45, 1.0]; // Violet rim
  } else if (run.activePowerups.has('doubleJump')) {
    powerupRimColor = [1.0, 0.85, 0.2]; // Golden rim
  }

  // Spectral Phase transparency: smooth 35% - 48% opacity (low alpha blending)
  let alpha = 1.0;
  if (run.activePowerups.has('spectralPhase')) {
    alpha = 0.40 + Math.sin(time * 6) * 0.08;
  }

  // Animation parameters
  const isRunning = run.isGrounded && !run.isDead;
  const isJumping = run.isJumping || (!run.isGrounded && !run.isFallingInVoid);
  const isFalling = run.isFallingInVoid;

  // Sincronização direta e contínua entre taxa de animação e velocidade real (v):
  // A fase é indexada ao deslocamento real Z: cada passada corresponde a exatamente
  // um avanço físico no túnel, garantindo sincronização 1:1 e zero patinação.
  const strideLength = PLAYER.STRIDE_LENGTH || 2.8;
  // animRate indica quantas vezes mais rápido que v0 estamos (para logging/debug)
  const animRate = (run.vz || PLAYER.BASE_SPEED) / PLAYER.BASE_SPEED;
  const stridePhase = isRunning
    ? (run.z / strideLength) * (Math.PI * 2)
    : time * 2.5; // Idle: gentle idle sway when not running

  // Debug: log animRate every 60 frames to confirm it matches movement speed
  if (!renderPlayer3D._logCounter) renderPlayer3D._logCounter = 0;
  renderPlayer3D._logCounter++;
  if (renderPlayer3D._logCounter % 60 === 0) {
    console.log(`[AnimDebug] animRate=${animRate.toFixed(3)}, vz=${(run.vz||0).toFixed(1)}, BASE_SPEED=${PLAYER.BASE_SPEED}, strideLength=${strideLength}, isRunning=${isRunning}, stridePhase=${stridePhase.toFixed(2)}`);
  }

  // Squash & Stretch
  let scaleX = 1.0;
  let scaleY = 1.0;
  let scaleZ = 1.0;
  let bodyBob = 0.0;
  let bodyRoll = 0.0;
  let forwardPitch = 0.18; // Slight forward lean into sprint

  if (isRunning) {
    // Fast rhythmic scuttle compression
    const stepSquash = Math.abs(Math.sin(stridePhase));
    scaleY = 1.0 - stepSquash * 0.14;
    scaleX = 1.0 + stepSquash * 0.08;
    scaleZ = 1.0 + stepSquash * 0.06;
    bodyBob = stepSquash * 0.06;
    bodyRoll = Math.sin(stridePhase * 0.5) * 0.11; // Gentle side-to-side body rock
  } else if (isJumping) {
    // Airborne stretch
    scaleY = 1.25;
    scaleX = 0.84;
    scaleZ = 0.88;
    forwardPitch = 0.08;
  } else if (isFalling) {
    // Tumble in void
    bodyRoll = time * 5.0;
    forwardPitch = time * 4.0;
  } else {
    // Idle breathing
    scaleY = 1.0 + Math.sin(time * 3.5) * 0.04;
    scaleX = 1.0 - Math.sin(time * 3.5) * 0.03;
  }

  // Compute player center position in tunnel:
  // Center is elevated above current floor by (0.38 + bodyBob)
  const bodyElevation = 0.38 + bodyBob;
  const centerR = run.r - bodyElevation;

  // Player position in world space derived from continuous theta
  const px = centerR * Math.cos(run.theta);
  const py = centerR * Math.sin(run.theta);
  const pz = run.z;

  // Build model matrix for player
  const playerModel = mat4.create();
  // 1. Translate to player position in tunnel
  mat4.translate(playerModel, playerModel, [px, py, pz]);
  // 2. Rotate character model around Z axis so its UP vector aligns with the shared gravity angle!
  // In local space, +Y is UP (toward center). Rotating by gravityAngle + PI/2 aligns local +Y
  // with (-cos(gravityAngle), -sin(gravityAngle)), the exact radial gravity direction.
  const currentGravAngle = run.gravityAngle != null ? run.gravityAngle : (run.cameraRoll ?? -Math.PI / 2);
  mat4.rotateZ(playerModel, playerModel, currentGravAngle + Math.PI / 2);

  // Use powerupRimColor for uNeonColor to tint silhouette rim lighting
  setTunnelUniforms(matrices, playerModel, powerupRimColor, bgRGB, 1.0, alpha);

  // Mesh geometry in player local space:
  // Local axes:
  // +Z is forward along the track
  // +Y is UP (toward tunnel center)
  // +X is RIGHT (along the floor)
  const playerVerts = [];

  // 1. Torso/Head: Rounded faceted energy gem
  const bodyW = 0.28 * scaleX;
  const bodyH = 0.30 * scaleY;
  const bodyD = 0.32 * scaleZ;

  // Apply roll and forward pitch to body vertices
  buildAnimatedBody(playerVerts, bodyW, bodyH, bodyD, bodyRoll, forwardPitch, coreRGB);

  // 2. Glowing Eyes on front face (+Z)
  buildEyes(playerVerts, bodyW, bodyH, bodyD, forwardPitch, eyeWhite);

  // 3. Multi-support Scuttling Legs (6 legs: 3 left, 3 right)
  buildScuttlingLegs(playerVerts, stridePhase, isRunning, isJumping, isFalling, time, legColor, strideLength);

  // Upload and render main player mesh
  gl.bindBuffer(gl.ARRAY_BUFFER, playerVBO);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(playerVerts), gl.DYNAMIC_DRAW);

  setupTunnelAttribs();
  gl.drawArrays(gl.TRIANGLES, 0, playerVerts.length / 11);

  // Discrete, translucent power-up auras (alpha 28-35%, compact contour hugging character)
  if (run.activePowerups.has('prismaShield')) {
    const auraVerts = [];
    const shieldCyan = [0.0, 0.85, 1.0];
    const shieldSize = 0.35 + Math.sin(time * 4.0) * 0.015;
    addOctahedron(auraVerts, 0, 0, 0, shieldSize, shieldCyan);

    setTunnelUniforms(matrices, playerModel, shieldCyan, bgRGB, 0.0, 0.32);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(auraVerts), gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, auraVerts.length / 11);
  }

  if (run.activePowerups.has('fragmentMagnet')) {
    const magnetVerts = [];
    const magnetMint = [0.0, 1.0, 0.75];
    const ringRadius = 0.38 + Math.sin(time * 5.0) * 0.015;
    const segs = 8;
    for (let i = 0; i < segs; i++) {
      const a0 = (Math.PI * 2 / segs) * i;
      const a1 = (Math.PI * 2 / segs) * (i + 1);
      const x0 = Math.cos(a0) * ringRadius, z0 = Math.sin(a0) * ringRadius;
      const x1 = Math.cos(a1) * ringRadius, z1 = Math.sin(a1) * ringRadius;
      addTri(magnetVerts, [x0, 0.03, z0], [x1, 0.03, z1], [x0, -0.03, z0], 0, 1, 0, magnetMint);
      addTri(magnetVerts, [x1, 0.03, z1], [x1, -0.03, z1], [x0, -0.03, z0], 0, 1, 0, magnetMint);
    }
    setTunnelUniforms(matrices, playerModel, magnetMint, bgRGB, 0.0, 0.28);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(magnetVerts), gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES, 0, magnetVerts.length / 11);
  }

  disableTunnelAttribs();
}

/**
 * Build the rounded faceted crystalline body.
 */
function buildAnimatedBody(verts, w, h, d, roll, pitch, color) {
  // Apply pitch (rotation about X) and roll (rotation about Z) to local coordinates
  function transform(x, y, z) {
    // Pitch (lean forward)
    const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
    const y1 = y * cosP - z * sinP;
    const z1 = y * sinP + z * cosP;

    // Roll (wobble)
    const cosR = Math.cos(roll), sinR = Math.sin(roll);
    const x2 = x * cosR - y1 * sinR;
    const y2 = x * sinR + y1 * cosR;

    return [x2, y2, z1];
  }

  // 6 vertices of an elongated octahedron
  const top = transform(0, h, 0);
  const bot = transform(0, -h * 0.7, 0);
  const pFront = transform(0, 0, d);
  const pBack  = transform(0, 0, -d);
  const pRight = transform(w, 0, 0);
  const pLeft  = transform(-w, 0, 0);

  // 8 triangular facets
  addTri(verts, pFront, pRight, top, 0, 1, 1, color);
  addTri(verts, pRight, pBack,  top, 1, 1, 0, color);
  addTri(verts, pBack,  pLeft,  top, 0, 1, -1, color);
  addTri(verts, pLeft,  pFront, top, -1, 1, 0, color);

  addTri(verts, pRight, pFront, bot, 0, -1, 1, color);
  addTri(verts, pBack,  pRight, bot, 1, -1, 0, color);
  addTri(verts, pLeft,  pBack,  bot, 0, -1, -1, color);
  addTri(verts, pFront, pLeft,  bot, -1, -1, 0, color);
}

/**
 * Build glowing eyes on the front face of Ion.
 */
function buildEyes(verts, w, h, d, pitch, whiteColor) {
  const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
  const eyeZ = d * 0.85;
  const eyeY = h * 0.2;
  const eyeSpacing = w * 0.45;
  const eyeSize = 0.045;

  function eyePos(x, y, z) {
    return [x, y * cosP - z * sinP, y * sinP + z * cosP];
  }

  // Left Eye
  const lEye = eyePos(-eyeSpacing, eyeY, eyeZ);
  addOctahedron(verts, lEye[0], lEye[1], lEye[2], eyeSize, whiteColor);

  // Right Eye
  const rEye = eyePos(eyeSpacing, eyeY, eyeZ);
  addOctahedron(verts, rEye[0], rEye[1], rEye[2], eyeSize, whiteColor);
}

/**
 * Build multi-limb scuttling legs (6 legs) with alternating tripod gait.
 * Leg sweep amplitude is mathematically calibrated to match ground displacement.
 */
function buildScuttlingLegs(verts, stridePhase, isRunning, isJumping, isFalling, time, color, strideLength = 2.8) {
  // 6 legs: 3 on left (-X), 3 on right (+X)
  // Leg Z offsets: Front (+0.18), Mid (0.0), Back (-0.18)
  const legConfigs = [
    { side: -1, zOff: 0.16,  phaseOff: 0 },              // Left Front (Tripod A)
    { side:  1, zOff: 0.00,  phaseOff: 0 },              // Right Mid   (Tripod A)
    { side: -1, zOff: -0.16, phaseOff: 0 },              // Left Back   (Tripod A)
    { side:  1, zOff: 0.16,  phaseOff: Math.PI },        // Right Front (Tripod B)
    { side: -1, zOff: 0.00,  phaseOff: Math.PI },        // Left Mid    (Tripod B)
    { side:  1, zOff: -0.16, phaseOff: Math.PI },        // Right Back  (Tripod B)
  ];

  const legThickness = 0.035;

  for (const leg of legConfigs) {
    const hipX = leg.side * 0.16;
    const hipY = -0.12;
    const hipZ = leg.zOff;

    let footX = leg.side * 0.26;
    let footY = -0.36; // Floor level
    let footZ = leg.zOff;

    if (isRunning) {
      // Scuttle swing: forward Reach -> down to floor -> push back
      const phase = stridePhase + leg.phaseOff;
      // Amplitude calibrada para casar 1:1 com o deslocamento real da passada no chão do túnel
      const swingZ = Math.sin(phase) * (strideLength * 0.23);
      const liftY = Math.max(0, Math.cos(phase)) * 0.08;

      footZ += swingZ;
      footY += liftY;
    } else if (isJumping) {
      // Legs tucked inward during jump
      footX *= 0.65;
      footY = -0.22;
      footZ += (Math.random() - 0.5) * 0.02;
    } else if (isFalling) {
      // Flailing legs in void
      footX += Math.sin(time * 25 + leg.zOff * 10) * 0.15;
      footY += Math.cos(time * 20 + leg.zOff * 10) * 0.12;
      footZ += Math.sin(time * 22 + leg.side) * 0.15;
    }

    // Draw leg as an energy stilt/rod from hip to foot
    addQuad(
      verts,
      [hipX - legThickness, hipY, hipZ],
      [hipX + legThickness, hipY, hipZ],
      [footX + legThickness, footY, footZ],
      [footX - legThickness, footY, footZ],
      0, 1, 0,
      color
    );
  }
}

function setTunnelUniforms(matrices, model, neonRGB, bgRGB, isPlayer, alpha) {
  const uViewProj = gl.getUniformLocation(tunnelProgram, 'uViewProj');
  const uModel = gl.getUniformLocation(tunnelProgram, 'uModel');
  const uNeonColor = gl.getUniformLocation(tunnelProgram, 'uNeonColor');
  const uFogColor = gl.getUniformLocation(tunnelProgram, 'uFogColor');
  const uFogNear = gl.getUniformLocation(tunnelProgram, 'uFogNear');
  const uFogFar = gl.getUniformLocation(tunnelProgram, 'uFogFar');
  const uIsPlayer = gl.getUniformLocation(tunnelProgram, 'uIsPlayer');
  const uAlpha = gl.getUniformLocation(tunnelProgram, 'uAlpha');

  gl.uniformMatrix4fv(uViewProj, false, matrices.viewProj);
  gl.uniformMatrix4fv(uModel, false, model);
  gl.uniform3fv(uNeonColor, new Float32Array(neonRGB));
  gl.uniform3fv(uFogColor, new Float32Array(bgRGB));
  gl.uniform1f(uFogNear, 10.0);
  gl.uniform1f(uFogFar, 110.0);
  gl.uniform1f(uIsPlayer, isPlayer);
  gl.uniform1f(uAlpha, alpha);
}

function addQuad(verts, p0, p1, p2, p3, nx, ny, nz, color) {
  addVertex(verts, p0, nx, ny, nz, 0, 0, color);
  addVertex(verts, p1, nx, ny, nz, 1, 0, color);
  addVertex(verts, p2, nx, ny, nz, 1, 1, color);

  addVertex(verts, p0, nx, ny, nz, 0, 0, color);
  addVertex(verts, p2, nx, ny, nz, 1, 1, color);
  addVertex(verts, p3, nx, ny, nz, 0, 1, color);
}

function addTri(verts, p0, p1, p2, nx, ny, nz, color) {
  addVertex(verts, p0, nx, ny, nz, 0, 0, color);
  addVertex(verts, p1, nx, ny, nz, 1, 0, color);
  addVertex(verts, p2, nx, ny, nz, 0.5, 1, color);
}

function addVertex(verts, pos, nx, ny, nz, u, v, color) {
  verts.push(
    pos[0], pos[1], pos[2],
    nx, ny, nz,
    u, v,
    color[0], color[1], color[2]
  );
}

function addOctahedron(verts, cx, cy, cz, size, color) {
  const top = [cx, cy + size, cz];
  const bot = [cx, cy - size, cz];
  const p0 = [cx - size, cy, cz - size];
  const p1 = [cx + size, cy, cz - size];
  const p2 = [cx + size, cy, cz + size];
  const p3 = [cx - size, cy, cz + size];

  addTri(verts, p0, p1, top, 0, 1, 0, color);
  addTri(verts, p1, p2, top, 0, 1, 0, color);
  addTri(verts, p2, p3, top, 0, 1, 0, color);
  addTri(verts, p3, p0, top, 0, 1, 0, color);

  addTri(verts, p1, p0, bot, 0, -1, 0, color);
  addTri(verts, p2, p1, bot, 0, -1, 0, color);
  addTri(verts, p3, p2, bot, 0, -1, 0, color);
  addTri(verts, p0, p3, bot, 0, -1, 0, color);
}

function setupTunnelAttribs() {
  const stride = 44; // 11 floats * 4 bytes
  const aPos = gl.getAttribLocation(tunnelProgram, 'aPosition');
  const aNorm = gl.getAttribLocation(tunnelProgram, 'aNormal');
  const aUV = gl.getAttribLocation(tunnelProgram, 'aUV');
  const aCol = gl.getAttribLocation(tunnelProgram, 'aColor');

  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, stride, 0);

  gl.enableVertexAttribArray(aNorm);
  gl.vertexAttribPointer(aNorm, 3, gl.FLOAT, false, stride, 12);

  gl.enableVertexAttribArray(aUV);
  gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, stride, 24);

  gl.enableVertexAttribArray(aCol);
  gl.vertexAttribPointer(aCol, 3, gl.FLOAT, false, stride, 32);
}

function disableTunnelAttribs() {
  const aPos = gl.getAttribLocation(tunnelProgram, 'aPosition');
  const aNorm = gl.getAttribLocation(tunnelProgram, 'aNormal');
  const aUV = gl.getAttribLocation(tunnelProgram, 'aUV');
  const aCol = gl.getAttribLocation(tunnelProgram, 'aColor');

  gl.disableVertexAttribArray(aPos);
  gl.disableVertexAttribArray(aNorm);
  gl.disableVertexAttribArray(aUV);
  gl.disableVertexAttribArray(aCol);
}
