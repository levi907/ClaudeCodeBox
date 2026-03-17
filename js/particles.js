// ============================================================
//  SPELL SURVIVORS - Particle System
// ============================================================

const PARTICLE_CAP = 400;

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  _add(p) {
    if (this.particles.length >= PARTICLE_CAP) {
      // Drop oldest non-text particle to stay under cap
      const idx = this.particles.findIndex(q => q.type !== 'text');
      if (idx !== -1) this.particles.splice(idx, 1);
      else return; // all text particles, skip
    }
    this.particles.push(p);
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= (1 - p.drag * dt);
      p.vy *= (1 - p.drag * dt);
      if (p.gravity) p.vy += p.gravity * dt;
      p.life -= dt;
      p.alpha = clamp(p.life / p.maxLife, 0, 1);
      if (p.type === 'text') p.y += p.floatSpeed * dt;
      if (p.rotation !== undefined) p.rotation += p.rotSpeed * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  draw(ctx, cx = 0, cy = 0) {
    for (const p of this.particles) {
      Sprites.drawParticle(ctx, p, cx, cy);
    }
  }

  // Emit sparks at world position
  spark(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const a = rng(0, Math.PI * 2);
      const spd = rng(30, 100);
      this._add({
        type: 'spark', x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        drag: 3, gravity: 0,
        color, size: rng(1.5, 3.5),
        life: rng(0.2, 0.5), maxLife: 0.5, alpha: 1
      });
    }
  }

  // Blood splat
  blood(x, y, count = 6) {
    for (let i = 0; i < count; i++) {
      const a = rng(0, Math.PI * 2);
      const spd = rng(20, 80);
      this._add({
        type: 'blood', x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        drag: 4, gravity: 150,
        color: '#aa2020',
        size: rng(2, 5),
        life: rng(0.3, 0.7), maxLife: 0.7, alpha: 1
      });
    }
  }

  // Floating damage number
  floatText(x, y, text, color = '#ffffff', size = 14) {
    this._add({
      type: 'text', x, y,
      vx: rng(-15, 15), vy: -60,
      drag: 1, gravity: 0,
      floatSpeed: 0,
      color, text, size,
      life: 0.9, maxLife: 0.9, alpha: 1
    });
  }

  // Level up stars
  levelUpBurst(x, y) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const spd = rng(80, 200);
      this._add({
        type: 'star', x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        drag: 2, gravity: 0,
        color: pick(['#ffd700', '#ff9000', '#fff000', '#ffffff']),
        size: rng(2, 5),
        rotation: rng(0, Math.PI * 2),
        rotSpeed: rng(-5, 5),
        life: rng(0.6, 1.2), maxLife: 1.2, alpha: 1
      });
    }
  }

  // XP collect sparkle
  xpCollect(x, y) {
    for (let i = 0; i < 4; i++) {
      const a = rng(0, Math.PI * 2);
      this._add({
        type: 'spark', x, y,
        vx: Math.cos(a) * rng(20, 60), vy: Math.sin(a) * rng(20, 60),
        drag: 4, gravity: 0,
        color: '#40ff80',
        size: rng(1, 2.5),
        life: 0.3, maxLife: 0.3, alpha: 1
      });
    }
  }

  // Explosion
  explode(x, y, color = '#ff6000', count = 20) {
    for (let i = 0; i < count; i++) {
      const a = rng(0, Math.PI * 2);
      const spd = rng(50, 250);
      this._add({
        type: 'spark', x, y,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        drag: 3, gravity: 50,
        color: i % 3 === 0 ? '#ffffff' : color,
        size: rng(2, 6),
        life: rng(0.3, 0.8), maxLife: 0.8, alpha: 1
      });
    }
  }

  // Freeze effect
  freeze(x, y) {
    for (let i = 0; i < 8; i++) {
      const a = rng(0, Math.PI * 2);
      this._add({
        type: 'spark', x, y,
        vx: Math.cos(a) * rng(20, 60), vy: Math.sin(a) * rng(20, 60),
        drag: 3, gravity: 0,
        color: '#80d0ff',
        size: rng(2, 4),
        life: 0.4, maxLife: 0.4, alpha: 1
      });
    }
  }

  clear() {
    this.particles = [];
  }
}
