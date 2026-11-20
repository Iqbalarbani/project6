// ============================================================
// towers.js â€” Menara, targeting, dan upgrade
//
// Menara mencari musuh terdekat (dalam range) yang belum mati,
// lalu menembak dengan interval 1/fireRate. Level upgrade 0-2.
// ============================================================

import { TOWER_TYPES } from './config.js';
import { Projectile } from './projectiles.js';

export class Tower {
  constructor(type, c, r, tileSize) {
    this.type = type;
    this.c = c;
    this.r = r;
    this.tileSize = tileSize;
    this.x = c * tileSize + tileSize / 2;
    this.y = r * tileSize + tileSize / 2;

    this.level = 0;           // 0, 1, 2
    this.totalInvested = TOWER_TYPES[type].cost;

    this.cooldown = 0;
    this.angle = 0;           // rotasi menara menghadap target terakhir
    this.target = null;
    this.recoil = 0;          // animasi recoil saat menembak (0..1)
    this._auraFactor = 1;     // faktor tembak karena aura boss
  }

  // Statistik saat ini berdasarkan tipe + level upgrade
  get stats() {
    const base = TOWER_TYPES[this.type];
    if (this.level === 0) return base;
    // Merge base + upgrade level yang berlaku
    let s = { ...base };
    for (let i = 0; i < this.level; i++) {
      s = { ...s, ...base.upgrades[i] };
    }
    return s;
  }

  get canUpgrade() { return this.level < 2; }
  get nextUpgrade() { return this.canUpgrade ? TOWER_TYPES[this.type].upgrades[this.level] : null; }
  get sellValue() { return Math.floor(this.totalInvested * 0.6); }
  get rangePx() { return this.stats.range * this.tileSize; }

  update(dt, enemyManager, projectileManager) {
    this.cooldown -= dt;
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 6);

    // Aura boss: jika ada boss di dekat menara, cooldown berjalan lebih lambat
    this._auraFactor = this._computeAuraFactor(enemyManager);

    const s = this.stats;
    // Cari target terdekat dalam jangkauan
    if (!this.target || this.target.dead || this.target.reachedBase ||
        Math.hypot(this.target.x - this.x, this.target.y - this.y) > this.rangePx) {
      this.target = this._findTarget(enemyManager);
    }

    if (this.target) {
      // Update rotasi menara
      this.angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);

      if (this.cooldown <= 0) {
        this._fire(projectileManager);
        // Cooldown diperpanjang bila dalam aura boss
        this.cooldown = (1 / s.fireRate) / this._auraFactor;
        this.recoil = 1;
        if (this.onFire) this.onFire(this);
      }
    }
  }

  // Faktor kecepatan tembak berdasarkan aura boss terdekat
  _computeAuraFactor(enemyManager) {
    let factor = 1;
    for (const e of enemyManager.enemies) {
      if (e.dead || e.reachedBase || !e.def.isBoss) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d <= e.def.auraRadius * this.tileSize) {
        factor = Math.min(factor, e.def.auraSlow);
      }
    }
    return factor;
  }

  _findTarget(enemyManager) {
    let best = null;
    let bestDist = Infinity;
    const rng = this.rangePx;
    for (const e of enemyManager.enemies) {
      if (e.dead || e.reachedBase) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d <= rng && d < bestDist) {
        best = e;
        bestDist = d;
      }
    }
    return best;
  }

  _fire(projectileManager) {
    const s = this.stats;
    // Muzzle sedikit di depan menara
    const mx = this.x + Math.cos(this.angle) * this.tileSize * 0.3;
    const my = this.y + Math.sin(this.angle) * this.tileSize * 0.3;

    projectileManager.add(new Projectile({
      x: mx,
      y: my,
      target: this.target,
      damage: s.damage,
      speed: s.projectileSpeed,
      color: s.color,
      kind: this.type,
      splash: s.splash ? s.splash * this.tileSize : 0,
      slowFactor: s.slowFactor,
      slowDuration: s.slowDuration,
    }));
  }

  upgrade() {
    if (!this.canUpgrade) return false;
    this.totalInvested += this.nextUpgrade.cost;
    this.level++;
    return true;
  }

  draw(ctx) {
    const ts = this.tileSize;
    const s = this.stats;

    // Base lingkaran
    ctx.beginPath();
    ctx.arc(this.x, this.y, ts * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#222c40';
    ctx.fill();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Ikon menara berputar menghadap target
    ctx.save();
    // Recoil: geser mundur sedikit sepanjang arah tembak
    const recoilOffset = this.recoil * 3;
    ctx.translate(this.x - Math.cos(this.angle) * recoilOffset, this.y - Math.sin(this.angle) * recoilOffset);
    ctx.rotate(this.angle);

    if (this.type === 'arrow') {
      // Panah segitiga
      ctx.beginPath();
      ctx.moveTo(ts * 0.3, 0);
      ctx.lineTo(-ts * 0.15, ts * 0.15);
      ctx.lineTo(-ts * 0.15, -ts * 0.15);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
    } else if (this.type === 'cannon') {
      // Laras kotak
      ctx.fillStyle = s.color;
      ctx.fillRect(-ts * 0.1, -ts * 0.12, ts * 0.4, ts * 0.24);
      ctx.beginPath();
      ctx.arc(0, 0, ts * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = '#3a1f2a';
      ctx.fill();
    } else {
      // Es: bintang/diamond
      ctx.beginPath();
      ctx.moveTo(ts * 0.25, 0);
      ctx.lineTo(0, ts * 0.15);
      ctx.lineTo(-ts * 0.15, 0);
      ctx.lineTo(0, -ts * 0.15);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
    }
    ctx.restore();

    // Indikator level (dot kecil di atas)
    for (let i = 0; i < this.level; i++) {
      ctx.beginPath();
      ctx.arc(this.x - 6 + i * 12, this.y - ts * 0.4, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#f2c94c';
      ctx.fill();
    }
  }

  // Menggambar lingkaran jangkauan (untuk hover/selected)
  drawRange(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.rangePx, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(78, 204, 163, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(78, 204, 163, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export class TowerManager {
  constructor(tileSize) {
    this.tileSize = tileSize;
    this.towers = [];
    this.byKey = new Map(); // key "c,r" â†’ tower untuk lookup cepat
  }

  key(c, r) { return `${c},${r}`; }

  get(c, r) { return this.byKey.get(this.key(c, r)) || null; }

  add(type, c, r) {
    const t = new Tower(type, c, r, this.tileSize);
    this.towers.push(t);
    this.byKey.set(this.key(c, r), t);
    return t;
  }

  remove(c, r) {
    const t = this.get(c, r);
    if (!t) return null;
    this.towers = this.towers.filter(x => x !== t);
    this.byKey.delete(this.key(c, r));
    return t;
  }

  update(dt, enemyManager, projectileManager) {
    for (const t of this.towers) t.update(dt, enemyManager, projectileManager);
  }

  draw(ctx) {
    for (const t of this.towers) t.draw(ctx);
  }
}
