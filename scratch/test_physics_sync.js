// test_physics_sync.js - Verify movement velocity and animation synchronization
import { PLAYER, DIFFICULTY, TUNNEL } from '../js/core/config.js';
import { createRunState } from '../js/core/state.js';
import { updatePlayerPhysics } from '../js/engine/physics.js';

console.log('--- Config Verification ---');
console.log('PLAYER.BASE_SPEED (v0):', PLAYER.BASE_SPEED);
console.log('PLAYER.SPEED_CAP_MULTIPLIER:', PLAYER.SPEED_CAP_MULTIPLIER);
console.log('PLAYER.STRIDE_LENGTH:', PLAYER.STRIDE_LENGTH);
console.log('DIFFICULTY.V_CAP_MULTIPLIER:', DIFFICULTY.V_CAP_MULTIPLIER);

const run = createRunState();
console.log('Initial run vz:', run.vz);

// Simulate 60 frames (1 second) of physics at dt = 1/60s
const dt = 1 / 60;
let prevZ = run.z;
for (let frame = 1; frame <= 60; frame++) {
  updatePlayerPhysics(run, dt);
}

const distTraveledIn1s = run.z - prevZ;
console.log(`Distance traveled in 1 second: ${distTraveledIn1s.toFixed(3)} units`);
console.log(`Current forward velocity: ${run.vz.toFixed(3)} units/s`);

// Calculate animation cycles and steps in 1s
const strideLength = PLAYER.STRIDE_LENGTH || 0.65;
const cyclesIn1s = distTraveledIn1s / strideLength;
const stepsIn1s = cyclesIn1s * 2; // 2 alternating tripod steps per cycle

console.log(`Stride cycles in 1 second: ${cyclesIn1s.toFixed(2)} cycles`);
console.log(`Leg steps in 1 second: ${stepsIn1s.toFixed(2)} steps`);
console.log(`Distance per step: ${(distTraveledIn1s / stepsIn1s).toFixed(3)} units`);
console.log(`Physical foot swing match: ${(distTraveledIn1s / stepsIn1s).toFixed(3)} units/step vs ${(strideLength * 0.46).toFixed(3)} units total foot sweep`);

if (Math.abs(distTraveledIn1s - PLAYER.BASE_SPEED) < 0.05) {
  console.log('SUCCESS: Forward velocity matches PLAYER.BASE_SPEED exactly!');
} else {
  console.error('MISMATCH: Distance in 1s does not match BASE_SPEED!');
}

console.log('Test completed.');
