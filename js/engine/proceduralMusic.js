// proceduralMusic.js — 3-Layer Procedural Music Engine with Web Audio API.
// Features:
// (a) Rhythmic/percussive layer with filtered noise pulses & synthesized kick on a 16-step grid.
// (b) Sustained base/pad layer with warm detuned oscillators & biome chord progressions.
// (c) Melodic layer with procedural note selection within biome scales (Markov random walk).
// Uses lookahead scheduling (Chris Wilson pattern) via audioContext.currentTime.
// Reacts dynamically to run speed, distance, and smooth biome crossfades.

// Biome Musical Configurations
import { PLAYER } from '../core/config.js';

export const BIOME_MUSIC_PROFILES = {
  aurora: {
    name: 'Setor Aurora',
    bpm: 108,
    rootFreq: 130.81, // C3
    // C Major Pentatonic / Lydian scale (frequencies across octaves 3, 4, 5)
    scale: [
      130.81, 146.83, 164.81, 196.00, 220.00, // C3, D3, E3, G3, A3
      261.63, 293.66, 329.63, 392.00, 440.00, // C4, D4, E4, G4, A4
      523.25, 587.33, 659.25, 783.99          // C5, D5, E5, G5
    ],
    // 4-Chord Progression (frequencies for 4-voice chords)
    chords: [
      [130.81, 196.00, 261.63, 329.63], // Cmaj (C3, G3, C4, E4)
      [110.00, 164.81, 220.00, 261.63], // Amin (A2, E3, A3, C4)
      [87.31,  130.81, 174.61, 261.63], // Fmaj (F2, C3, F3, C4)
      [98.00,  146.83, 196.00, 293.66], // Gmaj (G2, D3, G3, D4)
    ],
    rhythmStyle: 'steady',
    padType: 'triangle',
    filterFreq: 1100,
  },

  currentV: {
    name: 'Corrente-V',
    bpm: 132,
    rootFreq: 146.83, // D3
    // D Dorian scale (fast cyberpunk feel)
    scale: [
      146.83, 164.81, 174.61, 196.00, 220.00, 246.94, 261.63, // D3, E3, F3, G3, A3, B3, C4
      293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, // D4, E4, F4, G4, A4, B4, C5
      587.33, 659.25                                           // D5, E5
    ],
    chords: [
      [146.83, 220.00, 293.66, 349.23], // Dmin (D3, A3, D4, F4)
      [174.61, 220.00, 261.63, 349.23], // Fmaj (F3, A3, C4, F4)
      [196.00, 246.94, 293.66, 392.00], // Gmaj (G3, B3, D4, G4)
      [116.54, 174.61, 233.08, 293.66], // Bbmaj (Bb2, F3, Bb3, D4)
    ],
    rhythmStyle: 'driving',
    padType: 'sawtooth',
    filterFreq: 1400,
  },

  debris: {
    name: 'Cinturão de Destroços',
    bpm: 122,
    rootFreq: 82.41, // E2
    // E Phrygian (dark, intense, industrial)
    scale: [
      82.41,  87.31,  98.00,  110.00, 123.47, 130.81, 146.83, // E2..
      164.81, 174.61, 196.00, 220.00, 246.94, 261.63, 293.66, // E3..
      329.63, 349.23, 392.00, 440.00                          // E4..
    ],
    chords: [
      [82.41, 123.47, 164.81, 196.00], // Emin (E2, B2, E3, G3)
      [87.31, 130.81, 174.61, 220.00], // Fmaj (bII - dramatic Phrygian tension)
      [73.42, 110.00, 146.83, 174.61], // Dmin (D2, A2, D3, F3)
      [82.41, 123.47, 164.81, 246.94], // Emin (E2, B2, E3, B3)
    ],
    rhythmStyle: 'industrial',
    padType: 'sawtooth',
    filterFreq: 850,
  },

  magnetic: {
    name: 'Deriva Magnética',
    bpm: 114,
    rootFreq: 110.00, // A2
    // A Mixolydian / Suspended scale (floating, hypnotic)
    scale: [
      110.00, 123.47, 138.59, 146.83, 164.81, 185.00, 196.00,
      220.00, 246.94, 277.18, 293.66, 329.63, 369.99, 392.00,
      440.00, 493.88
    ],
    chords: [
      [110.00, 164.81, 220.00, 246.94], // Asus2 (A2, E3, A3, B3)
      [92.50,  138.59, 164.81, 220.00], // F#m7 (F#2, C#3, E3, A3)
      [73.42,  110.00, 146.83, 220.00], // Dsus2 (D2, A2, D3, A3)
      [82.41,  123.47, 164.81, 246.94], // E (E2, B2, E3, B3)
    ],
    rhythmStyle: 'syncopated',
    padType: 'sine',
    filterFreq: 1200,
  },

  nullZone: {
    name: 'Zona Nula',
    bpm: 94,
    rootFreq: 155.56, // Eb3
    // Eb Lydian (dreamy, floating zero-G)
    scale: [
      155.56, 174.61, 196.00, 233.08, 261.63,
      311.13, 349.23, 392.00, 466.16, 523.25,
      622.25, 698.46, 783.99
    ],
    chords: [
      [155.56, 196.00, 233.08, 293.66], // Ebmaj7 (Eb3, G3, Bb3, D4)
      [98.00,  146.83, 174.61, 233.08], // Gm7 (G2, D3, F3, Bb3)
      [103.83, 155.56, 207.65, 261.63], // Abmaj7 (Ab2, Eb3, Ab3, C4)
      [116.54, 174.61, 233.08, 293.66], // Bb (Bb2, F3, Bb3, D4)
    ],
    rhythmStyle: 'minimal',
    padType: 'triangle',
    filterFreq: 1300,
  },

  abyssPrisma: {
    name: 'Abismo Prisma',
    bpm: 126,
    rootFreq: 123.47, // B2
    // B Harmonic Minor (tense, dark, dramatic)
    scale: [
      123.47, 138.59, 146.83, 164.81, 185.00, 196.00, 233.08,
      246.94, 277.18, 293.66, 329.63, 369.99, 392.00, 466.16,
      493.88, 554.37
    ],
    chords: [
      [123.47, 185.00, 246.94, 293.66], // Bmin (B2, F#3, B3, D4)
      [98.00,  146.83, 196.00, 246.94], // Gmaj (G2, D3, G3, B3)
      [82.41,  123.47, 164.81, 196.00], // Emin (E2, B2, E3, G3)
      [92.50,  138.59, 174.61, 233.08], // F#7 (F#2, C#3, F3, A#3)
    ],
    rhythmStyle: 'driving',
    padType: 'sawtooth',
    filterFreq: 950,
  },

  pulsarCore: {
    name: 'Núcleo Pulsar',
    bpm: 138,
    rootFreq: 110.00, // A2
    // A Bright Cyberpunk Hexatonic (euphoric high-speed electronic)
    scale: [
      110.00, 130.81, 146.83, 164.81, 196.00, 220.00,
      261.63, 293.66, 329.63, 392.00, 440.00, 523.25,
      587.33, 659.25, 783.99, 880.00
    ],
    chords: [
      [110.00, 164.81, 220.00, 261.63], // Amin
      [130.81, 196.00, 261.63, 329.63], // Cmaj
      [146.83, 196.00, 220.00, 293.66], // Dsus4
      [87.31,  130.81, 174.61, 220.00], // Fmaj7
    ],
    rhythmStyle: 'intense',
    padType: 'sawtooth',
    filterFreq: 1500,
  },
};

export class ProceduralMusicEngine {
  constructor() {
    this.audioCtx = null;
    this.outputGain = null; // Master music bus

    // Layer sub-buses
    this.rhythmGain = null;
    this.padGain = null;
    this.melodyGain = null;

    // Scheduler state
    this.isPlaying = false;
    this.timerId = null;
    this.nextNoteTime = 0;
    this.currentStep = 0; // 16th note step (0 to 63)
    this.lookaheadMs = 25; // Check every 25ms
    this.scheduleAheadTime = 0.12; // 120ms lookahead window

    // Active musical state
    this.currentBiomeId = 'aurora';
    this.profile = BIOME_MUSIC_PROFILES.aurora;
    this.currentTempo = 108;
    this.targetTempo = 108;
    this.tempoBonus = 0;

    // Melodic procedural state
    this.melodyIndex = 4; // Start in mid register
    this.melodyDensity = 0.40; // Probability of melody note per 16th step
    this.rhythmIntensity = 0.50;

    // Active sustained pad nodes to allow crossfade
    this.activePadNodes = [];

    // Precomputed shared white noise buffer for crisp percussion
    this.noiseBuffer = null;
  }

  /**
   * Initialize with AudioContext and parent music GainNode.
   */
  init(audioCtx, parentMusicGain) {
    this.audioCtx = audioCtx;
    this.outputGain = parentMusicGain;

    // Create 3 layer gain nodes
    this.rhythmGain = audioCtx.createGain();
    this.rhythmGain.gain.value = 0.65;
    this.rhythmGain.connect(this.outputGain);

    this.padGain = audioCtx.createGain();
    this.padGain.gain.value = 0.50;
    this.padGain.connect(this.outputGain);

    this.melodyGain = audioCtx.createGain();
    this.melodyGain.gain.value = 0.55;
    this.melodyGain.connect(this.outputGain);

    // Build 2-second white noise buffer for percussions
    const bufferSize = audioCtx.sampleRate * 2;
    this.noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  /**
   * Start or switch to a biome's music.
   */
  start(biomeId = 'aurora') {
    if (!this.audioCtx) return;

    this.setBiome(biomeId, false);

    if (!this.isPlaying) {
      this.isPlaying = true;
      this.currentStep = 0;
      this.nextNoteTime = this.audioCtx.currentTime + 0.05;
      this.timerId = setInterval(() => this.scheduleLoop(), this.lookaheadMs);
    }
  }

  /**
   * Smoothly switch the active biome with crossfade.
   */
  setBiome(biomeId, crossfade = true) {
    const newProfile = BIOME_MUSIC_PROFILES[biomeId] || BIOME_MUSIC_PROFILES.aurora;
    this.currentBiomeId = biomeId;
    this.profile = newProfile;
    this.targetTempo = newProfile.bpm;

    if (!crossfade) {
      this.currentTempo = newProfile.bpm;
    }
  }

  /**
   * Master Lookahead Scheduler Loop.
   * Runs every ~25ms. Schedules audio events ahead in time on audioCtx.currentTime.
   */
  scheduleLoop() {
    if (!this.isPlaying || !this.audioCtx) return;

    // Smoothly glide tempo toward target
    this.currentTempo += (this.targetTempo + this.tempoBonus - this.currentTempo) * 0.04;

    const secondsPerStep = (60.0 / this.currentTempo) / 4; // 16th note

    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.nextNoteTime, this.currentStep);
      this.nextNoteTime += secondsPerStep;
      this.currentStep = (this.currentStep + 1) % 64; // 4-bar master loop
    }
  }

  /**
   * Schedule audio events for a single 16th note step.
   * @param {number} time - Exact audioCtx.currentTime to trigger events
   * @param {number} step - Current step (0 to 63)
   */
  scheduleStep(time, step) {
    const stepInBar = step % 16;
    const barIndex = Math.floor(step / 16);

    // --- (a) RHYTHMIC / PERCUSSIVE LAYER ---
    this.scheduleRhythm(time, stepInBar, this.profile.rhythmStyle);

    // --- (b) BASE / PAD LAYER ---
    // Trigger sustained chord at the start of each bar (every 16 steps)
    if (stepInBar === 0) {
      const chordIndex = barIndex % this.profile.chords.length;
      const chord = this.profile.chords[chordIndex];
      const barDuration = (60.0 / this.currentTempo) * 4;
      this.schedulePadChord(time, chord, barDuration);
    }

    // --- (c) MELODIC LAYER ---
    this.scheduleMelody(time, stepInBar);
  }

  /**
   * Synthesize rhythmic pulses on a 16-step grid.
   */
  scheduleRhythm(time, step, style) {
    const intensity = this.rhythmIntensity;

    switch (style) {
      case 'driving': // Current-V & Abyss Prisma (Fast 4-on-the-floor / driving)
        if (step === 0 || step === 4 || step === 8 || step === 12) {
          this.playKick(time, 1.0);
        }
        if (step === 4 || step === 12) {
          this.playSnare(time, 0.7);
        }
        // Continuous sixteenth hi-hats
        if (step % 2 === 0 || intensity > 0.6) {
          this.playHiHat(time, step === 2 || step === 10);
        }
        break;

      case 'industrial': // Debris (Gritty syncopated beats)
        if (step === 0 || step === 6 || step === 10) {
          this.playKick(time, 0.9);
        }
        if (step === 4 || step === 12) {
          this.playSnare(time, 0.85);
        }
        if (step % 2 === 1) {
          this.playHiHat(time, step === 7 || step === 15);
        }
        break;

      case 'syncopated': // Magnetic Drift
        if (step === 0 || step === 7 || step === 10) {
          this.playKick(time, 0.8);
        }
        if (step === 4 || step === 12) {
          this.playSnare(time, 0.65);
        }
        if (step % 2 === 0) {
          this.playHiHat(time, step === 6 || step === 14);
        }
        break;

      case 'minimal': // Null Zone (Soft, sparse, floating zero-G)
        if (step === 0) {
          this.playKick(time, 0.65);
        }
        if (step === 8) {
          this.playSnare(time, 0.4);
        }
        if (step === 4 || step === 12) {
          this.playHiHat(time, false, 0.2);
        }
        break;

      case 'intense': // Pulsar Core
        if (step === 0 || step === 4 || step === 8 || step === 12 || (intensity > 0.6 && step === 14)) {
          this.playKick(time, 1.0);
        }
        if (step === 4 || step === 12) {
          this.playSnare(time, 0.9);
        }
        this.playHiHat(time, step === 2 || step === 10, 0.4);
        break;

      case 'steady': // Aurora
      default:
        if (step === 0 || step === 8 || (intensity > 0.5 && step === 14)) {
          this.playKick(time, 0.85);
        }
        if (step === 4 || step === 12) {
          this.playSnare(time, 0.6);
        }
        if (step % 2 === 0) {
          this.playHiHat(time, step === 6 || step === 14);
        }
        break;
    }
  }

  /**
   * Synthesize Kick drum: pitch sweep sine burst.
   */
  playKick(time, gainScale = 1.0) {
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    // Punchy drop from 135Hz to 38Hz
    osc.frequency.setValueAtTime(135, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.08);

    const vol = 0.35 * gainScale;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    osc.connect(gain);
    gain.connect(this.rhythmGain);

    osc.start(time);
    osc.stop(time + 0.16);
  }

  /**
   * Synthesize Snare: filtered noise burst + tone body.
   */
  playSnare(time, gainScale = 1.0) {
    if (!this.noiseBuffer) return;

    // 1. Noise component
    const noise = this.audioCtx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1250, time);
    filter.Q.value = 1.2;

    const noiseGain = this.audioCtx.createGain();
    const vol = 0.22 * gainScale;
    noiseGain.gain.setValueAtTime(vol, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.rhythmGain);

    noise.start(time);
    noise.stop(time + 0.13);

    // 2. Tonal snap
    const osc = this.audioCtx.createOscillator();
    const toneGain = this.audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.05);

    toneGain.gain.setValueAtTime(0.12 * gainScale, time);
    toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    osc.connect(toneGain);
    toneGain.connect(this.rhythmGain);

    osc.start(time);
    osc.stop(time + 0.07);
  }

  /**
   * Synthesize Hi-Hat: crisp high-pass filtered noise click.
   */
  playHiHat(time, open = false, gainScale = 1.0) {
    if (!this.noiseBuffer) return;

    const noise = this.audioCtx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7200, time);

    const gain = this.audioCtx.createGain();
    const dur = open ? 0.08 : 0.035;
    const vol = (open ? 0.14 : 0.09) * gainScale;

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.rhythmGain);

    noise.start(time);
    noise.stop(time + dur + 0.02);
  }

  /**
   * Synthesize sustained chord pad with gentle warm detuned oscillators.
   */
  schedulePadChord(time, chordNotes, duration) {
    const profile = this.profile;
    const filterFreq = profile.filterFreq || 1100;
    const padType = profile.padType || 'triangle';

    // Crossfade: clean up prior chords
    this.activePadNodes = this.activePadNodes.filter(n => n.stopTime > this.audioCtx.currentTime);

    for (const freq of chordNotes) {
      // 2 detuned oscillators per note for stereo thickness
      for (const detune of [-4, 4]) {
        const osc = this.audioCtx.createOscillator();
        const filter = this.audioCtx.createBiquadFilter();
        const gain = this.audioCtx.createGain();

        osc.type = padType;
        osc.frequency.setValueAtTime(freq, time);
        osc.detune.setValueAtTime(detune, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, time);
        filter.Q.value = 1.5;

        // Envelope: soft attack, sustained body, gentle release
        const attack = 0.35;
        const release = 0.45;
        const targetVol = 0.038 / chordNotes.length;

        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(targetVol, time + attack);
        gain.gain.setValueAtTime(targetVol, time + duration - release);
        gain.gain.linearRampToValueAtTime(0.0001, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.padGain);

        osc.start(time);
        osc.stop(time + duration + 0.05);

        this.activePadNodes.push({ osc, gain, stopTime: time + duration + 0.05 });
      }
    }
  }

  /**
   * Procedural melody generator using Markov random walk in the biome scale.
   */
  scheduleMelody(time, stepInBar) {
    // Only trigger on select steps according to density
    // On downbeats (0, 4, 8, 12) higher chance; offbeats according to density
    const isDownbeat = (stepInBar % 4 === 0);
    const isOffbeat = (stepInBar % 2 === 0);

    let chance = this.melodyDensity;
    if (isDownbeat) chance = Math.min(0.9, chance * 1.5);
    else if (!isOffbeat) chance = chance * 0.5; // sixteenth notes sparser

    if (Math.random() > chance) return;

    const scale = this.profile.scale;
    if (!scale || scale.length === 0) return;

    // Markov Random Walk with anchor to chord tones
    const rand = Math.random();
    if (rand < 0.25) {
      // Step up
      this.melodyIndex = Math.min(scale.length - 1, this.melodyIndex + 1);
    } else if (rand < 0.50) {
      // Step down
      this.melodyIndex = Math.max(0, this.melodyIndex - 1);
    } else if (rand < 0.70) {
      // Skip step (jump 2)
      const dir = Math.random() < 0.5 ? 2 : -2;
      this.melodyIndex = Math.max(0, Math.min(scale.length - 1, this.melodyIndex + dir));
    } else if (rand < 0.85) {
      // Stay on same note (re-trigger)
    } else {
      // Harmonic anchor: reset to middle root / 5th
      this.melodyIndex = Math.floor(scale.length / 2);
    }

    const noteFreq = scale[this.melodyIndex];
    const duration = (60.0 / this.currentTempo) / 4 * (Math.random() < 0.4 ? 1.8 : 0.9);

    this.playMelodyNote(time, noteFreq, duration);
  }

  /**
   * Synthesize a single melodic note with glowing crystal timbre.
   */
  playMelodyNote(time, freq, duration) {
    const osc = this.audioCtx.createOscillator();
    const filter = this.audioCtx.createBiquadFilter();
    const gain = this.audioCtx.createGain();

    // Warm square or triangle with dynamic lowpass
    osc.type = Math.random() < 0.3 ? 'square' : 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, time);
    filter.frequency.exponentialRampToValueAtTime(800, time + duration);
    filter.Q.value = 2.0;

    // Fast pluck attack, smooth exponential decay
    const vol = 0.08;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.melodyGain);

    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  /**
   * Update music reactivity based on player's speed, distance, and powerups.
   * Called every frame in game loop.
   */
  updateReactivity(run) {
    if (!this.isPlaying) return;

    // 1. Tempo increases slightly with distance and forward speed
    const distFactor = Math.min(1.0, run.distance / 1200);
    const speedRatio = Math.max(0.8, Math.min(1.6, run.vz / PLAYER.BASE_SPEED));
    this.tempoBonus = distFactor * 14 + (speedRatio - 1.0) * 16;

    // 2. Melody density increases with run progress
    this.melodyDensity = 0.32 + distFactor * 0.38;

    // 3. Rhythm intensity increases with speed & distance
    this.rhythmIntensity = 0.40 + distFactor * 0.50;

    // 4. Powerup responsiveness
    if (run.activePowerups?.has('velocitySurge')) {
      this.tempoBonus += 12;
      this.rhythmIntensity = 1.0;
    }
  }

  /**
   * Pause music.
   */
  pause() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isPlaying = false;
    // Fade out smoothly
    if (this.rhythmGain && this.audioCtx) {
      this.rhythmGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.05);
      this.padGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.05);
      this.melodyGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.05);
    }
  }

  /**
   * Resume music from pause.
   */
  resume() {
    if (!this.audioCtx) return;
    if (this.rhythmGain) {
      this.rhythmGain.gain.setTargetAtTime(0.65, this.audioCtx.currentTime, 0.1);
      this.padGain.gain.setTargetAtTime(0.50, this.audioCtx.currentTime, 0.1);
      this.melodyGain.gain.setTargetAtTime(0.55, this.audioCtx.currentTime, 0.1);
    }
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.nextNoteTime = this.audioCtx.currentTime + 0.05;
      this.timerId = setInterval(() => this.scheduleLoop(), this.lookaheadMs);
    }
  }

  /**
   * Stop all music and cleanup.
   */
  stop() {
    this.pause();
    this.activePadNodes.forEach(({ osc, gain }) => {
      try { osc.stop(); gain.disconnect(); } catch (_) {}
    });
    this.activePadNodes = [];
  }
}
