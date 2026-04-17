import { Game, State }    from './game.js';
import { Tower }           from './tower.js';
import { EnemyPool }       from './enemy.js';
import { ProjectilePool, killEnemy, obliterateWave } from './projectile.js';
import { WaveSpawner }     from './wave.js';
import { Renderer }        from './renderer.js';
import { Shop }            from './shop.js';
import { PrestigeShop }    from './prestige.js';
import { TraitorSystem }   from './traitor.js';
import { ParticleSystem }  from './particles.js';
import { audio }           from './audio.js';
import { save, load, clear, hasSave, savePrefs, loadPrefs,
         savePrestige, loadPrestige, clearPrestige,
         saveTraitors, loadTraitors, clearTraitors } from './storage.js';

const canvas        = document.getElementById('gameCanvas');
const game          = new Game();
const renderer      = new Renderer(canvas, game);
const shop          = new Shop(game);
const prestigeShop  = new PrestigeShop(game);

// --- bootstrap ---
function bootstrap() {
  const saved   = load();
  const prefs   = loadPrefs();
  const prestige = loadPrestige();

  game.tower          = new Tower();
  game.enemyPool      = new EnemyPool(512);
  game.projectilePool = new ProjectilePool(2048);
  game.waveSpawner    = new WaveSpawner(game);
  game.particles      = new ParticleSystem(2048);
  game.traitorSystem  = new TraitorSystem();

  // Restore preferences (quality, volume) — independent of save data
  if (prefs) {
    if (prefs.quality)             game.quality     = prefs.quality;
    if (prefs.autoQuality != null) game.autoQuality = prefs.autoQuality;
    if (prefs.volume != null)      audio.setVolume(prefs.volume);
  }

  // Restore prestige state — persists across runs and New Game
  if (prestige) {
    game.shards             = prestige.shards            ?? 0;
    game.pendingShards      = prestige.pendingShards     ?? 0;
    game.totalShardsEarned  = prestige.totalShardsEarned ?? prestige.shards ?? 0;
    game.prestigeUpgrades   = prestige.prestigeUpgrades  ?? {};
    game.ascensionCount     = prestige.ascensionCount    ?? 0;
  }

  // Restore traitor system — persists across runs and ascensions, wiped only on hard reset
  game.traitorSystem.deserialize(loadTraitors());

  // Apply prestige upgrades on top of fresh tower (before run save overwrites tiers)
  prestigeShop.reapplyAll(game.prestigeUpgrades);

  if (saved) {
    game.wave               = saved.wave               ?? 1;
    game.currency           = saved.currency           ?? 0;
    game.upgrades           = saved.upgrades           ?? {};
    game.bestWave           = saved.bestWave           ?? 1;
    game.currencyMultiplier = saved.currencyMultiplier ?? 1.0;
    shop.reapplyAll(game.upgrades);
    // Re-apply prestige after run upgrades (prestige is additive on top)
    prestigeShop.reapplyAll(game.prestigeUpgrades);
    // Restore tower HP after reapplyAll rebuilt the tower
    game.tower.hp = Math.min(saved.towerHP ?? game.tower.maxHp, game.tower.maxHp);
  }

  beginWave();
}

function beginWave(keepEnemies = false) {
  if (!keepEnemies) game.enemyPool.reset();
  game.projectilePool.reset();
  if (game.particles) game.particles.reset();
  game.explosions     = [];
  game.lightningArcs  = [];
  game.ricochetLines  = [];
  game.deathRings     = [];
  game.edgeFlash      = 0;
  game.currencyPopups = [];
  game.skullPopups       = [];
  game.obliterateTimer   = -1;
  game.obliterateOverkill = 0;
  game.blastwaves        = [];
  game.elapsed        = 0;  // reset per-wave timestamp used by slow/stun
  // Apply regen between waves; full heal only on wave 1 (fresh start)
  if (game.wave === 1) {
    game.tower.hp = game.tower.maxHp;
  } else {
    game.tower.hp = Math.min(
      game.tower.hp + Math.floor(game.tower.maxHp * game.tower.regenFraction),
      game.tower.maxHp
    );
  }
  // Refresh shield charges at wave start
  if (game.tower.shieldChargesMax > 0) {
    game.tower.shieldCharges = game.tower.shieldChargesMax;
  }
  game.tower.invulnTimer = 0;
  game.tower.overchargeCounter = 0;
  game.waveSpawner.begin(game.wave);
  game.waveEarned = 0;
  game.waveKills  = 0;
  game.transition(State.COMBAT);
}

// --- main loop ---
let lastTime = 0;

// FPS tracking — ring buffer of last 120 frame durations
const FPS_BUF_SIZE = 120;
const _fpsBuf      = new Float32Array(FPS_BUF_SIZE);
let   _fpsCursor   = 0;
let   _fpsSum      = 0;

// AUTO quality state
let _autoLowTimer  = 0;   // seconds of sustained sub-55 fps
let _autoCooldown  = 0;   // seconds until next AUTO step-down is allowed

const AUTO_THRESHOLD = 55;   // fps below this triggers the timer
const AUTO_SUSTAIN   = 3.0;  // seconds below threshold before stepping down
const AUTO_COOLDOWN  = 10.0; // seconds locked out after a step-down

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  // Rolling FPS average
  _fpsSum -= _fpsBuf[_fpsCursor];
  _fpsBuf[_fpsCursor] = dt;
  _fpsSum += dt;
  _fpsCursor = (_fpsCursor + 1) % FPS_BUF_SIZE;
  const avgDt = _fpsSum / FPS_BUF_SIZE;
  game.fps = Math.round(1 / avgDt);

  // AUTO quality step-down
  if (game.autoQuality && game.quality !== 'low') {
    if (_autoCooldown > 0) {
      _autoCooldown -= dt;
    } else if (game.fps < AUTO_THRESHOLD) {
      _autoLowTimer += dt;
      if (_autoLowTimer >= AUTO_SUSTAIN) {
        _autoLowTimer = 0;
        _autoCooldown = AUTO_COOLDOWN;
        const next = game.quality === 'high' ? 'medium' : 'low';
        game.quality = next;
        savePrefs({ quality: next, volume: audio.volume, autoQuality: true });
        // Sync quality UI (defined in ui.js, exposed on window)
        window.__syncQualityUI?.();
      }
    } else {
      _autoLowTimer = 0; // reset timer whenever FPS recovers
    }
  }

  update(dt);
  renderer.render();

  requestAnimationFrame(loop);
}

function tickAutoBuy(dt) {
  const interval = game.autoBuyInterval ?? 0;
  if (interval === 0 && (game.prestigeUpgrades?.autoBuy ?? 0) === 0) return;

  if (interval > 0) {
    game.autoBuyTimer = (game.autoBuyTimer ?? 0) + dt;
    if (game.autoBuyTimer < interval) return;
    // Do NOT reset the timer yet — only reset on a successful purchase so that
    // if nothing is affordable we keep retrying each frame until currency allows it.
  }

  // Find cheapest non-maxed shop upgrade
  let bestId   = null;
  let bestCost = Infinity;
  for (const entry of shop.catalogue) {
    if (shop.isMaxed(entry.id)) continue;
    const c = shop.cost(entry.id);
    if (c < bestCost) { bestCost = c; bestId = entry.id; }
  }
  if (bestId !== null && shop.canAfford(bestId)) {
    shop.purchase(bestId);
    game.autoBuyTimer = 0;  // restart interval only after a successful purchase
  }
}

function update(dt) {
  switch (game.state) {
    case State.COMBAT:
      game.elapsed = (game.elapsed ?? 0) + dt;
      game.enemyPool.update(dt, game);
      game.projectilePool.update(dt, game);
      game.tower.update(dt, game);
      if (game.particles) game.particles.update(dt);
      if (game.resultsTimer > 0) game.resultsTimer -= dt;
      game.tickEarnLog(dt);
      tickAutoBuy(dt);

      // Obliterate countdown
      if (game.obliterateTimer > 0) {
        game.obliterateTimer -= dt;
        if (game.obliterateTimer <= 0) {
          game.obliterateTimer = -1;
          // Kill off-screen enemies instantly — the blastwave won't reach them
          for (const e of game.enemyPool.pool) {
            if (!e.active) continue;
            if (e.x < 0 || e.x > canvas.width || e.y < 0 || e.y > canvas.height) {
              killEnemy(e, game);
            }
          }
          // Emit the blastwave from the tower — it will kill on-screen enemies on contact
          const tx = game.tower.x, ty = game.tower.y;
          // maxR: distance from tower to the farthest canvas corner
          const maxR = Math.sqrt(
            Math.max(tx, canvas.width  - tx) ** 2 +
            Math.max(ty, canvas.height - ty) ** 2
          ) * 1.15;
          const speed = maxR / 0.28; // crosses screen in 0.28 s
          game.blastwaves.push({ x: tx, y: ty, r: game.tower.radius + 4,
            maxR, speed, t: 0.7, life: 0.7, done: false });
        }
      }

      // Blastwave contact kills — expand rings and kill enemies they sweep over
      for (const w of game.blastwaves) {
        if (w.done) continue;
        w.r += w.speed * dt;
        const r2 = w.r * w.r;
        for (const e of game.enemyPool.pool) {
          if (!e.active) continue;
          const dx = e.x - w.x, dy = e.y - w.y;
          if (dx * dx + dy * dy <= r2) {
            const ex = e.x, ey = e.y, ec = e.color; // snapshot before deactivate
            killEnemy(e, game);
            if (game.particles && game.quality !== 'low') {
              game.particles.emitObliterateKill(ex, ey, ec);
            }
          }
        }
        if (w.r >= w.maxR) {
          w.done = true;
          obliterateWave(game); // catch any off-screen stragglers
        }
      }

      if (game.tower.hp <= 0) {        game.tower.hp = 0;
        onDefeated();
      } else if (game.enemyPool.activeCount() === 0) {
        onWaveComplete();
      } else if (game.tower.waveSkipThreshold > 0 && game.wave % 10 !== 0) {
        const total = game.waveSpawner.totalSpawned;
        if (total > 0 && game.waveKills / total >= game.tower.waveSkipThreshold) {
          onWaveComplete(true);  // keepEnemies — rollovers carry into next wave
        }
      }
      break;

    case State.DEFEATED:
      if (game.tickOverlay(dt)) {
        resetToWaveOne();
      }
      break;
  }
}

function onWaveComplete(keepEnemies = false) {
  game.lastWaveEarned = game.waveEarned; // display value only — already credited live
  game.lastWave       = game.wave;
  game.waveEarned     = 0;

  game.wave += 1;
  if (game.wave - 1 > game.bestWave) game.bestWave = game.wave - 1;

  saveGame();
  audio.waveComplete();

  // Show results overlay but start next wave immediately
  game.resultsTimer = game.RESULTS_DURATION;
  beginWave(keepEnemies);
}

function onDefeated() {
  game.waveEarned = 0;

  if (game.wave > game.bestWave) game.bestWave = game.wave;

  saveGame();
  audio.laserStop(); // cut laser drone if it was active
  audio.defeated();
  game.transition(State.DEFEATED);
}

function resetToWaveOne() {
  // Fall back to the last x1 wave (e.g. die on 38 → restart at 31, die on 93 → restart at 91)
  game.wave = Math.max(1, Math.floor((game.wave - 1) / 10) * 10 + 1);
  // Upgrades and currency are kept — tower is rebuilt from upgrades
  shop.reapplyAll(game.upgrades);
  prestigeShop.reapplyAll(game.prestigeUpgrades);
  beginWave();
}

function saveGame() {
  save({
    wave:               game.wave,
    currency:           game.currency,
    towerHP:            game.tower.hp,
    upgrades:           game.upgrades,
    bestWave:           game.bestWave,
    currencyMultiplier: game.currencyMultiplier,
  });
  _savePrestigeState();
  saveTraitors(game.traitorSystem.serialize());
}

function _savePrestigeState() {
  savePrestige({
    shards:             game.shards,
    pendingShards:      game.pendingShards,
    totalShardsEarned:  game.totalShardsEarned,
    prestigeUpgrades:   game.prestigeUpgrades,
    ascensionCount:     game.ascensionCount,
  });
}

// --- new game (full reset, keeps prestige) ---
export function newGame(confirmed) {
  if (!confirmed && hasSave()) return;
  clear();
  clearTraitors();
  game.wave               = 1;
  game.currency           = 0;
  game.upgrades           = {};
  game.currencyMultiplier = 1.0;
  game.bestWave           = 1;
  game.resultsTimer       = 0;
  game.tower              = new Tower();
  shop.reapplyAll({});
  prestigeShop.reapplyAll(game.prestigeUpgrades);
  // Apply War Chest start currency
  game.currency = game.prestigeStartCurrency ?? 0;
  game.wave     = game.prestigeStartWave ?? 1;
  beginWave();
}

// --- ascend: convert pending shards, wipe run, keep prestige ---
export function ascend() {
  // Veteran's Bounty: award bonus shards based on wave reached this run
  if (game.veteranBonusDivisor > 0) {
    game.pendingShards += Math.floor(game.wave / game.veteranBonusDivisor);
  }

  // Bank pending shards — now they count toward the passive damage bonus
  game.totalShardsEarned += game.pendingShards;
  game.shards            += game.pendingShards;
  game.pendingShards      = 0;
  game.ascensionCount    += 1;

  // Wipe run state
  clear();
  game.wave               = 1;
  game.currency           = 0;
  game.upgrades           = {};
  game.currencyMultiplier = 1.0;
  game.resultsTimer       = 0;
  game.tower              = new Tower();
  shop.reapplyAll({});
  prestigeShop.reapplyAll(game.prestigeUpgrades);

  // Apply run-start bonuses from prestige
  game.currency = game.prestigeStartCurrency ?? 0;
  game.wave     = game.prestigeStartWave ?? 1;

  _savePrestigeState();
  beginWave();
}

// --- self-destruct: treat as a voluntary defeat (keeps upgrades + currency) ---
export function selfDestruct() {
  onDefeated();
}

// --- quality setting ---
export function setQuality(q) {
  if (q === 'auto') {
    game.autoQuality = true;
    // Reset timers so it starts fresh from current quality
    _autoLowTimer = 0;
    _autoCooldown = 0;
  } else {
    game.autoQuality = false;
    game.quality     = q;
    _autoLowTimer    = 0;
    _autoCooldown    = 0;
  }
  savePrefs({ quality: game.quality, volume: audio.volume, autoQuality: game.autoQuality });
}

// Expose to UI
window.__apex = { newGame, ascend, selfDestruct, shop, prestigeShop, game, hasSave, audio, setQuality, savePrefs, saveTraitors };

// Init AudioContext on first user gesture (browser autoplay policy)
document.addEventListener('click',    () => audio.init(), { once: true });
document.addEventListener('keydown',  () => audio.init(), { once: true });
document.addEventListener('pointerdown', () => audio.init(), { once: true });

// --- go ---
bootstrap();
requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
