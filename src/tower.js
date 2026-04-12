export class Tower {
  constructor() {
    this.maxHp           = 1000;
    this.hp              = 1000;
    this.damage          = 20;
    this.fireRate        = 1.5;   // shots per second
    this.projectileSpeed = 400;   // px/sec
    this.range           = 220;   // px — detection radius; if enemy outside, still target nearest
    this.fireCooldown    = 0;

    // Fire mode flags (set by upgrades)
    this.multiShotCount  = 1;     // tier 1 = 1 target (default)
    this.spreadShot      = false;
    this.spreadPellets   = 3;
    this.spreadAngle     = 20;    // degrees
    this.explosiveRadius = 0;
    this.chainJumps      = 0;
    this.laserUnlocked   = false;
    this.turretCount     = 0;

    // Regen (applied between waves)
    this.regenPerSec     = 0;

    // Visual
    this.x               = 0;    // set by renderer to canvas center
    this.y               = 0;
    this.radius          = 24;   // hex "radius" for drawing
  }

  update(dt, game) {
    this.fireCooldown -= dt;
    if (this.fireCooldown > 0) return;

    // Gather targets: up to multiShotCount enemies, prioritise nearest
    const enemies = game.enemyPool.pool
      .filter(e => e.active)
      .sort((a, b) => dist2(a, this) - dist2(b, this))
      .slice(0, this.multiShotCount);

    if (enemies.length === 0) return;

    for (const target of enemies) {
      this._fireAt(target, game);
    }

    this.fireCooldown = 1 / this.fireRate;
  }

  _fireAt(target, game) {
    const dx   = target.x - this.x;
    const dy   = target.y - this.y;
    const len  = Math.sqrt(dx * dx + dy * dy);
    const nx   = dx / len;
    const ny   = dy / len;

    if (this.spreadShot) {
      const half   = (this.spreadAngle / 2) * (Math.PI / 180);
      const step   = this.spreadPellets > 1 ? (half * 2) / (this.spreadPellets - 1) : 0;
      const startA = Math.atan2(ny, nx) - half;
      for (let i = 0; i < this.spreadPellets; i++) {
        const a  = startA + step * i;
        const vx = Math.cos(a) * this.projectileSpeed;
        const vy = Math.sin(a) * this.projectileSpeed;
        game.projectilePool.fire(this.x, this.y, vx, vy, this.damage);
      }
    } else {
      game.projectilePool.fire(
        this.x, this.y,
        nx * this.projectileSpeed,
        ny * this.projectileSpeed,
        this.damage
      );
    }
  }
}

function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
