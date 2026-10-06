// achievements.js — Achievement definitions, tracking, and notification queue.

import { loadSave, saveToDisk } from '../storage.js';

export const ACHIEVEMENTS = [
  {
    id: 'first_steps',
    title: 'Primeiro Salto',
    desc: 'Percorra seus primeiros 50 metros no túnel orbital.',
    icon: '🚀',
    check: (run, save) => run.distance >= 50,
  },
  {
    id: 'hyperspeed',
    title: 'Velocidade de Escape',
    desc: 'Ative a Sobrecarga de Velocidade no túnel.',
    icon: '⚡',
    check: (run, save) => run.activePowerups.has('velocitySurge'),
  },
  {
    id: 'shield_master',
    title: 'Defesa Absoluta',
    desc: 'Sobreviva a um impacto fatal usando o Escudo Prisma.',
    icon: '🛡️',
    check: (run, save) => !!run._shieldAbsorbedEvent,
  },
  {
    id: 'fragment_collector',
    title: 'Acumulador de Energia',
    desc: 'Colete 25 fragmentos em uma única corrida.',
    icon: '💎',
    check: (run, save) => run.fragmentsCollected >= 25,
  },
  {
    id: 'deep_space',
    title: 'Explorador do Vazio',
    desc: 'Atravesse e sobreviva até o Cinturão de Destroços.',
    icon: '🌌',
    check: (run, save) => run.currentBiome === 'debris',
  },
  {
    id: 'null_gravity_runner',
    title: 'Gravidade Zero',
    desc: 'Corra pela misteriosa Zona Nula.',
    icon: '🪐',
    check: (run, save) => run.currentBiome === 'nullZone',
  },
  {
    id: 'revived',
    title: 'Segunda Chance',
    desc: 'Seja salvo da destruição pelo Núcleo de Recuperação.',
    icon: '💖',
    check: (run, save) => !!run._recoveryEvent,
  },
  {
    id: 'legend_runner',
    title: 'Lenda do Prisma',
    desc: 'Alcance uma distância superior a 1.000 metros.',
    icon: '👑',
    check: (run, save) => run.distance >= 1000,
  },
];

let pendingNotifications = [];

/**
 * Check achievements against current run and global save state.
 * @returns {Array<object>} newly unlocked achievements
 */
export function evaluateAchievements(run) {
  const save = loadSave();
  if (!save.achievements) save.achievements = {};

  const unlockedNow = [];

  for (const ach of ACHIEVEMENTS) {
    if (save.achievements[ach.id]) continue;

    if (ach.check(run, save)) {
      save.achievements[ach.id] = {
        unlockedAt: Date.now(),
      };
      unlockedNow.push(ach);
      queueNotification(ach);
    }
  }

  if (unlockedNow.length > 0) {
    saveToDisk(save);
  }

  return unlockedNow;
}

function queueNotification(achievement) {
  pendingNotifications.push(achievement);
  showNextNotification();
}

let isShowingNotification = false;
function showNextNotification() {
  if (isShowingNotification || pendingNotifications.length === 0) return;

  isShowingNotification = true;
  const ach = pendingNotifications.shift();

  const container = document.getElementById('achievement-toast');
  if (container) {
    container.innerHTML = `
      <div class="toast-icon">${ach.icon}</div>
      <div class="toast-body">
        <div class="toast-label">CONQUISTA DESBLOQUEADA!</div>
        <div class="toast-title">${ach.title}</div>
        <div class="toast-desc">${ach.desc}</div>
      </div>
    `;
    container.classList.add('visible');

    setTimeout(() => {
      container.classList.remove('visible');
      setTimeout(() => {
        isShowingNotification = false;
        showNextNotification();
      }, 400);
    }, 3500);
  } else {
    isShowingNotification = false;
  }
}
