// ============================================================
// waves.js â€” Sistem gelombang musuh berbasis data
//
// Setiap wave = daftar grup musuh. Grup dijalankan berurutan;
// di dalam grup, musuh di-spawn dengan jeda `spawnInterval`.
// Wave dianggap selesai ketika semua grup sudah di-spawn DAN
// tidak ada musuh tersisa di lapangan (dicek oleh game).
// ============================================================

import { WAVES } from './config.js';

export const WAVE_STATE = {
  IDLE: 'idle',           // menunggu pemain menekan "Mulai Wave"
  SPAWNING: 'spawning',   // sedang mengeluarkan musuh
  CLEARING: 'clearing',   // semua sudah spawn, menunggu lapangan bersih
  DONE: 'done',           // semua wave selesai
};

export class WaveManager {
  constructor() {
    this.currentWave = 0;      // index wave yang sedang/akan dimainkan
    this.state = WAVE_STATE.IDLE;
    this.totalWaves = WAVES.length;

    // Progres spawn di dalam wave
    this.groupIndex = 0;
    this.spawnedInGroup = 0;
    this.spawnTimer = 0;

    this._buildQueue();
  }

  // Bangun antrean datar untuk wave saat ini: [{type, delay}, ...]
  // delay = waktu tunggu SEBELUM musuh ini muncul (detik)
  _buildQueue() {
    this.queue = [];
    if (this.currentWave >= this.totalWaves) return;
    const wave = WAVES[this.currentWave];
    for (const group of wave.groups) {
      for (let i = 0; i < group.count; i++) {
        this.queue.push({
          type: group.type,
          delay: wave.spawnInterval,
        });
      }
    }
  }

  /** Apakah pemain boleh menekan "Mulai Wave" sekarang? */
  canStartWave() {
    return this.state === WAVE_STATE.IDLE && this.currentWave < this.totalWaves;
  }

  /** Mulai wave berikutnya. */
  startWave() {
    if (!this.canStartWave()) return false;
    this._buildQueue();
    this.state = WAVE_STATE.SPAWNING;
    this.spawnIndex = 0;
    // Musuh pertama langsung muncul (delay 0) agar responsif
    this.spawnTimer = this.queue.length > 0 ? this.queue[0].delay : 0;
    return true;
  }

  /**
   * Update spawner. Memanggil `spawnFn(type)` setiap kali musuh
   * seharusnya muncul.
   * @returns {number} jumlah musuh yang di-spawn pada update ini
   */
  update(dt, spawnFn) {
    if (this.state !== WAVE_STATE.SPAWNING) return 0;

    let spawned = 0;
    this.spawnTimer -= dt;

    // Bisa spawn beberapa musuh dalam satu frame jika interval kecil
    while (this.spawnTimer <= 0 && this.spawnIndex < this.queue.length) {
      const item = this.queue[this.spawnIndex];
      spawnFn(item.type);
      this.spawnIndex++;
      spawned++;
      if (this.spawnIndex < this.queue.length) {
        this.spawnTimer += this.queue[this.spawnIndex].delay;
      }
    }

    if (this.spawnIndex >= this.queue.length) {
      this.state = WAVE_STATE.CLEARING;
    }
    return spawned;
  }

  /** Dipanggil game ketika lapangan sudah bersih dari musuh. */
  onFieldCleared() {
    if (this.state !== WAVE_STATE.CLEARING) return false;
    // Wave ini selesai
    this.currentWave++;
    if (this.currentWave >= this.totalWaves) {
      this.state = WAVE_STATE.DONE;
    } else {
      this.state = WAVE_STATE.IDLE;
    }
    return true;
  }

  /** Sisa musuh yang belum di-spawn di wave ini (untuk UI). */
  get remainingToSpawn() {
    if (this.state !== WAVE_STATE.SPAWNING) return 0;
    return Math.max(0, this.queue.length - this.spawnIndex);
  }

  /** Jumlah musuh total di wave saat ini. */
  get waveSize() {
    return this.queue.length;
  }
}
