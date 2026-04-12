import { EnemyType } from './enemy.js';

export class WaveSpawner {
  constructor(game) {
    this.game      = game;
    this.queue     = [];  // [{type, delay}] remaining to spawn
    this.elapsed   = 0;
    this.done      = true;
  }

  begin(waveNumber) {
    this.queue   = buildWave(waveNumber);
    this.elapsed = 0;
    this.done    = false;
  }

  update(dt) {
    if (this.done) return;
    this.elapsed += dt;

    while (this.queue.length > 0 && this.elapsed >= this.queue[0].delay) {
      const entry = this.queue.shift();
      this._spawnOne(entry.type);
    }

    if (this.queue.length === 0) this.done = true;
  }

  _spawnOne(type) {
    const canvas = this.game.tower; // we need canvas size — use projectilePool bounds
    const bounds = this.game.projectilePool._bounds;
    const w = bounds.w;
    const h = bounds.h;

    // Pick random edge
    const edge = Math.floor(Math.random() * 4);
    let x, y;
    const margin = 40;
    switch (edge) {
      case 0: x = Math.random() * w; y = -margin;    break; // top
      case 1: x = Math.random() * w; y = h + margin; break; // bottom
      case 2: x = -margin;           y = Math.random() * h; break; // left
      case 3: x = w + margin;        y = Math.random() * h; break; // right
    }

    this.game.enemyPool.spawn(type, this.game.wave, x, y);
    // Boss arrival: trigger screen-edge flash
    if (type === EnemyType.BOSS) this.game.edgeFlash = 0.6;
  }
}

function buildWave(wave) {
  const entries = [];

  // Boss wave
  if (wave % 10 === 0) {
    entries.push({ type: EnemyType.BOSS, delay: 0 });
    return entries;
  }

  const count = Math.min(Math.floor(5 + wave * 1.5), 80);
  const interval = 0.4; // seconds between spawns

  for (let i = 0; i < count; i++) {
    entries.push({ type: pickType(wave, i, count), delay: i * interval });
  }

  return entries;
}

function pickType(wave, index, total) {
  // Swarm cluster: 20% chance on wave 3+, replace ~30% of a wave with swarm
  if (wave >= 3 && index < Math.floor(total * 0.3) && Math.random() < 0.2) {
    return EnemyType.SWARM;
  }

  // Weighted pool based on wave
  const pool = [EnemyType.DRONE];
  if (wave >= 5)  pool.push(EnemyType.ELITE, EnemyType.ELITE);
  if (wave >= 8)  pool.push(EnemyType.BRUTE);
  if (wave >= 12) pool.push(EnemyType.ELITE, EnemyType.BRUTE);

  return pool[Math.floor(Math.random() * pool.length)];
}
