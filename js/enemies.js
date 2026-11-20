// ============================================================
// enemies.js â€” Musuh dan pergerakannya
//
// Musuh mengikuti jalur grid (hasil A*) sebagai waypoint.
// Posisi disimpan dalam pixel; waypoint adalah pusat tile.
// Mendukung efek "slow" (dipakai menara es di Tahap 3).
// ============================================================

import { ENEMY_TYPES, COLORS } from './config.js';
import { findPath } from './pathfinding.js';

export class Enemy {
  /**
   * @param {string} type key di ENEMY_TYPES ('normal'|'fast'|'tank')
   * @param {Array<{c:number,r:number}>} path jalur grid
   * @param {number} tileSize ukuran tile (px)
   */
  constructor(type, path, tileSize) {
    const def = ENEMY_TYPES[type];
    this.type = type;
    this.def = def;
    this.tileSize = tileSize;

    this.maxHp = def.hp;
    this.hp = def.hp;
    this.baseSpeed = def.speed;
    this.radius = def.radius;
    this.reward = def.reward;
    this.color = def.color;

    // Konversi path (grid coords) â†’ waypoint pixel
    this.path = path.map(({ c, r }) => ({
      x: c * tileSize + tileSize / 2,
      y: r * tileSize + tileSize / 2,
    }));
    this.pathIndex = 0;

    // Posisi awal di waypoint pertama (spawn)
    this.x = this.path[0].x;
    this.y = this.path[0].y;
    this.pathIndex = 1;

    this.dead = false;
    this.reachedBase = false;

    // Efek slow: timer & faktor. Jika timer > 0, kecepatan = baseSpeed * slowFactor
    this.slowTimer = 0;
    this.slowFactor = 1;

    // Animasi kecil (bob)
    this.animTime = Math.random() * Math.PI * 2;
  }

  get speed() {
    return this.slowTimer > 0 ? this.baseSpeed * this.slowFactor : this.baseSpeed;
  }

  /** Terapkan efek slow (menara es). Ambil yang terkuat jika sudah kena. */
  applySlow(factor, duration) {
    // Faktor lebih kecil = lebih lambat; ambil yang paling lambat
    if (this.slowTimer <= 0 || factor < this.slowFactor) {
      this.slowFactor = factor;
    }
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  /** Kurangi HP, kembalikan true jika mati. */
  takeDamage(amount) {
    if (this.dead) return false;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
      return true;
    }
    return false;
  }

  /** Update posisi sepanjang jalur. */
  update(dt) {
    if (this.dead || this.reachedBase) return;

    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowFactor = 1;
    }

    this.animTime += dt * 6;

    let remaining = this.speed * dt;

    while (remaining > 0 && this.pathIndex < this.path.length) {
      const target = this.path[this.pathIndex];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= remaining) {
        // Sampai di waypoint, lanjut ke berikutnya
        this.x = target.x;
        this.y = target.y;
        remaining -= dist;
        this.pathIndex++;
      } else {
        // Bergerak sebagian menuju waypoint
        this.x += (dx / dist) * remaining;
        this.y += (dy / dist) * remaining;
        remaining = 0;
      }
    }

    if (this.pathIndex >= this.path.length) {
      this.reachedBase = true;
    }
  }

  /** Gambar musuh + health bar. */
  draw(ctx) {
    if (this.dead) return;

    const bob = Math.sin(this.animTime) * 1.5;
    const x = this.x;
    const y = this.y + bob;
    const r = this.radius;

    // Bayangan
    ctx.beginPath();
    ctx.arc(x, y + r * 0.7, r * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();

    // Warna: jika kena slow, tint biru
    let fill = this.color;
    if (this.slowTimer > 0) fill = '#7fd6ff';

    // Bentuk berdasarkan tipe
    ctx.fillStyle = fill;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;

    if (this.type === 'boss') {
      // Hexagon besar + lingkaran aura
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Aura berdenyut
      const pulse = 0.5 + 0.5 * Math.sin(this.animTime * 0.8);
      ctx.beginPath();
      ctx.arc(x, y, r * (1.6 + pulse * 0.15), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(176, 107, 255, ${0.25 + pulse * 0.2})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Mahkota (3 segitiga kecil di atas)
      ctx.fillStyle = '#f2c94c';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * 9, y - r - 2);
        ctx.lineTo(x + i * 9 - 4, y - r - 12);
        ctx.lineTo(x + i * 9 + 4, y - r - 12);
        ctx.closePath();
        ctx.fill();
      }
    } else if (this.type === 'tank') {
      // Kotak untuk tank
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.strokeRect(x - r, y - r, r * 2, r * 2);
    } else if (this.type === 'fast') {
      // Segitiga untuk yang cepat (menghadap kanan)
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x - r * 0.7, y - r);
      ctx.lineTo(x - r * 0.7, y + r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Lingkaran untuk normal
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Health bar di atas musuh (boss lebih tebal)
    const barW = r * 2;
    const barH = this.type === 'boss' ? 6 : 4;
    const barX = x - barW / 2;
    const barY = y - r - 10;
    const pct = this.hp / this.maxHp;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    ctx.fillStyle = pct > 0.5 ? '#4ecca3' : pct > 0.25 ? '#f2c94c' : '#e94560';
    ctx.fillRect(barX, barY, barW * pct, barH);
  }
}

export class EnemyManager {
  constructor(tileSize) {
    this.tileSize = tileSize;
    this.enemies = [];
  }

  spawn(type, path) {
    const e = new Enemy(type, path, this.tileSize);
    this.enemies.push(e);
    return e;
  }

  /**
   * Hitung ulang rute untuk semua musuh yang sudah di lapangan.
   * Dipanggil setiap kali menara ditempatkan/dijual (jalur berubah).
   * Rute baru dimulai dari tile tempat musuh berada sekarang; posisi
   * sekarang dijadikan waypoint pertama agar tidak "mundur".
   */
  repathAll(cols, rows, spawn, base, isWalkable, tileSize) {
    for (const e of this.enemies) {
      if (e.dead || e.reachedBase) continue;
      const cc = Math.floor(e.x / tileSize);
      const cr = Math.floor(e.y / tileSize);
      const p = findPath(cols, rows, { c: cc, r: cr }, base, isWalkable);
      if (!p || p.length === 0) continue; // tak ada jalur: pertahankan rute lama
      const px = p.map(({ c, r }) => ({
        x: c * tileSize + tileSize / 2,
        y: r * tileSize + tileSize / 2,
      }));
      // Waypoint pertama = posisi sekarang, lalu lanjut ke px[1..]
      e.path = [{ x: e.x, y: e.y }, ...px.slice(1)];
      e.pathIndex = 1;
    }
  }

  update(dt) {
    for (const e of this.enemies) e.update(dt);
  }

  draw(ctx) {
    for (const e of this.enemies) e.draw(ctx);
  }

  // Hapus musuh yang mati atau sudah sampai base. Kembalikan list yang
  // baru dihapus agar game bisa memberi hadiah / mengurangi nyawa.
  cleanup() {
    const removed = [];
    const keep = [];
    for (const e of this.enemies) {
      if (e.dead || e.reachedBase) removed.push(e);
      else keep.push(e);
    }
    this.enemies = keep;
    return removed;
  }

  get count() { return this.enemies.length; }
}
