export class Tower {
  constructor() {
    this.maxHp           = 1000;
    this.hp              = 1000;
    this.damage          = 35;
    this.fireRate        = 1.5;   // shots per second
    this.projectileSpeed = 400;   // px/sec
    this.range           = 220;   // px
    this.fireCooldown    = 0;

    // Fire mode flags (set by upgrades)
    this.multiShotCount  = 1;
    this.spreadShot      = false;
    this.spreadPellets   = 3;
    this.spreadAngle     = 20;    // degrees
    this.explosiveRadius = 0;
    this.chainJumps      = 0;

    // Laser burst
    this.laserUnlocked   = false;
    this.laserTier       = 0;
    this.laserCooldown   = 0;     // time until next burst
    this.laserActive     = false; // currently sweeping
    this.laserAngle      = 0;     // current sweep angle (radians)
    this.laserTimer      = 0;     // time remaining in current burst

    // Rotating turrets
    this.turretCount     = 0;
    this.turretAngle     = 0;     // shared rotation angle (radians)
    this.turretCooldown  = 0;     // independent fire cooldown for turrets

    // Regen (applied between waves as a fraction of maxHp)
    this.regenFraction   = 0;     // e.g. 0.09 = heal 9% of maxHp per wave

    // Visual
    this.x               = 0;
    this.y               = 0;
    this.radius          = 24;
    this.hitFlash        = 0;     // seconds remaining for red hit flash
  }

  // Called by enemy when it reaches the tower
  takeDamage(amount, game) {
    this.hp       -= amount;
    this.hitFlash  = 0.12;
    if (game && game.particles) game.particles.emitTowerHit(this.x, this.y);
  }

  update(dt, game) {
    if (this.hitFlash > 0) this.hitFlash -= dt;

    this._updateMainGun(dt, game);
    if (this.turretCount > 0) this._updateTurrets(dt, game);
    if (this.laserUnlocked)   this._updateLaser(dt, game);
  }

  // ── Main gun ────────────────────────────────────────────────────────────────

  _updateMainGun(dt, game) {
    this.fireCooldown -= dt;
    if (this.fireCooldown > 0) return;

    const r2      = this.range * this.range;
    const targets = _nearestEnemies(game.enemyPool.pool, this, this.multiShotCount, r2);
    if (targets.length === 0) return;

    for (const target of targets) {
      this._fireAt(target, game, this.x, this.y);
    }

    this.fireCooldown = 1 / this.fireRate;
  }

  _fireAt(target, game, ox, oy) {
    const dx  = target.x - ox;
    const dy  = target.y - oy;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx  = dx / len;
    const ny  = dy / len;

    if (this.spreadShot) {
      const baseA = Math.atan2(ny, nx);
      const half  = (this.spreadAngle / 2) * (Math.PI / 180);
      const extra = this.spreadPellets - 1; // pellets beyond the center shot

      // Center shot — always aimed dead at target
      game.projectilePool.fire(
        ox, oy,
        nx * this.projectileSpeed,
        ny * this.projectileSpeed,
        this.damage,
        this.explosiveRadius,
        this.chainJumps,
      );

      // Extra pellets distributed evenly on both sides
      const step = extra > 0 ? half / Math.ceil(extra / 2) : 0;
      for (let i = 1; i <= extra; i++) {
        const side   = i % 2 === 1 ? 1 : -1;         // alternate left/right
        const offset = Math.ceil(i / 2) * step * side;
        const a      = baseA + offset;
        game.projectilePool.fire(
          ox, oy,
          Math.cos(a) * this.projectileSpeed,
          Math.sin(a) * this.projectileSpeed,
          this.damage,
          this.explosiveRadius,
          this.chainJumps,
        );
      }
    } else {
      game.projectilePool.fire(
        ox, oy,
        nx * this.projectileSpeed,
        ny * this.projectileSpeed,
        this.damage,
        this.explosiveRadius,
        this.chainJumps,
      );
    }
  }

  // ── Rotating turrets ────────────────────────────────────────────────────────

  _updateTurrets(dt, game) {
    // Turrets orbit at fixed angular spacing, rotate over time
    this.turretAngle  += dt * 0.8; // rad/sec rotation speed
    this.turretCooldown -= dt;

    if (this.turretCooldown > 0) return;

    // Each turret fires at the nearest enemy to its own position
    const orbitR = this.radius + 18;
    for (let i = 0; i < this.turretCount; i++) {
      const a  = this.turretAngle + (Math.PI * 2 / this.turretCount) * i;
      const tx = this.x + Math.cos(a) * orbitR;
      const ty = this.y + Math.sin(a) * orbitR;

      const r2     = this.range * this.range;
      const target = _nearestEnemies(game.enemyPool.pool, { x: tx, y: ty }, 1, r2)[0];
      if (!target) continue;

      const dx  = target.x - tx;
      const dy  = target.y - ty;
      const len = Math.sqrt(dx * dx + dy * dy);
      game.projectilePool.fire(
        tx, ty,
        (dx / len) * this.projectileSpeed,
        (dy / len) * this.projectileSpeed,
        this.damage * 0.7,   // turrets deal 70% of base damage
        this.explosiveRadius,
        0,                   // turrets don't chain (keeps visuals readable)
      );
    }

    this.turretCooldown = 1 / this.fireRate;
  }

  // ── Laser burst ─────────────────────────────────────────────────────────────

  _updateLaser(dt, game) {
    const BURST_DURATION = 1.5 + this.laserTier * 0.3;  // sec
    const BURST_COOLDOWN = 8   - this.laserTier * 1.0;  // sec (min ~4s at tier 4)
    const LASER_RANGE    = 180;
    const SWEEP_SPEED    = (Math.PI * 2) / BURST_DURATION; // full 360° per burst
    const DPS            = this.damage * this.fireRate * 0.5;

    if (this.laserActive) {
      this.laserTimer -= dt;
      this.laserAngle += SWEEP_SPEED * dt;

      // Damage enemies within range near the beam angle
      for (const e of game.enemyPool.pool) {
        if (!e.active) continue;
        const dx   = e.x - this.x;
        const dy   = e.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > LASER_RANGE) continue;

        const eAngle  = Math.atan2(dy, dx);
        let   dAngle  = Math.abs(eAngle - (this.laserAngle % (Math.PI * 2)));
        if (dAngle > Math.PI) dAngle = Math.PI * 2 - dAngle;
        if (dAngle < 0.15) { // ~8.5° beam half-width
          e.hp -= DPS * dt;
          if (e.hp <= 0) {
            game.waveEarned += e.reward;
            if (game.particles) game.particles.emitDeath(e.x, e.y, e.color);
            game.deathRings.push({ x: e.x, y: e.y, r: e.radius * 2.5, t: 0.35, color: e.color });
            if (e.type === 'BOSS') game.edgeFlash = 0.5;
            e.active = false;
          }
        }
      }

      if (this.laserTimer <= 0) {
        this.laserActive  = false;
        this.laserCooldown = BURST_COOLDOWN;
      }
    } else {
      this.laserCooldown -= dt;
      if (this.laserCooldown <= 0) {
        this.laserActive = true;
        this.laserTimer  = BURST_DURATION;
        this.laserAngle  = 0;
      }
    }
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function _nearestEnemies(pool, origin, count, maxR2 = Infinity) {
  return pool
    .filter(e => e.active && _dist2(e, origin) <= maxR2)
    .sort((a, b) => _dist2(a, origin) - _dist2(b, origin))
    .slice(0, count);
}

function _dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
