// audio.js — Web Audio API wrapper with procedural sound generation.
// Single AudioContext, master gain + separate music/SFX buses.

import { AUDIO_CONFIG } from '../core/config.js';
import { ProceduralMusicEngine } from './proceduralMusic.js';

let audioCtx = null;
let masterGain = null;
let sfxGain = null;
let musicGain = null;
let initialized = false;
let musicEngine = null;

// Memoize tone buffers to avoid regenerating identical sounds
const toneCache = new Map();

/**
 * Initialize the audio system. Must be called from a user gesture.
 */
export function initAudio() {
  if (initialized) return;

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    masterGain = audioCtx.createGain();
    masterGain.gain.value = AUDIO_CONFIG.MASTER_VOLUME;
    masterGain.connect(audioCtx.destination);

    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = AUDIO_CONFIG.SFX_VOLUME;
    sfxGain.connect(masterGain);

    musicGain = audioCtx.createGain();
    musicGain.gain.value = AUDIO_CONFIG.MUSIC_VOLUME;
    musicGain.connect(masterGain);

    musicEngine = new ProceduralMusicEngine();
    musicEngine.init(audioCtx, musicGain);

    initialized = true;
  } catch (e) {
    console.warn('Web Audio API unavailable:', e);
  }
}

/**
 * Resume audio context (required after user gesture on some browsers).
 */
export function resumeAudio() {
  if (!initialized) {
    initAudio();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

/**
 * Set volume for a bus.
 * @param {'master' | 'sfx' | 'music'} bus
 * @param {number} value 0..1
 */
export function setVolume(bus, value) {
  if (!initialized) return;
  const v = Math.max(0, Math.min(1, value));
  switch (bus) {
    case 'master': masterGain.gain.value = v; break;
    case 'sfx': sfxGain.gain.value = v; break;
    case 'music': musicGain.gain.value = v; break;
  }
}

export function getVolume(bus) {
  if (!initialized) return 0;
  switch (bus) {
    case 'master': return masterGain.gain.value;
    case 'sfx': return sfxGain.gain.value;
    case 'music': return musicGain.gain.value;
    default: return 0;
  }
}

/**
 * Play a procedurally generated tone.
 */
function playTone(freq, duration, type = 'sine', volume = 0.3, bus = 'sfx') {
  if (!initialized || !audioCtx) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  const targetGain = bus === 'music' ? musicGain : sfxGain;
  osc.connect(gain);
  gain.connect(targetGain);

  osc.start(now);
  osc.stop(now + duration + 0.05);
}

/**
 * Play a frequency sweep (ascending or descending).
 */
function playSweep(startFreq, endFreq, duration, type = 'sine', volume = 0.2) {
  if (!initialized || !audioCtx) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain);
  gain.connect(sfxGain);

  osc.start(now);
  osc.stop(now + duration + 0.05);
}

/**
 * Play noise burst (for impacts/explosions).
 */
function playNoise(duration = 0.1, volume = 0.15) {
  if (!initialized || !audioCtx) return;

  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 800;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);

  source.start();
}

// --- Public sound effect functions ---

export function playJump() {
  playTone(440, 0.12, 'sine', 0.2);
  playTone(660, 0.08, 'triangle', 0.1);
}

export function playDoubleJump() {
  playTone(550, 0.1, 'sine', 0.2);
  setTimeout(() => playTone(880, 0.1, 'triangle', 0.15), 50);
}

export function playLand() {
  playNoise(0.06, 0.1);
  playTone(120, 0.08, 'sine', 0.1);
}

export function playCollect() {
  playTone(880, 0.08, 'sine', 0.15);
  playTone(1100, 0.1, 'sine', 0.12);
}

export function playPowerupActivate() {
  playSweep(300, 1200, 0.3, 'sine', 0.2);
  playTone(800, 0.15, 'triangle', 0.1);
}

export function playPowerupWarning() {
  playTone(600, 0.1, 'square', 0.08);
  setTimeout(() => playTone(500, 0.1, 'square', 0.06), 150);
}

export function playPowerupExpire() {
  playSweep(800, 300, 0.2, 'sine', 0.15);
}

export function playShieldBreak() {
  // Crystal chime
  playTone(1200, 0.3, 'sine', 0.2);
  playTone(1500, 0.2, 'triangle', 0.15);
  playNoise(0.08, 0.12);
}

export function playHit() {
  playNoise(0.15, 0.25);
  playTone(100, 0.2, 'sawtooth', 0.15);
}

export function playDeath() {
  playNoise(0.3, 0.3);
  playSweep(400, 80, 0.5, 'sawtooth', 0.2);
}

export function playRecovery() {
  playSweep(200, 1000, 0.4, 'sine', 0.25);
  playTone(600, 0.3, 'triangle', 0.15);
}

export function playBiomeTransition() {
  playSweep(300, 900, 0.5, 'sine', 0.15);
  playSweep(200, 600, 0.6, 'triangle', 0.1);
}

export function playNewRecord() {
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, 'sine', 0.2), i * 100);
  });
}

export function playUIClick() {
  playTone(700, 0.05, 'sine', 0.1);
}

export function playDash() {
  playNoise(0.05, 0.15);
  playSweep(600, 1200, 0.1, 'sine', 0.15);
}

export function playScoreMultiplier() {
  // Quick arpeggio
  const notes = [523, 659, 784];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.12, 'sine', 0.12), i * 60);
  });
}

// --- Procedural Layered Music System ---

export function startBiomeMusic(biomeId) {
  if (musicEngine) {
    musicEngine.start(biomeId);
  }
}

export function updateMusicReactive(run) {
  if (musicEngine) {
    musicEngine.updateReactivity(run);
  }
}

export function setMusicBiome(biomeId) {
  if (musicEngine) {
    musicEngine.setBiome(biomeId, true);
  }
}

export function pauseMusic() {
  if (musicEngine) {
    musicEngine.pause();
  }
}

export function resumeMusic() {
  if (musicEngine) {
    musicEngine.resume();
  }
}

export function stopBiomeMusic() {
  if (musicEngine) {
    musicEngine.stop();
  }
}

// Aliases for backwards compatibility with previous callers
export const startBiomeDrone = startBiomeMusic;
export const stopBiomeDrone = stopBiomeMusic;

/**
 * Stop all audio (on cleanup).
 */
export function stopAllAudio() {
  stopBiomeMusic();
  if (audioCtx) {
    try { audioCtx.close(); } catch (_) {}
    audioCtx = null;
    musicEngine = null;
    initialized = false;
  }
}

export function isAudioInitialized() {
  return initialized;
}
