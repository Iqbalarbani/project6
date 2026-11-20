// ============================================================
// game.js â€” State permainan & game loop
// Tahap 4: sistem wave, ekonomi, nyawa, statistik, menang/kalah.
// ============================================================

import { GAME, TOWER_TYPES, TILE } from './config.js';
import { GameMap } from './map.js';
import { findPath } from './pathfinding.js';
import { EnemyManager } from './enemies.js';
import { TowerManager } from './towers.js';
import { ProjectileManager } from './projectiles.js';
import { WaveManager, WAVE_STATE } from './waves.js';
import { AudioManager } from './audio.js';
import { EffectManager } from './effects.js';
import { SkillManager } from './skills.js';
import { SKILLS } from './config.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.map = new GameMap();
    this.canvas.width = this.map.width;
    this.canvas.height = this.map.height;

    this.enemies = new EnemyManager(this.map.tileSize);
    this.towers = new TowerManager(this.map.tileSize);
    this.projectiles = new ProjectileManager();
    this.waves = new WaveManager();
    this.audio = new AudioManager();
    this.effects = new EffectManager();
    this.skills = new SkillManager();

    // Ekonomi & nyawa
    this.gold = GAME.startingGold;
    this.lives = GAME.startingLives;

    // Statistik untuk layar akhir
    this.stats = {
      wavesReached: 0,
      enemiesKilled: 0,
      score: 0,
    };

    this.paused = false;
    this.speed = 1;
    this.lastTime = 0;
    this.running = false;
    this.isOver = false;

    // Interaksi
    this.hoverTile = null;
    this.buildType = null;
    this.selectedTower = null;
    this.skillTargetMode = null; // 'airStrike' saat menargetkan area skill

    // Rute A*
    this.activePath = null;

    // Callbacks UI
    this.onStateChange = null;
    this.onGameOver = null;
    this.onVictory = null;

    this._recomputePath();
    this._bindInput();
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _recomputePath() {
    const path = findPath(
      this.map.cols, this.map.rows, this.map.spawn, this.map.base,
      (c, r) => this.map.isWalkable(c, r)
    );
    this.activePath = path;
    this.map.setActivePath(path);
    return path;
  }

  _repathEnemies() {
    this.enemies.repathAll(
      this.map.cols, this.map.rows, this.map.spawn, this.map.base,
      (c, r) => this.map.isWalkable(c, r), this.map.tileSize
    );
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this._loop(t));
  }

  _loop(now) {
    if (!this.running) return;
    const rawDelta = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const delta = Math.min(rawDelta, 0.1);

    if (!this.paused && !this.isOver) {
      this.update(delta * this.speed);
    }
    this.render();
    requestAnimationFrame((t) => this._loop(t));
  }

  _hookTower(tower) {
    tower.onFire = (t) => {
      if (t.type === 'arrow') this.audio.shootArrow();
      else if (t.type === 'cannon') this.audio.shootCannon();
      else this.audio.shootIce();
    };
  }

  update(dt) {
    this.effects.update(dt);
    this.skills.update(dt);

    // --- Wave spawner ---
    this.waves.update(dt, (type) => {
      if (this.activePath) this.enemies.spawn(type, this.activePath);
    });

    // --- Entitas ---
    this.enemies.update(dt);
    this.towers.update(dt, this.enemies, this.projectiles);
    this.projectiles.update(dt, this.enemies);

    // --- Bersihkan musuh & efek ---
    const removed = this.enemies.cleanup();
    let changed = false;
    for (const e of removed) {
      if (e.dead) {
        this.gold += e.reward;
        this.stats.enemiesKilled++;
        this.stats.score += e.reward;
        changed = true;
        this.audio.enemyDeath();
        this.effects.addText(e.x, e.y - 10, `+${e.reward}`, '#f2c94c');
      } else if (e.reachedBase) {
        this.lives -= 1;
        this.stats.score = Math.max(0, this.stats.score - 5);
        changed = true;
        this.audio.baseHit();
        this.effects.flash('#e94560', 0.3);
        this.effects.shake(8, 0.25);
        const bp = this.map.tileCenter(this.map.base.c, this.map.base.r);
        this.effects.addText(bp.x, bp.y - 20, '-1 nyawa', '#e94560');
        if (this.lives <= 0) {
          this.lives = 0;
          this._endGame(false);
          return;
        }
      }
    }

    // --- Cek wave selesai / kemenangan ---
    if (this.waves.state === WAVE_STATE.CLEARING && this.enemies.count === 0) {
      const wasWave = this.waves.currentWave + 1;
      this.waves.onFieldCleared();
      this.stats.wavesReached = Math.max(this.stats.wavesReached, wasWave);
      // Bonus gold di akhir wave
      if (this.waves.state !== WAVE_STATE.DONE) {
        this.gold += 20 + wasWave * 5;
      }
      changed = true;

      if (this.waves.state === WAVE_STATE.DONE) {
        this._endGame(true);
        return;
      }
    }

    if (changed) this._emitChange();
  }

  startWave() {
    if (this.isOver || this.paused) return false;
    if (!this.waves.canStartWave()) return false;
    const ok = this.waves.startWave();
    if (ok) {
      this.audio.waveStart();
      this._emitChange();
    }
    return ok;
  }

  _endGame(victory) {
    if (this.isOver) return;
    this.isOver = true;
    this.paused = true;
    // Skor akhir: tambah bonus nyawa & wave
    this.stats.score += this.lives * 10 + this.stats.wavesReached * 25;
    if (victory) {
      this.audio.victory();
      if (this.onVictory) this.onVictory();
    } else {
      this.audio.defeat();
      if (this.onGameOver) this.onGameOver();
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.map.draw(ctx, this.hoverTile);

    if (this.selectedTower) this.selectedTower.drawRange(ctx);

    if (this.buildType && this.hoverTile) {
      const def = TOWER_TYPES[this.buildType];
      const center = this.map.tileCenter(this.hoverTile.c, this.hoverTile.r);
      ctx.beginPath();
      ctx.arc(center.x, center.y, def.range * this.map.tileSize, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(78, 204, 163, 0.06)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(78, 204, 163, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Preview radius skill saat menargetkan
    if (this.skillTargetMode && this.hoverTile) {
      const def = SKILLS[this.skillTargetMode];
      const center = this.map.tileCenter(this.hoverTile.c, this.hoverTile.r);
      const r = def.radius * this.map.tileSize;
      ctx.beginPath();
      ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(242, 201, 76, 0.15)';
      ctx.fill();
      ctx.strokeStyle = '#f2c94c';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      // Crosshair
      ctx.beginPath();
      ctx.moveTo(center.x - 12, center.y);
      ctx.lineTo(center.x + 12, center.y);
      ctx.moveTo(center.x, center.y - 12);
      ctx.lineTo(center.x, center.y + 12);
      ctx.strokeStyle = '#f2c94c';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Gambar dunia dengan screen shake
    const shake = this.effects.getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);
    this.towers.draw(ctx);
    this.enemies.draw(ctx);
    this.projectiles.draw(ctx);
    ctx.restore();

    // Efek teks melayang & flash layar
    this.effects.drawTexts(ctx);
    this.effects.drawFlash(ctx, this.canvas.width, this.canvas.height);
  }

  // ---------- Penempatan menara ----------
  canPlace(type, c, r) {
    if (TOWER_TYPES[type] === undefined) return { ok: false, reason: 'tipe tidak valid' };
    if (!this.map.isBuildable(c, r)) return { ok: false, reason: 'tile tidak kosong' };
    if (this.gold < TOWER_TYPES[type].cost) return { ok: false, reason: 'uang kurang' };
    const occupied = this.enemies.enemies.some(e =>
      !e.dead && !e.reachedBase &&
      Math.floor(e.x / this.map.tileSize) === c &&
      Math.floor(e.y / this.map.tileSize) === r
    );
    if (occupied) return { ok: false, reason: 'ada musuh di tile ini' };

    const tileType = this.map.getTile(c, r);
    this.map.setTile(c, r, TILE.BLOCKED);
    const testPath = findPath(
      this.map.cols, this.map.rows, this.map.spawn, this.map.base,
      (cc, rr) => this.map.isWalkable(cc, rr)
    );
    this.map.setTile(c, r, tileType);

    if (!testPath) return { ok: false, reason: 'memblokir jalur' };
    return { ok: true };
  }

  placeTower(type, c, r) {
    const check = this.canPlace(type, c, r);
    if (!check.ok) return check;
    this.gold -= TOWER_TYPES[type].cost;
    this.map.setTile(c, r, TILE.BLOCKED);
    const tower = this.towers.add(type, c, r);
    this._hookTower(tower);
    this.audio.buildTower();
    this._recomputePath();
    this._repathEnemies();
    this._emitChange();
    return { ok: true };
  }

  selectTowerAt(c, r) {
    const t = this.towers.get(c, r);
    this.selectedTower = t;
    if (t) this.buildType = null;
    this._emitChange();
    return t;
  }

  upgradeSelected() {
    const t = this.selectedTower;
    if (!t || !t.canUpgrade) return { ok: false, reason: 'tidak bisa upgrade' };
    const cost = t.nextUpgrade.cost;
    if (this.gold < cost) return { ok: false, reason: 'uang kurang' };
    this.gold -= cost;
    t.upgrade();
    this._emitChange();
    return { ok: true };
  }

  sellSelected() {
    const t = this.selectedTower;
    if (!t) return { ok: false };
    const refund = t.sellValue;
    this.gold += refund;
    this.map.setTile(t.c, t.r, TILE.EMPTY);
    this.towers.remove(t.c, t.r);
    this.selectedTower = null;
    this._recomputePath();
    this._repathEnemies();
    this._emitChange();
    return { ok: true, refund };
  }

  setBuildType(type) {
    this.buildType = type;
    this.selectedTower = null;
    this.skillTargetMode = null;
    this._emitChange();
  }

  // ---------- Skill ----------
  beginSkillTarget(id) {
    if (!this.skills.isReady(id) || this.isOver || this.paused) {
      this.audio.error();
      return false;
    }
    this.skillTargetMode = id;
    this.buildType = null;
    this.selectedTower = null;
    this._emitChange();
    return true;
  }

  cancelSkillTarget() {
    this.skillTargetMode = null;
    this._emitChange();
  }

  _executeSkillAt(id, c, r) {
    const res = this.skills.cast(id, c, r, this.map.tileSize, this.enemies);
    if (res.ok) {
      // Efek ledakan besar
      this.effects.addText(res.cx, res.cy, `AIR STRIKE (${res.hit})`, '#f2c94c');
      this.effects.shake(12, 0.35);
      this.effects.flash('#f2c94c', 0.2);
      this.audio.shootCannon();
      this.audio.shootCannon();
      // Partikel ledakan via projectile manager
      this.projectiles.addExplosion(res.cx, res.cy, res.radiusPx * 0.7, '#f2c94c');
      this.projectiles.addExplosion(res.cx, res.cy, res.radiusPx * 0.4, '#ffffff');
    } else {
      this.audio.error();
    }
    this.skillTargetMode = null;
    this._emitChange();
  }

  clearSelection() {
    this.buildType = null;
    this.selectedTower = null;
    this._emitChange();
  }

  togglePause() {
    this.paused = !this.paused;
    return this.paused;
  }

  toggleSpeed() {
    this.speed = this.speed === 1 ? 2 : 1;
    return this.speed;
  }

  _emitChange() {
    if (this.onStateChange) this.onStateChange();
  }

  _bindInput() {
    const getTile = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;
      const { c, r } = this.map.pixelToTile(x, y);
      return this.map.inBounds(c, r) ? { c, r } : null;
    };

    this.canvas.addEventListener('mousemove', (e) => {
      this.hoverTile = getTile(e.clientX, e.clientY);
    });
    this.canvas.addEventListener('mouseleave', () => { this.hoverTile = null; });

    this.canvas.addEventListener('pointerdown', (e) => {
      const t = getTile(e.clientX, e.clientY);
      this.hoverTile = t;
      if (!t) return;

      // Skill target mode: klik = cast
      if (this.skillTargetMode) {
        this._executeSkillAt(this.skillTargetMode, t.c, t.r);
        return;
      }

      if (this.buildType) {
        const res = this.placeTower(this.buildType, t.c, t.r);
        if (!res.ok) {
          this.audio.error();
          const center = this.map.tileCenter(t.c, t.r);
          this.effects.addText(center.x, center.y - 16, res.reason, '#e94560');
        } else {
          this.buildType = null;
        }
        return;
      }

      const existing = this.towers.get(t.c, t.r);
      if (existing) this.selectTowerAt(t.c, t.r);
      else this.clearSelection();
    });
  }

  _resize() {
    const stage = this.canvas.parentElement;
    const availW = stage.clientWidth - 16;
    const availH = stage.clientHeight - 16;
    const scale = Math.min(availW / this.canvas.width, availH / this.canvas.height, 1);
    this.canvas.style.width = `${this.canvas.width * scale}px`;
    this.canvas.style.height = `${this.canvas.height * scale}px`;
  }
}
