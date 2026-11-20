// ============================================================
// projectiles.js â€” Proyektil & efek partikel
//
// Proyektil bergerak homing ke target. Jika target mati di tengah
// jalan, proyektil tetap menuju posisi terakhir & meledak di sana
// (agar splash meriam tetap wajar).
//
// Efek per tipe:
//  - arrow  : damage tunggal
//  - cannon : damage area (splash radius)
//  - ice    : damage kecil + slow pada target (dan splash slow opsional)
// ============================================================

export class Projectile {
  /**
   * @param {object} opts
   * @param {number} opts.x posisi awal
   * @param {number} opts.y
   * @param {import('./enemies.js').Enemy} opts.target musuh sasaran
   * @param {number} opts.damage
   * @param {number} opts.speed px/detik
   * @param {string} opts.color
   * @param {string} opts.kind 'arrow'|'cannon'|'ice'
   * @param {number} [opts.splash] radius splash dalam pixel (cannon)
   * @param {number} [opts.slowFactor]
   * @param {number} [opts.slowDuration]
   */
  constructor(opts) {
    this.x = opts.x;
    this.y = opts.y;
    this.target = opts.target;
    this.damage = opts.damage;
    this.speed = opts.speed;
    this.color = opts.color;
    this.kind = opts.kind;
    this.splash = opts.splash || 0;         // dalam pixel
    this.slowFactor = opts.slowFactor || 1;
    this.slowDuration = opts.slowDuration || 0;

    // Titik tujuan terakhir (jika target mati)
    this.tx = opts.target.x;
    this.ty = opts.target.y;

    this.dead = false;
    this.radius = opts.kind === 'cannon' ? 7 : opts.kind === 'ice' ? 6 : 4;
    this.trail = [];
  }

  update(dt, enemyManager) {
    if (this.dead) return;

    // Perbarui target posisi
    if (this.target && !this.target.dead && !this.target.reachedBase) {
      this.tx = this.target.x;
      this.ty = this.target.y;
    }

    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const dist = Math.hypot(dx, dy);
    const step = this.speed * dt;

    // Trail singkat
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 5) this.trail.shift();

    if (dist <= step) {
      // Tiba di target
      this.x = this.tx;
      this.y = this.ty;
      this._hit(enemyManager);
      this.dead = true;
      return;
    }

    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
  }

  _hit(enemyManager) {
    if (this.splash > 0) {
      // Damage area ke semua musuh dalam radius
      for (const e of enemyManager.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d <= this.splash) {
          const falloff = 1 - (d / this.splash) * 0.4; // damage berkurang di tepi
          e.takeDamage(this.damage * falloff);
          if (this.slowDuration > 0) e.applySlow(this.slowFactor, this.slowDuration);
        }
      }
      // Partikel ledakan
      enemyManager.addExplosion(this.x, this.y, this.splash, this.kind === 'ice' ? '#56b6ff' : '#e94560');
    } else {
      // Damage tunggal
      if (this.target && !this.target.dead) {
        this.target.takeDamage(this.damage);
        if (this.slowDuration > 0) this.target.applySlow(this.slowFactor, this.slowDuration);
      }
      enemyManager.addSpark(this.x, this.y, this.color);
    }
  }

  draw(ctx) {
    if (this.dead) return;

    // Trail
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const alpha = (i / this.trail.length) * 0.35;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.radius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = this._rgba(this.color, alpha);
      ctx.fill();
    }

    // Proyektil utama
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Glow untuk ice
    if (this.kind === 'ice') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(86,182,255,0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  _rgba(hex, a) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
}

export class Particle {
  constructor(x, y, vx, vy, color, life, size) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.94;
    this.vy *= 0.94;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export class ProjectileManager {
  constructor() {
    this.projectiles = [];
    this.particles = [];
  }

  add(proj) { this.projectiles.push(proj); }

  addExplosion(x, y, radius, color) {
    const n = 12;
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2;
      const speed = radius * 3 + Math.random() * 100;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color, 0.4 + Math.random() * 0.2, 3 + Math.random() * 3
      ));
    }
    // Flash lingkaran
    this.particles.push(new Particle(x, y, 0, 0, color, 0.2, radius * 0.5));
  }

  addSpark(x, y, color) {
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 100;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color, 0.25, 2
      ));
    }
  }

  update(dt, enemyManager) {
    for (const p of this.projectiles) p.update(dt, enemyManager);
    this.projectiles = this.projectiles.filter(p => !p.dead);

    for (const p of this.particles) p.update(dt);
    this.particles = this.particles.filter(p => !p.dead);
  }

  draw(ctx) {
    for (const p of this.particles) p.draw(ctx);
    for (const p of this.projectiles) p.draw(ctx);
  }
}
