// ============================================================
// ui.js â€” Overlay menu, layar menang/kalah, dan skor tertinggi
// ============================================================

const HS_KEY = 'tdm_highscore_v1';

export class UI {
  constructor(game) {
    this.game = game;

    // Overlay
    this.overlay = document.getElementById('overlay');
    this.screens = {
      menu: document.getElementById('screen-menu'),
      howto: document.getElementById('screen-howto'),
      win: document.getElementById('screen-win'),
      lose: document.getElementById('screen-lose'),
    };

    // Tombol menu utama
    document.getElementById('btn-start').addEventListener('click', () => this.startGame());
    document.getElementById('btn-howto').addEventListener('click', () => this.show('howto'));
    document.getElementById('btn-howto-back').addEventListener('click', () => this.show('menu'));

    // Tombol layar akhir
    document.getElementById('btn-win-again').addEventListener('click', () => this.restart());
    document.getElementById('btn-lose-again').addEventListener('click', () => this.restart());
    document.getElementById('btn-win-menu').addEventListener('click', () => this.show('menu'));
    document.getElementById('btn-lose-menu').addEventListener('click', () => this.show('menu'));

    // Tombol wave di topbar
    this.btnWave = document.getElementById('btn-wave');
    this.btnWave.addEventListener('click', () => this.game.startWave());

    // Menu utama: tampilkan skor tertinggi
    this.highscoreEl = document.getElementById('menu-highscore');
    this.updateHighscoreLabel();

    // Callback dari game
    this.game.onGameOver = () => this.showEnd(false);
    this.game.onVictory = () => this.showEnd(true);

    // Mulai di menu
    this.show('menu');
    this.game.paused = true;
  }

  // Tampilkan salah satu layar; 'none' menyembunyikan overlay
  show(name) {
    for (const key of Object.keys(this.screens)) {
      this.screens[key].classList.toggle('hidden', key !== name);
    }
    if (name === 'none') {
      this.overlay.classList.add('hidden');
    } else {
      this.overlay.classList.remove('hidden');
      if (name === 'menu') this.updateHighscoreLabel();
    }
  }

  startGame() {
    this.game.paused = false;
    this.show('none');
  }

  restart() {
    // Reload halaman = reset paling bersih untuk game kecil ini
    window.location.reload();
  }

  showEnd(victory) {
    const s = this.game.stats;
    const screen = victory ? this.screens.win : this.screens.lose;
    this.show(victory ? 'win' : 'lose');

    // Isi statistik
    const prefix = victory ? 'win' : 'lose';
    document.getElementById(`${prefix}-stat-waves`).textContent = s.wavesReached;
    document.getElementById(`${prefix}-stat-kills`).textContent = s.enemiesKilled;
    document.getElementById(`${prefix}-stat-score`).textContent = s.score;

    // Update & tandai skor tertinggi
    const prev = this.getHighscore();
    const isNew = s.score > prev;
    if (isNew) this.setHighscore(s.score);
    document.getElementById(`${prefix}-highscore`).textContent = isNew
      ? `Skor tertinggi baru: ${s.score}!`
      : `Skor tertinggi: ${Math.max(prev, s.score)}`;
  }

  // ---------- Highscore ----------
  getHighscore() {
    const v = parseInt(localStorage.getItem(HS_KEY) || '0', 10);
    return Number.isFinite(v) ? v : 0;
  }

  setHighscore(v) {
    localStorage.setItem(HS_KEY, String(v));
  }

  updateHighscoreLabel() {
    if (this.highscoreEl) {
      this.highscoreEl.textContent = this.getHighscore();
    }
  }
}
