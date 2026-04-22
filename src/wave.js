import { EnemyType } from './enemy.js';
import { audio }     from './audio.js';

// Returns a spawn point on the canvas perimeter at a given angle (radians),
// measured from the canvas centre.  The point is `margin` pixels outside the edge.
function perimeterPoint(angle, w, h, margin) {
  const cx = w / 2, cy = h / 2;
  const cos = Math.cos(angle), sin = Math.sin(angle);

  // Find which edge the ray hits first (scale to reach each edge)
  const tx = cos !== 0 ? (cos > 0 ? (cx + margin) : -(cx + margin)) / cos : Infinity;
  const ty = sin !== 0 ? (sin > 0 ? (cy + margin) : -(cy + margin)) / sin : Infinity;
  const t  = Math.min(Math.abs(tx), Math.abs(ty));

  return { x: cx + cos * t, y: cy + sin * t };
}

export class WaveSpawner {
  constructor(game) {
    this.game         = game;
    this.done         = true;
    this.totalSpawned = 0;
  }

  begin(waveNumber) {
    const entries     = buildWave(waveNumber);
    const rollovers   = this.game.enemyPool.activeCount();
    this.done         = true;

    const bounds = this.game.projectilePool._bounds;
    const w = bounds.w;
    const h = bounds.h;
    const margin = 40;
    // Max push-back so enemies are just off-screen, not hundreds of px away.
    const MAX_PUSHBACK = margin + 60;

    let spawned = 0;
    for (const entry of entries) {
      // Radial spawn: pick a random angle from canvas centre → perimeter point.
      // Swarm clusters share one angle (entry.angle pre-assigned in buildWave).
      const jitter = entry.type === EnemyType.SWARM ? (Math.random() - 0.5) * 80 : 0;
      const angle  = (entry.angle ?? (Math.random() * Math.PI * 2)) + (entry.type === EnemyType.SWARM ? (Math.random() - 0.5) * 0.25 : 0);
      const pt     = perimeterPoint(angle, w, h, margin);

      // Apply jitter perpendicular to the spawn direction
      const perpX = -Math.sin(angle), perpY = Math.cos(angle);
      const x = pt.x + perpX * jitter;
      const y = pt.y + perpY * jitter;

      const e = this.game.enemyPool.spawn(entry.type, entry.wave ?? this.game.wave, x, y, this.game);
      if (!e) continue; // pool exhausted — don't count unspawned entries
      spawned++;

      // Push enemy further back along spawn angle, capped so it stays near-screen.
      if (entry.delay > 0) {
        const extra = Math.min(entry.delay * e.baseSpeed, MAX_PUSHBACK);
        const cos   = Math.cos(angle), sin = Math.sin(angle);
        e.x += cos * extra;
        e.y += sin * extra;
      }

      if (entry.type === EnemyType.BOSS) {
        this.game.edgeFlash = 0.6;
        audio.bossArrival();
      }
    }

    // totalSpawned = only enemies that actually made it into the pool
    this.totalSpawned = spawned + rollovers;
  }
}

function buildWave(wave) {
  const entries = [];

  // Boss wave
  if (wave % 10 === 0) {
    entries.push({ type: EnemyType.BOSS, delay: 0 });

    // Colossus escort — ramps up every 20 waves from wave 20
    const colossusCount = wave >= 20 ? Math.min(Math.floor((wave - 10) / 20) + 1, 5) : 0;
    for (let i = 0; i < colossusCount; i++) {
      entries.push({ type: EnemyType.COLOSSUS, delay: 1.5 + i * 1.5 });
    }

    // Brute wave-crashers — added from wave 50, grow every 25 waves
    const bruteCount = wave >= 50 ? Math.min(Math.floor((wave - 50) / 25) * 2 + 4, 12) : 0;
    for (let i = 0; i < bruteCount; i++) {
      entries.push({ type: EnemyType.BRUTE, delay: 0.5 + i * 0.4 });
    }

    return entries;
  }

  const rawCount = Math.min(Math.floor(3 + wave * 0.8 + Math.pow(wave, 1.5) * 0.15), 200);
  // Slot cap ramps from 1 to 150 over waves 1-500, then holds at 150.
  const slotCap = Math.round(1 + (Math.min(wave, 500) - 1) * (149 / 499));
  const count   = Math.min(rawCount, slotCap);
  const interval = 0.2;

  const MAX_SWARMS = 10;
  const SWARM_SIZE = 10;
  let swarmCount = 0;
  let t = 0;
  for (let i = 0; i < count; i++) {
    // 15% chance per slot (wave 11+) to replace with a swarm cluster, capped at 10 clusters
    if (wave >= 11 && swarmCount < MAX_SWARMS && Math.random() < 0.15) {
      const clusterAngle = Math.random() * Math.PI * 2;
      for (let s = 0; s < SWARM_SIZE; s++) {
        entries.push({ type: EnemyType.SWARM, delay: t + s * 0.03, angle: clusterAngle });
      }
      swarmCount++;
      t += interval;
    } else {
      entries.push({ type: pickType(wave), delay: t });
      t += interval;
    }
  }

  return entries;
}

function pickType(wave) {
  const pool = [EnemyType.DRONE];

  if (wave >= 4)  pool.push(EnemyType.DASHER, EnemyType.DASHER);
  if (wave >= 5)  pool.push(EnemyType.ELITE, EnemyType.ELITE);
  if (wave >= 7)  pool.push(EnemyType.BOMBER);
  if (wave >= 8)  pool.push(EnemyType.BRUTE);
  if (wave >= 12) pool.push(EnemyType.ELITE, EnemyType.BRUTE);
  if (wave >= 14) pool.push(EnemyType.PHANTOM, EnemyType.PHANTOM);
  if (wave >= 18) pool.push(EnemyType.SPAWNER);
  if (wave >= 20) pool.push(EnemyType.COLOSSUS);
  if (wave >= 25) pool.push(EnemyType.SPAWNER, EnemyType.COLOSSUS);

  return pool[Math.floor(Math.random() * pool.length)];
}

// Returns the deduplicated set of enemy types that can appear on a given wave number.
export function availableEnemyTypes(wave) {
  const set = new Set();
  if (wave % 10 === 0) {
    set.add(EnemyType.BOSS);
    if (wave >= 20) set.add(EnemyType.COLOSSUS);
    if (wave >= 50) set.add(EnemyType.BRUTE);
  } else {
    set.add(EnemyType.DRONE);
    if (wave >= 4)  set.add(EnemyType.DASHER);
    if (wave >= 5)  set.add(EnemyType.ELITE);
    if (wave >= 7)  set.add(EnemyType.BOMBER);
    if (wave >= 8)  set.add(EnemyType.BRUTE);
    if (wave >= 11) set.add(EnemyType.SWARM);
    if (wave >= 14) set.add(EnemyType.PHANTOM);
    if (wave >= 18) set.add(EnemyType.SPAWNER);
    if (wave >= 20) set.add(EnemyType.COLOSSUS);
  }
  return [...set];
}
