export const EnemyType = Object.freeze({
  DRONE: 'DRONE',
  SWARM: 'SWARM',
  BRUTE: 'BRUTE',
  ELITE: 'ELITE',
  BOSS:  'BOSS',
});

export class Enemy {
  constructor() {
    this.active       = false;
    this.x            = 0;
    this.y            = 0;
    this.hp           = 0;
    this.maxHp        = 0;
    this.speed        = 0;
    this.radius       = 0;
    this.color        = '#fff';
    this.shape        = 'circle';
    this.reward       = 0;
    this.type         = EnemyType.DRONE;
    this.atTower      = false;  // true once the enemy has reached the tower
    this.damageTick   = 0;      // countdown to next tower hit (seconds)
  }

  init(type, wave, x, y) {
    const def = BASE_STATS[type];
    const hpScale    = Math.pow(1.15, wave - 1);
    const speedScale = Math.pow(1.02, wave - 1);

    this.active     = true;
    this.atTower    = false;
    this.damageTick = 0;
    this.type       = type;
    this.x          = x;
    this.y          = y;
    this.maxHp      = Math.floor(def.hp * hpScale);
    this.hp         = this.maxHp;
    this.speed      = def.speed * speedScale;
    this.radius     = def.radius;
    this.color      = def.color;
    this.shape      = def.shape;
    this.reward     = def.reward;
  }

  update(dt, game) {
    if (!this.active) return;

    const tx   = game.tower.x;
    const ty   = game.tower.y;
    const dx   = tx - this.x;
    const dy   = ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < game.tower.radius + this.radius) {
      // At the tower — deal damage on arrival and every second thereafter
      if (!this.atTower) {
        this.atTower    = true;
        this.damageTick = 0; // immediate first hit
      }

      this.damageTick -= dt;
      if (this.damageTick <= 0) {
        game.tower.takeDamage(Math.ceil(this.maxHp * 0.1));
        this.damageTick = 1; // hit again every second
      }
      return; // stay in place — do not move
    }

    // Not yet at tower — move straight toward it
    this.atTower = false;
    const nx = dx / dist;
    const ny = dy / dist;
    this.x += nx * this.speed * dt;
    this.y += ny * this.speed * dt;
  }
}

export class EnemyPool {
  constructor(size) {
    this.pool = Array.from({ length: size }, () => new Enemy());
  }

  acquire() {
    return this.pool.find(e => !e.active) ?? null;
  }

  spawn(type, wave, x, y) {
    const e = this.acquire();
    if (e) e.init(type, wave, x, y);
    return e;
  }

  update(dt, game) {
    for (const e of this.pool) {
      if (e.active) e.update(dt, game);
    }
  }

  activeCount() {
    return this.pool.filter(e => e.active).length;
  }

  reset() {
    for (const e of this.pool) e.active = false;
  }
}

const BASE_STATS = {
  [EnemyType.DRONE]: { hp: 60,   speed: 90,  radius: 8,  color: '#00e5ff', shape: 'circle',  reward: 5  },
  [EnemyType.SWARM]: { hp: 20,   speed: 70,  radius: 5,  color: '#69ff47', shape: 'circle',  reward: 2  },
  [EnemyType.BRUTE]: { hp: 300,  speed: 45,  radius: 16, color: '#ff9100', shape: 'square',  reward: 20 },
  [EnemyType.ELITE]: { hp: 150,  speed: 75,  radius: 11, color: '#ea00ff', shape: 'triangle',reward: 12 },
  [EnemyType.BOSS]:  { hp: 2000, speed: 35,  radius: 28, color: '#ff1744', shape: 'hexagon', reward: 100},
};
