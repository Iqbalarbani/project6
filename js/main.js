// ============================================================
// main.js â€” Bootstrap & wiring UI
// ============================================================

import { Game } from './game.js';
import { UI } from './ui.js';
import { TOWER_TYPES } from './config.js';
import { WAVE_STATE } from './waves.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);
const ui = new UI(game);

// Unlock audio pada interaksi pengguna pertama (kebijakan autoplay)
const unlockAudio = () => {
  game.audio.unlock();
  window.removeEventListener('pointerdown', unlockAudio);
  window.removeEventListener('keydown', unlockAudio);
};
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

// ---- Elemen ----
const statWave = document.getElementById('stat-wave');
const statLives = document.getElementById('stat-lives');
const statGold = document.getElementById('stat-gold');

const btnWave = document.getElementById('btn-wave');
const btnPause = document.getElementById('btn-pause');
const btnSpeed = document.getElementById('btn-speed');
const btnMute = document.getElementById('btn-mute');

const buildButtons = document.querySelectorAll('.build-btn');
const btnSkill = document.getElementById('btn-skill');
const skillCd = document.getElementById('skill-cd');
const towerInfo = document.getElementById('tower-info');
const tiName = document.getElementById('ti-name');
const tiLevel = document.getElementById('ti-level');
const btnUpgrade = document.getElementById('btn-upgrade');
const btnSell = document.getElementById('btn-sell');

// ---- Sinkronisasi UI ----
function refreshUI() {
  statGold.textContent = game.gold;
  statLives.textContent = game.lives;

  const wm = game.waves;
  const cur = Math.min(wm.currentWave + (wm.state === WAVE_STATE.IDLE ? 1 : 0), wm.totalWaves);
  statWave.textContent = `${wm.currentWave}/${wm.totalWaves}`;

  // Tombol wave
  const canStart = wm.canStartWave() && !game.isOver && !game.paused;
  btnWave.disabled = !canStart;
  if (wm.state === WAVE_STATE.SPAWNING) {
    btnWave.textContent = `Memanggil... (${wm.remainingToSpawn})`;
  } else if (wm.state === WAVE_STATE.CLEARING) {
    btnWave.textContent = `Bersihkan! (${game.enemies.count})`;
  } else if (wm.state === WAVE_STATE.DONE) {
    btnWave.textContent = 'Selesai';
  } else {
    btnWave.textContent = `Mulai Wave ${cur}`;
  }

  for (const b of buildButtons) {
    const type = b.dataset.type;
    b.classList.toggle('active', game.buildType === type);
    b.disabled = game.gold < TOWER_TYPES[type].cost;
  }

  // Skill cooldown UI
  const cd = game.skills.getCooldown('airStrike');
  const total = game.skills.getTotalCooldown('airStrike');
  const ready = cd <= 0;
  btnSkill.classList.toggle('ready', ready);
  btnSkill.classList.toggle('active', game.skillTargetMode === 'airStrike');
  btnSkill.disabled = !ready || game.isOver;
  if (ready) {
    skillCd.textContent = 'Siap';
  } else {
    skillCd.textContent = `${Math.ceil(cd)}s`;
  }
  // Progress bar via CSS variable
  btnSkill.style.setProperty('--cd-progress', ready ? '100%' : `${((total - cd) / total) * 100}%`);

  if (game.selectedTower) {
    const t = game.selectedTower;
    towerInfo.classList.remove('hidden');
    tiName.textContent = TOWER_TYPES[t.type].name;
    tiLevel.textContent = `Lv.${t.level + 1}`;
    if (t.canUpgrade) {
      const up = t.nextUpgrade;
      btnUpgrade.disabled = game.gold < up.cost;
      btnUpgrade.textContent = `Upgrade (${up.cost})`;
    } else {
      btnUpgrade.disabled = true;
      btnUpgrade.textContent = 'Max';
    }
    btnSell.textContent = `Jual (+${t.sellValue})`;
  } else {
    towerInfo.classList.add('hidden');
  }
}

game.onStateChange = refreshUI;

// ---- Build buttons ----
for (const b of buildButtons) {
  b.addEventListener('click', () => {
    const type = b.dataset.type;
    if (game.buildType === type) game.clearSelection();
    else game.setBuildType(type);
  });
}

// ---- Wave ----
btnWave.addEventListener('click', () => game.startWave());

// ---- Skill ----
btnSkill.addEventListener('click', () => {
  if (game.skillTargetMode === 'airStrike') game.cancelSkillTarget();
  else game.beginSkillTarget('airStrike');
});

// ---- Upgrade / Sell ----
btnUpgrade.addEventListener('click', () => game.upgradeSelected());
btnSell.addEventListener('click', () => game.sellSelected());

// ---- Pause / Speed / Mute ----
btnPause.addEventListener('click', () => {
  const paused = game.togglePause();
  btnPause.classList.toggle('active', paused);
  btnPause.textContent = paused ? '\u25B6' : '\u275A\u275A';
  refreshUI();
});

btnSpeed.addEventListener('click', () => {
  const s = game.toggleSpeed();
  btnSpeed.textContent = `${s}x`;
  btnSpeed.classList.toggle('active', s === 2);
});

btnMute.addEventListener('click', () => {
  const muted = game.audio.toggleMute();
  btnMute.textContent = muted ? '\u2715' : '\u266B';
  btnMute.classList.toggle('active', muted);
});

// ---- Start ----
game.start();
refreshUI();

// Refresh berkala untuk cooldown skill & status wave
setInterval(refreshUI, 200);

globalThis.__tdm = { game, ui };
