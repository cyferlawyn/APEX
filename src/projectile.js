export class Projectile {
  constructor() {
    this.active          = false;
    this.x               = 0;
    this.y               = 0;
    this.vx              = 0;
    this.vy              = 0;
    this.damage          = 0;
    this.explosiveRadius = 0;   // 0 = no splash
    this.chainJumps      = 0;   // 0 = no chain
    this.chainDamage     = 0;   // damage for chain (set on fire)
  }

  init(x, y, vx, vy, damage, explosiveRadius = 0, chainJumps = 0) {
    this.active          = true;
    this.x               = x;
    this.y               = y;
    this.vx              = vx;
    this.vy              = vy;
    this.damage          = damage;
    this.explosiveRadius = explosiveRadius;
    this.chainJumps      = chainJumps;
    this.chainDamage     = damage * 0.6;
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
        this._onHit(e, game);
        return;
      }
    }
  }

  _onHit(target, game) {
    this.active = false;

    // Particle hit sparks
    if (game.particles) game.particles.emitHit(this.x, this.y, target.color);

    // Direct hit
    _damageEnemy(target, this.damage, game);

    // Explosive splash
    if (this.explosiveRadius > 0) {
      const r2 = this.explosiveRadius * this.explosiveRadius;
      for (const e of game.enemyPool.pool) {
        if (!e.active || e === target) continue;
        const dx = this.x - e.x;
        const dy = this.y - e.y;
        if (dx * dx + dy * dy <= r2) {
          _damageEnemy(e, this.damage * 0.6, game);
        }
      }
      // Register explosion flash for renderer
      game.explosions.push({ x: this.x, y: this.y, r: this.explosiveRadius, t: 0.25 });
    }

    // Chain lightning
    if (this.chainJumps > 0) {
      _chainFrom(this.x, this.y, target, this.chainDamage, this.chainJumps, game);
    }
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function _damageEnemy(e, dmg, game) {
  e.hp -= dmg;
  if (e.hp <= 0) {
    game.waveEarned += e.reward;
    // Death burst particles + expanding ring
    if (game.particles) game.particles.emitDeath(e.x, e.y, e.color);
    game.deathRings.push({ x: e.x, y: e.y, r: e.radius * 2.5, t: 0.35, color: e.color });
    // Boss arrival / death edge flash
    if (e.type === 'BOSS') game.edgeFlash = 0.5;
    e.active = false;
  }
}

function _chainFrom(x, y, lastHit, damage, jumpsLeft, game) {
  const CHAIN_RANGE = 120;
  const r2 = CHAIN_RANGE * CHAIN_RANGE;

  // Find nearest active enemy not already hit in this chain
  let best = null, bestD2 = Infinity;
  for (const e of game.enemyPool.pool) {
    if (!e.active || e === lastHit) continue;
    const dx = x - e.x, dy = y - e.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < r2 && d2 < bestD2) { best = e; bestD2 = d2; }
  }

  if (!best) return;

  // Register arc for renderer
  game.lightningArcs.push({ x1: x, y1: y, x2: best.x, y2: best.y, t: 0.15 });

  _damageEnemy(best, damage, game);

  if (jumpsLeft > 1) {
    _chainFrom(best.x, best.y, best, damage * 0.6, jumpsLeft - 1, game);
  }
}

// ── pool ─────────────────────────────────────────────────────────────────────

export class ProjectilePool {
  constructor(size) {
    this.pool    = Array.from({ length: size }, () => new Projectile());
    this._bounds = { w: 800, h: 600 };
  }

  acquire() {
    return this.pool.find(p => !p.active) ?? null;
  }

  fire(x, y, vx, vy, damage, explosiveRadius = 0, chainJumps = 0) {
    const p = this.acquire();
    if (p) p.init(x, y, vx, vy, damage, explosiveRadius, chainJumps);
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
