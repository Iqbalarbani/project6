// ============================================================
// map.js â€” Peta maze berbasis grid
//
// Model: semua tile EMPTY bisa dilewati musuh DAN ditempati menara.
// Beberapa tile BLOCKED (batu) tidak bisa dilewati/dibangun.
// SPAWN dan BASE tetap walkable sebagai start/goal A*.
//
// Musuh mencari rute dengan A* (pathfinding.js). Saat menara
// ditempatkan, tile-nya jadi BLOCKED sementara, rute dihitung ulang.
// Jika rute tidak ada, penempatan ditolak.
// ============================================================

import { GRID, TILE, SPAWN_POS, BASE_POS, ROCK_POSITIONS } from './config.js';

export class GameMap {
  constructor() {
    this.cols = GRID.cols;
    this.rows = GRID.rows;
    this.tileSize = GRID.tileSize;
    this.width = this.cols * this.tileSize;
    this.height = this.rows * this.tileSize;

    this.spawn = { ...SPAWN_POS };
    this.base = { ...BASE_POS };

    // Grid dasar: semua EMPTY
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) row.push(TILE.EMPTY);
      this.grid.push(row);
    }

    // Batu dekorasi
    for (const [c, r] of ROCK_POSITIONS) {
      if (this.inBounds(c, r)) this.grid[r][c] = TILE.BLOCKED;
    }

    // Spawn & base
    this.grid[this.spawn.r][this.spawn.c] = TILE.SPAWN;
    this.grid[this.base.r][this.base.c] = TILE.BASE;

    // Rute aktif (diisi oleh game saat menghitung A*)
    this.activePath = null; // array {c,r}
  }

  tileCenter(c, r) {
    return {
      x: c * this.tileSize + this.tileSize / 2,
      y: r * this.tileSize + this.tileSize / 2,
    };
  }

  pixelToTile(x, y) {
    return {
      c: Math.floor(x / this.tileSize),
      r: Math.floor(y / this.tileSize),
    };
  }

  inBounds(c, r) {
    return c >= 0 && r >= 0 && c < this.cols && r < this.rows;
  }

  getTile(c, r) {
    if (!this.inBounds(c, r)) return null;
    return this.grid[r][c];
  }

  setTile(c, r, type) {
    if (this.inBounds(c, r)) this.grid[r][c] = type;
  }

  // Walkable = semua kecuali BLOCKED. SPAWN & BASE walkable.
  isWalkable(c, r) {
    const t = this.getTile(c, r);
    if (t === null) return false;
    return t !== TILE.BLOCKED;
  }

  // Buildable = hanya EMPTY (bukan spawn/base/batu/jalur menara)
  isBuildable(c, r) {
    return this.getTile(c, r) === TILE.EMPTY;
  }

  // Simpan rute aktif (dipakai untuk menggambar garis panduan)
  setActivePath(path) {
    this.activePath = path;
  }

  // -------------------- Render --------------------
  draw(ctx, hoverTile = null) {
    const ts = this.tileSize;
    ctx.fillStyle = '#0f1420';
    ctx.fillRect(0, 0, this.width, this.height);

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = c * ts;
        const y = r * ts;
        const type = this.grid[r][c];

        if (type === TILE.BLOCKED) {
          ctx.fillStyle = '#1a2233';
        } else {
          ctx.fillStyle = '#171e2e';
        }
        ctx.fillRect(x, y, ts, ts);

        ctx.strokeStyle = '#232c42';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, ts - 1, ts - 1);

        if (type === TILE.BLOCKED) this._drawRock(ctx, x, y, ts);
      }
    }

    // Garis rute A*
    this._drawPathLine(ctx);

    // Highlight hover
    if (hoverTile) {
      const { c, r } = hoverTile;
      if (this.inBounds(c, r)) {
        const x = c * ts;
        const y = r * ts;
        const ok = this.isBuildable(c, r);
        ctx.fillStyle = ok ? 'rgba(78, 204, 163, 0.25)' : 'rgba(233, 69, 96, 0.25)';
        ctx.fillRect(x, y, ts, ts);
        ctx.strokeStyle = ok ? '#4ecca3' : '#e94560';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, ts - 2, ts - 2);
      }
    }

    this._drawSpawnBase(ctx);
  }

  _drawRock(ctx, x, y, ts) {
    const cx = x + ts / 2;
    const cy = y + ts / 2;
    const s = ts * 0.55;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s / 2);
    ctx.lineTo(cx + s / 2, cy - s / 6);
    ctx.lineTo(cx + s / 3, cy + s / 2);
    ctx.lineTo(cx - s / 3, cy + s / 2);
    ctx.lineTo(cx - s / 2, cy - s / 6);
    ctx.closePath();
    ctx.fillStyle = '#3a4560';
    ctx.fill();
    ctx.strokeStyle = '#2a3348';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  _drawPathLine(ctx) {
    if (!this.activePath || this.activePath.length < 2) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(78, 204, 163, 0.30)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    const first = this.tileCenter(this.activePath[0].c, this.activePath[0].r);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < this.activePath.length; i++) {
      const p = this.tileCenter(this.activePath[i].c, this.activePath[i].r);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  _drawSpawnBase(ctx) {
    const ts = this.tileSize;
    const sp = this.tileCenter(this.spawn.c, this.spawn.r);
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, ts * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#b06bff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(176, 107, 255, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, ts * 0.42, 0, Math.PI * 2);
    ctx.stroke();

    const bp = this.tileCenter(this.base.c, this.base.r);
    const s = ts * 0.55;
    ctx.fillStyle = '#f2c94c';
    ctx.fillRect(bp.x - s / 2, bp.y - s / 2, s, s);
    ctx.strokeStyle = '#0f1420';
    ctx.lineWidth = 3;
    ctx.strokeRect(bp.x - s / 2, bp.y - s / 2, s, s);
  }
}
