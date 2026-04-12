export class Projectile {
  constructor() {
    this.active  = false;
    this.x       = 0;
    this.y       = 0;
    this.vx      = 0;
    this.vy      = 0;
    this.damage  = 0;
  }

  init(x, y, vx, vy, damage) {
    this.active  = true;
    this.x       = x;
    this.y       = y;
    this.vx      = vx;
    this.vy      = vy;
    this.damage  = damage;
  }

  update(dt, game, bounds) {
    if (!this.active) return;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Deactivate if off-screen
    if (this.x < -20 || this.x > bounds.w + 20 ||
        this.y < -20 || this.y > bounds.h + 20) {
      this.active = false;
      return;
    }

    // Collision vs enemies
    for (const e of game.enemyPool.pool) {
      if (!e.active) continue;
      const dx = this.x - e.x;
      const dy = this.y - e.y;
      if (dx * dx + dy * dy <= e.radius * e.radius) {
        e.hp -= this.damage;
        this.active = false;
        if (e.hp <= 0) {
          game.waveEarned += e.reward;
          e.active = false;
        }
        return;
      }
    }
  }
}

export class ProjectilePool {
  constructor(size) {
    this.pool = Array.from({ length: size }, () => new Projectile());
    this._bounds = { w: 800, h: 600 }; // updated by renderer each frame
  }

  acquire() {
    return this.pool.find(p => !p.active) ?? null;
  }

  fire(x, y, vx, vy, damage) {
    const p = this.acquire();
    if (p) p.init(x, y, vx, vy, damage);
    return p;
  }

  update(dt, game) {
    for (const p of this.pool) {
      if (p.active) p.update(dt, game, this._bounds);
    }
  }

  activeCount() {
    return this.pool.filter(p => p.active).length;
  }

  reset() {
    for (const p of this.pool) p.active = false;
  }
}
