// ============================================================
// effects.js â€” Floating text, screen shake, & efek layar
// ============================================================

export class FloatingText {
  constructor(x, y, text, color) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.life = 1.0;
    this.maxLife = 1.0;
    this.dead = false;
  }

  update(dt) {
    this.y -= 40 * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.globalAlpha = 1;
  }
}

export class EffectManager {
  constructor() {
    this.texts = [];
    this.shakeTime = 0;
    this.shakeIntensity = 0;
    this.flashTime = 0;
    this.flashColor = '#e94560';
  }

  addText(x, y, text, color) {
    this.texts.push(new FloatingText(x, y, text, color));
  }

  shake(intensity = 6, duration = 0.2) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  flash(color = '#e94560', duration = 0.25) {
    this.flashColor = color;
    this.flashTime = duration;
  }

  update(dt) {
    for (const t of this.texts) t.update(dt);
    this.texts = this.texts.filter(t => !t.dead);

    if (this.shakeTime > 0) this.shakeTime -= dt;
    if (this.flashTime > 0) this.flashTime -= dt;
  }

  drawTexts(ctx) {
    for (const t of this.texts) t.draw(ctx);
  }

  // Flash layar penuh (merah saat base kena)
  drawFlash(ctx, w, h) {
    if (this.flashTime > 0) {
      const alpha = (this.flashTime / 0.25) * 0.25;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  // Offset untuk screen shake
  getShakeOffset() {
    if (this.shakeTime <= 0) return { x: 0, y: 0 };
    const mag = this.shakeIntensity * (this.shakeTime / 0.2);
    return {
      x: (Math.random() - 0.5) * 2 * mag,
      y: (Math.random() - 0.5) * 2 * mag,
    };
  }
}
