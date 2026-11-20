// ============================================================
// audio.js â€” Efek suara sintetis via Web Audio API
//
// Tidak memakai file audio (tanpa aset berhak cipta). Semua bunyi
// dihasilkan dari oscillator + envelope singkat.
// AudioContext dibuat lazily setelah interaksi pengguna
// (kebijakan autoplay browser).
// ============================================================

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.masterGain = null;
  }

  // Harus dipanggil dari event handler pengguna pertama
  unlock() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.35;
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Audio tidak tersedia:', e);
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.masterGain) {
      this.masterGain.gain.value = m ? 0 : 0.35;
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // ---------- Helper ----------
  _tone({ freq = 440, type = 'sine', duration = 0.1, volume = 0.3, slideTo = null, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + duration);
    }

    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  // ---------- Efek spesifik ----------
  shootArrow() {
    this._tone({ freq: 900, type: 'triangle', duration: 0.06, volume: 0.18, slideTo: 500 });
  }

  shootCannon() {
    this._tone({ freq: 180, type: 'sawtooth', duration: 0.14, volume: 0.30, slideTo: 60 });
    this._tone({ freq: 90, type: 'square', duration: 0.1, volume: 0.15, slideTo: 40, delay: 0.02 });
  }

  shootIce() {
    this._tone({ freq: 1200, type: 'sine', duration: 0.08, volume: 0.14, slideTo: 900 });
    this._tone({ freq: 1600, type: 'sine', duration: 0.06, volume: 0.08, slideTo: 1100, delay: 0.03 });
  }

  enemyDeath() {
    this._tone({ freq: 300, type: 'square', duration: 0.1, volume: 0.16, slideTo: 100 });
  }

  buildTower() {
    this._tone({ freq: 400, type: 'sine', duration: 0.08, volume: 0.22, slideTo: 700 });
    this._tone({ freq: 700, type: 'sine', duration: 0.1, volume: 0.18, slideTo: 1000, delay: 0.06 });
  }

  click() {
    this._tone({ freq: 600, type: 'square', duration: 0.04, volume: 0.12 });
  }

  error() {
    this._tone({ freq: 200, type: 'sawtooth', duration: 0.15, volume: 0.18, slideTo: 120 });
  }

  waveStart() {
    this._tone({ freq: 500, type: 'triangle', duration: 0.12, volume: 0.22, slideTo: 800 });
    this._tone({ freq: 800, type: 'triangle', duration: 0.12, volume: 0.18, slideTo: 1200, delay: 0.1 });
  }

  baseHit() {
    this._tone({ freq: 140, type: 'sawtooth', duration: 0.3, volume: 0.28, slideTo: 50 });
  }

  victory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this._tone({ freq: f, type: 'triangle', duration: 0.18, volume: 0.22, delay: i * 0.13 }));
  }

  defeat() {
    const notes = [400, 320, 240, 160];
    notes.forEach((f, i) => this._tone({ freq: f, type: 'sawtooth', duration: 0.28, volume: 0.20, delay: i * 0.16 }));
  }
}
