// ============================================================
// pathfinding.js â€” Algoritma A* pada grid
// 
// Grid dianggap graf: setiap tile adalah node, 4 tetangga
// (atas/bawah/kiri/kanan). Biaya per langkah = 1.
// Heuristik = jarak Manhattan (admissible untuk grid 4-arah).
//
// Kompleksitas: O(N log N) dengan binary min-heap, N = jumlah tile.
// Untuk grid 15x10 = 150 tile, sangat cepat â€” aman dipanggil
// ulang setiap kali menara ditempatkan/dijual.
// ============================================================

// Binary min-heap keyed by `f` (estimasi total biaya)
class MinHeap {
  constructor() { this.items = []; }
  get size() { return this.items.length; }

  push(item) {
    this.items.push(item);
    this._up(this.items.length - 1);
  }

  pop() {
    if (this.items.length === 0) return null;
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = last;
      this._down(0);
    }
    return top;
  }

  _up(i) {
    const a = this.items;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }

  _down(i) {
    const a = this.items;
    const n = a.length;
    while (true) {
      let s = i;
      const l = i * 2 + 1;
      const r = i * 2 + 2;
      if (l < n && a[l].f < a[s].f) s = l;
      if (r < n && a[r].f < a[s].f) s = r;
      if (s === i) break;
      [a[s], a[i]] = [a[i], a[s]];
      i = s;
    }
  }
}

// Heuristik Manhattan: |dc| + |dr|
function heuristic(a, b) {
  return Math.abs(a.c - b.c) + Math.abs(a.r - b.r);
}

/**
 * Cari jalur terpendek dari start ke goal.
 * @param {number} cols jumlah kolom
 * @param {number} rows jumlah baris
 * @param {{c:number,r:number}} start
 * @param {{c:number,r:number}} goal
 * @param {(c:number,r:number)=>boolean} isWalkable
 * @returns {Array<{c:number,r:number}>|null}
 */
export function findPath(cols, rows, start, goal, isWalkable) {
  const key = (c, r) => r * cols + c;
  const startKey = key(start.c, start.r);
  const goalKey = key(goal.c, goal.r);

  const open = new MinHeap();
  const gScore = new Map([[startKey, 0]]);
  const cameFrom = new Map();
  const closed = new Set();

  open.push({
    c: start.c, r: start.r, key: startKey,
    g: 0,
    f: heuristic(start, goal),
  });

  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  while (open.size > 0) {
    const cur = open.pop();

    // Ketemu goal â†’ rekonstruksi jalur mundur lewat cameFrom
    if (cur.key === goalKey) {
      const path = [];
      let k = goalKey;
      while (k !== undefined) {
        path.push({ c: k % cols, r: Math.floor(k / cols) });
        k = cameFrom.get(k);
      }
      path.reverse();
      return path;
    }

    if (closed.has(cur.key)) continue;
    closed.add(cur.key);

    for (const [dc, dr] of dirs) {
      const nc = cur.c + dc;
      const nr = cur.r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      if (!isWalkable(nc, nr)) continue;

      const nk = key(nc, nr);
      if (closed.has(nk)) continue;

      const tentativeG = cur.g + 1;
      const prevG = gScore.get(nk);
      if (prevG !== undefined && tentativeG >= prevG) continue;

      gScore.set(nk, tentativeG);
      cameFrom.set(nk, cur.key);
      open.push({
        c: nc, r: nr, key: nk,
        g: tentativeG,
        f: tentativeG + heuristic({ c: nc, r: nr }, goal),
      });
    }
  }

  return null; // tidak ada jalur
}
