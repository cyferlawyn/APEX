import { Game, State } from './game.js';
import { Tower }        from './tower.js';
import { EnemyPool }    from './enemy.js';
import { ProjectilePool } from './projectile.js';
import { WaveSpawner }  from './wave.js';
import { Renderer }     from './renderer.js';
import { Shop }         from './shop.js';
import { save, load, clear, hasSave } from './storage.js';

const canvas  = document.getElementById('gameCanvas');
const game    = new Game();
const renderer = new Renderer(canvas, game);
const shop    = new Shop(game);

// --- bootstrap ---
function bootstrap() {
  const saved = load();

  game.tower          = new Tower();
  game.enemyPool      = new EnemyPool(256);
  game.projectilePool = new ProjectilePool(1024);
  game.waveSpawner    = new WaveSpawner(game);

  if (saved) {
    game.wave      = saved.wave      ?? 1;
    game.currency  = saved.currency  ?? 100;
    game.upgrades  = saved.upgrades  ?? {};
    game.tower.hp  = saved.towerHP   ?? game.tower.maxHp;
    game.currencyMultiplier = saved.currencyMultiplier ?? 1.0;
    shop.reapplyAll(game.upgrades);
  }

  game.transition(State.SHOP);
}

// --- main loop ---
let lastTime = 0;

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1); // seconds, capped at 100ms
  lastTime = timestamp;

  update(dt);
  renderer.render();

  requestAnimationFrame(loop);
}

function update(dt) {
  switch (game.state) {
    case State.SHOP:
      // Idle — waiting for player to click Start Wave
      break;

    case State.COMBAT:
      game.waveSpawner.update(dt);
      game.enemyPool.update(dt, game);
      game.projectilePool.update(dt, game);
      game.tower.update(dt, game);

      // Check wave-end conditions
      if (game.tower.hp <= 0) {
        game.tower.hp = 0;
        game.transition(State.GAME_OVER);
      } else if (game.waveSpawner.done && game.enemyPool.activeCount() === 0) {
        onWaveComplete();
      }
      break;

    case State.RESULTS:
      game.tickResults(dt);
      break;

    case State.GAME_OVER:
      // Idle — waiting for player input via UI
      break;
  }
}

function onWaveComplete() {
  // Apply currency multiplier and bank earnings
  const earned = Math.floor(game.waveEarned * game.currencyMultiplier);
  game.currency      += earned;
  game.lastWaveEarned = earned;
  game.lastWave       = game.wave;
  game.waveEarned     = 0;

  // Advance wave counter
  game.wave += 1;

  // HP regen between waves
  game.tower.hp = Math.min(game.tower.hp + game.tower.regenPerSec * 10, game.tower.maxHp);

  // Auto-save
  saveGame();

  game.resultsTimer = 0;
  game.transition(State.RESULTS);
}

function saveGame() {
  save({
    wave:               game.wave,
    currency:           game.currency,
    towerHP:            game.tower.hp,
    upgrades:           game.upgrades,
    currencyMultiplier: game.currencyMultiplier,
  });
}

// --- UI event wiring (delegated from renderer/shop UI) ---
export function startWave() {
  if (game.state !== State.SHOP) return;
  game.waveSpawner.begin(game.wave);
  game.waveEarned = 0;
  game.transition(State.COMBAT);
}

export function newGame(confirmed) {
  if (!confirmed && hasSave()) return; // renderer must show dialogue first
  clear();
  game.wave      = 1;
  game.currency  = 100;
  game.upgrades  = {};
  game.currencyMultiplier = 1.0;
  game.tower     = new Tower();
  game.enemyPool.reset();
  game.projectilePool.reset();
  game.transition(State.SHOP);
}

// Expose to renderer for button handlers
window.__apex = { startWave, newGame, shop, game, hasSave };

// --- go ---
bootstrap();
requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });
