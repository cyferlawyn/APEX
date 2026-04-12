import { Game, State }    from './game.js';
import { Tower }           from './tower.js';
import { EnemyPool }       from './enemy.js';
import { ProjectilePool }  from './projectile.js';
import { WaveSpawner }     from './wave.js';
import { Renderer }        from './renderer.js';
import { Shop }            from './shop.js';
import { ParticleSystem }  from './particles.js';
import { save, load, clear, hasSave } from './storage.js';

const canvas   = document.getElementById('gameCanvas');
const game     = new Game();
const renderer = new Renderer(canvas, game);
const shop     = new Shop(game);

// --- bootstrap ---
function bootstrap() {
  const saved = load();

  game.tower          = new Tower();
  game.enemyPool      = new EnemyPool(512);
  game.projectilePool = new ProjectilePool(2048);
  game.waveSpawner    = new WaveSpawner(game);
  game.particles      = new ParticleSystem(512);

  if (saved) {
    game.wave               = saved.wave               ?? 1;
    game.currency           = saved.currency           ?? 100;
    game.upgrades           = saved.upgrades           ?? {};
    game.bestWave           = saved.bestWave           ?? 1;
    game.currencyMultiplier = saved.currencyMultiplier ?? 1.0;
    shop.reapplyAll(game.upgrades);
    // Restore tower HP after reapplyAll rebuilt the tower
    game.tower.hp = Math.min(saved.towerHP ?? game.tower.maxHp, game.tower.maxHp);
  }

  beginWave();
}

function beginWave() {
  game.enemyPool.reset();
  game.projectilePool.reset();
  if (game.particles) game.particles.reset();
  game.explosions    = [];
  game.lightningArcs = [];
  game.deathRings    = [];
  game.edgeFlash     = 0;
  // Apply regen between waves; full heal only on wave 1 (fresh start)
  if (game.wave === 1) {
    game.tower.hp = game.tower.maxHp;
  } else {
    game.tower.hp = Math.min(
      game.tower.hp + Math.floor(game.tower.maxHp * game.tower.regenFraction),
      game.tower.maxHp
    );
  }
  game.waveSpawner.begin(game.wave);
  game.waveEarned = 0;
  game.transition(State.COMBAT);
}

// --- main loop ---
let lastTime = 0;

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  update(dt);
  renderer.render();

  requestAnimationFrame(loop);
}

function update(dt) {
  switch (game.state) {
    case State.COMBAT:
      game.waveSpawner.update(dt);
      game.enemyPool.update(dt, game);
      game.projectilePool.update(dt, game);
      game.tower.update(dt, game);
      if (game.particles) game.particles.update(dt);
      if (game.resultsTimer > 0) game.resultsTimer -= dt;

      if (game.tower.hp <= 0) {
        game.tower.hp = 0;
        onDefeated();
      } else if (game.waveSpawner.done && game.enemyPool.activeCount() === 0) {
        onWaveComplete();
      }
      break;

    case State.DEFEATED:
      if (game.tickOverlay(dt)) {
        resetToWaveOne();
      }
      break;
  }
}

function onWaveComplete() {
  game.lastWaveEarned = game.waveEarned; // display value only — already credited live
  game.lastWave       = game.wave;
  game.waveEarned     = 0;

  if (game.wave > game.bestWave) game.bestWave = game.wave;

  saveGame();

  // Show results overlay but start next wave immediately
  game.resultsTimer = game.RESULTS_DURATION;
  game.wave += 1;
  beginWave();
}

function onDefeated() {
  game.waveEarned = 0;

  if (game.wave > game.bestWave) game.bestWave = game.wave;

  saveGame();
  game.transition(State.DEFEATED);
}

function resetToWaveOne() {
  game.wave = 1;
  // Upgrades and currency are kept — tower is rebuilt from upgrades
  shop.reapplyAll(game.upgrades);
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
}

// --- new game (full reset) ---
export function newGame(confirmed) {
  if (!confirmed && hasSave()) return;
  clear();
  game.wave               = 1;
  game.currency           = 100;
  game.upgrades           = {};
  game.currencyMultiplier = 1.0;
  game.bestWave           = 1;
  game.resultsTimer       = 0;
  game.tower              = new Tower();
  shop.reapplyAll({});
  beginWave();
}

// --- self-destruct: treat as a voluntary defeat (keeps upgrades + currency) ---
export function selfDestruct() {
  onDefeated();
}

// Expose to UI
window.__apex = { newGame, selfDestruct, shop, game, hasSave };

// --- go ---
bootstrap();
requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
