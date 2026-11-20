// ============================================================
// skills.js â€” Skill aktif dengan cooldown
// Tahap 6: Serangan Udara (area damage besar dengan cooldown)
// ============================================================

import { SKILLS } from './config.js';

export class SkillManager {
  constructor() {
    // cooldown timer per skill (detik tersisa)
    this.cooldowns = {
      airStrike: 0,
    };
  }

  /** Sisa cooldown skill (detik). */
  getCooldown(id) {
    return this.cooldowns[id] || 0;
  }

  /** Total cooldown untuk progress bar. */
  getTotalCooldown(id) {
    return SKILLS[id].cooldown;
  }

  isReady(id) {
    return this.getCooldown(id) <= 0;
  }

  /**
   * Cast skill di area tile tertentu.
   * @returns {{ok:boolean, hit?:number, reason?:string}}
   */
  cast(id, tileC, tileR, tileSize, enemyManager) {
    if (!this.isReady(id)) return { ok: false, reason: 'cooldown' };
    const def = SKILLS[id];
    if (id === 'airStrike') {
      const cx = tileC * tileSize + tileSize / 2;
      const cy = tileR * tileSize + tileSize / 2;
      const radiusPx = def.radius * tileSize;

      let hit = 0;
      for (const e of enemyManager.enemies) {
        if (e.dead || e.reachedBase) continue;
        const d = Math.hypot(e.x - cx, e.y - cy);
        if (d <= radiusPx) {
          // Damage penuh di pusat, berkurang di tepi
          const falloff = 1 - (d / radiusPx) * 0.35;
          e.takeDamage(def.damage * falloff);
          hit++;
        }
      }

      this.cooldowns[id] = def.cooldown;
      return { ok: true, hit, cx, cy, radiusPx };
    }
    return { ok: false, reason: 'unknown skill' };
  }

  update(dt) {
    for (const id of Object.keys(this.cooldowns)) {
      if (this.cooldowns[id] > 0) {
        this.cooldowns[id] = Math.max(0, this.cooldowns[id] - dt);
      }
    }
  }
}
