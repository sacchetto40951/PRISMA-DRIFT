// screens.js — Template generators and state rendering for all game screens.

import { formatScore, formatDistance } from '../systems/scoreSystem.js';
import { COSMETIC_COLORS, COSMETIC_TRAILS, equipCosmetic, getEquippedCosmetics } from '../systems/progression.js';
import { ACHIEVEMENTS } from '../systems/achievements.js';
import { getRecord, loadSave, getTodayString } from '../storage.js';
import { GAME_MODES } from '../core/config.js';

/**
 * Render Title Screen content.
 */
export function renderTitleScreen() {
  const save = loadSave();
  const endlessRec = getRecord(GAME_MODES.ENDLESS);

  return `
    <div class="screen-card title-card">
      <div class="title-logo-container">
        <h1 class="game-title">PRISMA DRIFT</h1>
        <p class="game-subtitle">CORRIDA ESPACIAL EM ALTA VELOCIDADE</p>
      </div>

      <div class="best-badge">
        <span class="badge-label">MELHOR DISTÂNCIA (INFINITO):</span>
        <span class="badge-value">${formatDistance(endlessRec.distance || 0)}</span>
      </div>

      <div class="menu-button-group">
        <button id="btn-play-quick" class="btn btn-primary pulse-btn">JOGAR AGORA</button>
        <button id="btn-select-mode" class="btn btn-secondary">MODOS DE JOGO</button>
        <button id="btn-open-hangar" class="btn btn-secondary">HANGAR & CONQUISTAS</button>
        <button id="btn-open-settings" class="btn btn-secondary">CONFIGURAÇÕES</button>
      </div>

      <div class="controls-hint">
        <span>[A/D ou Setas] Mover entre Faces</span> • <span>[Espaço/W] Pular</span> • <span>[P/Esc] Pausar</span>
      </div>
    </div>
  `;
}

/**
 * Render Mode Selection Screen content.
 */
export function renderModeSelectScreen() {
  const save = loadSave();
  const today = getTodayString();
  const dailyRecord = save.dailyRuns?.[today];

  return `
    <div class="screen-card mode-select-card">
      <h2 class="screen-title">SELECIONE O MODO</h2>
      <p class="screen-desc">Escolha sua missão pelo espaço orbital em colapso.</p>

      <div class="modes-grid">
        <div class="mode-item" data-mode="${GAME_MODES.ENDLESS}">
          <div class="mode-icon">🌌</div>
          <div class="mode-details">
            <div class="mode-header">
              <span class="mode-name">INFINITO (ENDLESS)</span>
              <span class="mode-record">Melhor: ${formatScore(save.records?.endless?.score || 0)}</span>
            </div>
            <p class="mode-info">Sobreviva o máximo possível em um percurso infinito de velocidade progressiva.</p>
          </div>
        </div>

        <div class="mode-item" data-mode="${GAME_MODES.NORMAL}">
          <div class="mode-icon">🎯</div>
          <div class="mode-details">
            <div class="mode-header">
              <span class="mode-name">NORMAL (EXPEDIÇÃO)</span>
              <span class="mode-record">Melhor: ${formatDistance(save.records?.normal?.distance || 0)}</span>
            </div>
            <p class="mode-info">Sequência curada de 7 biomas cósmicos com início, meio e linha de chegada.</p>
          </div>
        </div>

        <div class="mode-item" data-mode="${GAME_MODES.TIME_ATTACK}">
          <div class="mode-icon">⏱️</div>
          <div class="mode-details">
            <div class="mode-header">
              <span class="mode-name">CONTRA O TEMPO</span>
              <span class="mode-record">Melhor: ${formatScore(save.records?.timeAttack?.score || 0)}</span>
            </div>
            <p class="mode-info">Você tem 75 segundos. Corra no limite e colete fragmentos para maximizar a pontuação.</p>
          </div>
        </div>

        <div class="mode-item" data-mode="${GAME_MODES.CHALLENGE}">
          <div class="mode-icon">🔥</div>
          <div class="mode-details">
            <div class="mode-header">
              <span class="mode-name">DESAFIO BRUTAL</span>
              <span class="mode-record">Melhor: ${formatScore(save.records?.challenge?.score || 0)}</span>
            </div>
            <p class="mode-info">Obstáculos dobrados, sem power-ups defensivos. Apenas habilidade pura.</p>
          </div>
        </div>

        <div class="mode-item" data-mode="${GAME_MODES.DAILY}">
          <div class="mode-icon">📅</div>
          <div class="mode-details">
            <div class="mode-header">
              <span class="mode-name">CORRIDA DIÁRIA</span>
              <span class="mode-record">${dailyRecord ? `Hoje: ${formatScore(dailyRecord.score)}` : 'Não jogado hoje'}</span>
            </div>
            <p class="mode-info">Mesmo percurso gerado pela data de hoje (${today}). Compare seu recorde diário!</p>
          </div>
        </div>
      </div>

      <div class="screen-footer">
        <button id="btn-back-to-title" class="btn btn-secondary">VOLTAR AO MENU</button>
      </div>
    </div>
  `;
}

/**
 * Render Pause Screen.
 */
export function renderPauseScreen() {
  return `
    <div class="screen-card pause-card">
      <h2 class="screen-title">JOGO PAUSADO</h2>
      <p class="screen-desc">A corrida orbital foi suspensa temporariamente.</p>

      <div class="menu-button-group">
        <button id="btn-resume" class="btn btn-primary">RETOMAR</button>
        <button id="btn-restart-pause" class="btn btn-secondary">REINICIAR CORRIDA</button>
        <button id="btn-settings-pause" class="btn btn-secondary">CONFIGURAÇÕES</button>
        <button id="btn-quit-pause" class="btn btn-danger">SAIR PARA O MENU</button>
      </div>
    </div>
  `;
}

/**
 * Render Game Over Screen.
 */
export function renderGameOverScreen(run, isNewRecord) {
  return `
    <div class="screen-card gameover-card">
      <div class="gameover-header">
        <h2 class="gameover-title">CORRIDA ENCERRADA</h2>
        ${isNewRecord ? `<div class="record-banner">NOVO RECORDE PESSOAL!</div>` : ''}
      </div>

      <div class="stats-summary-grid">
        <div class="stat-box">
          <span class="stat-label">PONTUAÇÃO FINAL</span>
          <span class="stat-num glow-cyan">${formatScore(run.score)}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">DISTÂNCIA PERCORRIDA</span>
          <span class="stat-num">${formatDistance(run.distance)}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">FRAGMENTOS COLETADOS</span>
          <span class="stat-num glow-gold">+${run.fragmentsCollected}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">POWER-UPS UTILIZADOS</span>
          <span class="stat-num">${run.powerupsUsed}</span>
        </div>
      </div>

      <div class="menu-button-group horizontal-group">
        <button id="btn-retry" class="btn btn-primary pulse-btn">TENTAR NOVAMENTE [R]</button>
        <button id="btn-menu-from-gameover" class="btn btn-secondary">MENU PRINCIPAL</button>
      </div>
    </div>
  `;
}

/**
 * Render Results (Victory / Completion) Screen.
 */
export function renderResultsScreen(run, victoryTitle = 'MISSÃO CONCLUÍDA!') {
  return `
    <div class="screen-card results-card">
      <h2 class="screen-title glow-cyan">${victoryTitle}</h2>
      <p class="screen-desc">Você cruzou os setores orbitais com maestria!</p>

      <div class="stats-summary-grid">
        <div class="stat-box">
          <span class="stat-label">PONTUAÇÃO FINAL</span>
          <span class="stat-num glow-cyan">${formatScore(run.score)}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">DISTÂNCIA TOTAL</span>
          <span class="stat-num">${formatDistance(run.distance)}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">FRAGMENTOS GANHOS</span>
          <span class="stat-num glow-gold">+${run.fragmentsCollected}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">SETOR ALCANÇADO</span>
          <span class="stat-num">${run.currentBiome.toUpperCase()}</span>
        </div>
      </div>

      <div class="menu-button-group horizontal-group">
        <button id="btn-results-retry" class="btn btn-primary pulse-btn">JOGAR NOVAMENTE</button>
        <button id="btn-results-menu" class="btn btn-secondary">MENU PRINCIPAL</button>
      </div>
    </div>
  `;
}

/**
 * Render Settings Screen.
 */
export function renderSettingsScreen() {
  const save = loadSave();
  const s = save.settings || {};

  return `
    <div class="screen-card settings-card">
      <h2 class="screen-title">CONFIGURAÇÕES</h2>

      <div class="settings-group">
        <h3>ÁUDIO</h3>
        <div class="setting-row">
          <label for="slider-master-volume">Volume Geral:</label>
          <input type="range" id="slider-master-volume" min="0" max="1" step="0.05" value="${s.masterVolume ?? 0.7}">
          <span id="label-master-volume" class="range-val">${Math.round((s.masterVolume ?? 0.7) * 100)}%</span>
        </div>
        <div class="setting-row">
          <label for="slider-music-volume">Música / Drones:</label>
          <input type="range" id="slider-music-volume" min="0" max="1" step="0.05" value="${s.musicVolume ?? 0.5}">
          <span id="label-music-volume" class="range-val">${Math.round((s.musicVolume ?? 0.5) * 100)}%</span>
        </div>
        <div class="setting-row">
          <label for="slider-sfx-volume">Efeitos Sonoros (SFX):</label>
          <input type="range" id="slider-sfx-volume" min="0" max="1" step="0.05" value="${s.sfxVolume ?? 0.7}">
          <span id="label-sfx-volume" class="range-val">${Math.round((s.sfxVolume ?? 0.7) * 100)}%</span>
        </div>
      </div>

      <div class="settings-group">
        <h3>DESEMPENHO GRÁFICO</h3>
        <div class="setting-row">
          <label for="select-quality">Qualidade Visual:</label>
          <select id="select-quality">
            <option value="1.0" ${s.graphicsQuality === 1.0 ? 'selected' : ''}>Alta (Partículas & Glow Completo)</option>
            <option value="0.5" ${s.graphicsQuality === 0.5 ? 'selected' : ''}>Desempenho (Otimizado)</option>
          </select>
        </div>
      </div>

      <div class="settings-group">
        <h3>GERENCIAMENTO DE DADOS</h3>
        <div class="setting-row">
          <span>Apagar todos os recordes e progresso:</span>
          <button id="btn-reset-data" class="btn btn-danger btn-small">RESETAR PROGRESSO</button>
        </div>
      </div>

      <div class="screen-footer">
        <button id="btn-close-settings" class="btn btn-primary">SALVAR & VOLTAR</button>
      </div>
    </div>
  `;
}

/**
 * Render Hangar & Achievements Screen.
 */
export function renderHangarScreen() {
  const save = loadSave();
  const equipped = getEquippedCosmetics();
  const unlockedColors = save.unlocked?.colors || ['default'];
  const unlockedTrails = save.unlocked?.trails || ['default'];
  const userAchievements = save.achievements || {};

  return `
    <div class="screen-card hangar-card">
      <h2 class="screen-title">HANGAR & CONQUISTAS</h2>

      <div class="hangar-tabs">
        <button id="tab-cosmetics" class="tab-btn active">PERSONALIZAÇÃO</button>
        <button id="tab-achievements" class="tab-btn">CONQUISTAS</button>
      </div>

      <div id="hangar-content-cosmetics" class="hangar-section active">
        <div class="cosmetics-section">
          <h3>NÚCLEO DO ION (COR)</h3>
          <div class="cosmetics-grid">
            ${COSMETIC_COLORS.map(c => {
              const isUnlocked = unlockedColors.includes(c.id);
              const isEquipped = equipped.colorId === c.id;
              return `
                <div class="cosmetic-item ${isUnlocked ? 'unlocked' : 'locked'} ${isEquipped ? 'equipped' : ''}" data-cat="color" data-id="${c.id}">
                  <div class="color-preview" style="background-color: ${c.hex}"></div>
                  <span class="cosmetic-name">${c.name}</span>
                  ${isEquipped ? `<span class="badge-equipped">EM USO</span>` : 
                    isUnlocked ? `<button class="btn-equip btn-small">EQUIPAR</button>` :
                    `<span class="badge-locked">${c.reqType === 'distance' ? `${c.reqVal}m dist.` : `${c.reqVal} frag.`}</span>`}
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="cosmetics-section">
          <h3>ESTILO DE RASTRO</h3>
          <div class="cosmetics-grid">
            ${COSMETIC_TRAILS.map(t => {
              const isUnlocked = unlockedTrails.includes(t.id);
              const isEquipped = equipped.trailId === t.id;
              return `
                <div class="cosmetic-item ${isUnlocked ? 'unlocked' : 'locked'} ${isEquipped ? 'equipped' : ''}" data-cat="trail" data-id="${t.id}">
                  <span class="cosmetic-name">${t.name}</span>
                  ${isEquipped ? `<span class="badge-equipped">EM USO</span>` : 
                    isUnlocked ? `<button class="btn-equip btn-small">EQUIPAR</button>` :
                    `<span class="badge-locked">${t.reqType === 'distance' ? `${t.reqVal}m dist.` : `${t.reqVal} frag.`}</span>`}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <div id="hangar-content-achievements" class="hangar-section">
        <div class="achievements-list">
          ${ACHIEVEMENTS.map(a => {
            const isUnlocked = !!userAchievements[a.id];
            return `
              <div class="achievement-card ${isUnlocked ? 'achieved' : 'unachieved'}">
                <div class="ach-icon">${a.icon}</div>
                <div class="ach-info">
                  <div class="ach-title">${a.title}</div>
                  <div class="ach-desc">${a.desc}</div>
                </div>
                <div class="ach-status">${isUnlocked ? 'COMPLETO' : 'BLOQUEADO'}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="screen-footer">
        <button id="btn-close-hangar" class="btn btn-secondary">VOLTAR AO MENU</button>
      </div>
    </div>
  `;
}
