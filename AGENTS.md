# AGENTS.md — APEX

## Run / serve

```
npm start          # serves on http://localhost:3000
```

ES modules are **blocked over `file://`** — always use the dev server, never open `index.html` directly.

## Syntax checking (no build step)

```
node --check src/<file>.js
```

Run this on every modified file before committing. There is no bundler, linter, or test suite.

## Commit + push convention

- Every commit must leave the game **fully playable** — no broken game loop, no runtime errors.
- **Always push immediately after committing** (`git push`).
- Use **semantic versioning** for tags after each concluded session (`git tag vX.Y.Z && git push origin vX.Y.Z`).
  - patch — bug fixes, balance tweaks, polish
  - minor — new features or content
  - major — large redesigns

## Architecture

Vanilla JS ES modules, no bundler. Entry point: `src/main.js` → `requestAnimationFrame` loop.

| File | Responsibility |
|---|---|
| `src/main.js` | Game loop, FPS ring buffer, AUTO quality step-down, save/load wiring |
| `src/game.js` | `Game` state object, `State` enum (`COMBAT` / `DEFEATED`), earn-log |
| `src/tower.js` | Tower stats, main gun, laser burst, orbital ring — all combat logic |
| `src/projectile.js` | Projectile pool, collision, chain lightning, explosive splash |
| `src/enemy.js` | Enemy pool, `BASE_STATS`, per-wave HP/speed scaling |
| `src/wave.js` | `buildWave()` — spawn queue with delays |
| `src/shop.js` | Upgrade catalogue, cost formula, `reapplyAll()` |
| `src/renderer.js` | All canvas drawing, HUD, overlays |
| `src/particles.js` | Particle pool |
| `src/ui.js` | DOM shop panel, quality buttons, `patchShopCards()` every 250 ms |
| `src/audio.js` | Procedural Web Audio — no audio files |
| `src/storage.js` | `save`/`load`/`clear` under key `apex_save`; prefs under `apex_prefs` |

## Key gotchas

**`reapplyAll()` in `shop.js`** must reset `game.currencyMultiplier = 1.0` before replaying upgrades or Bounty compounds on every defeat/reload. Already done — don't remove it.

**`AudioContext` autoplay policy** — `audio.init()` must call `ctx.resume()` every time the context is suspended, not only on first call. Wired to `click`, `keydown`, `pointerdown`.

**Canvas coordinate space** is clamped to 400–1600 × 300–900 px in `renderer._resize()` to prevent off-screen spawns at unusual browser zoom levels. Don't replace `offsetWidth/Height` with `innerWidth` etc.

**`ctx.arc` anticlockwise** — always draw clockwise (`anticlockwise` omitted or `false`). Passing `true` draws the complement arc.

**Orbital Death Ring orbit** is at `tower.radius + 16` px — intentionally close to the tower to catch point-blank enemies. The same value appears in both `tower.js` (`ORBIT_R`) and `renderer.js` (`orbitR`). Keep them in sync.

**Laser / ring DPS multipliers are very high by design** — contact time per sweep pass is ~0.08 s (laser) and ~0.35 s (ring), so raw DPS must be large to feel impactful.

**`window.__apex`** is the bridge between `main.js` and `ui.js`. `window.__syncQualityUI` is exposed by `ui.js` so `main.js` can update quality buttons after AUTO step-down.

**Swarm clusters** spawn from wave 11 onward only (not earlier — player lacks AoE to handle them).

## Save keys

| Key | Contents |
|---|---|
| `apex_save` | wave, currency, towerHP, upgrades, bestWave, currencyMultiplier |
| `apex_prefs` | quality, autoQuality, volume — survives New Game |

## Upgrade catalogue notes

- `shop.js` catalogue order = display order in the shop panel.
- `maxTier: null` = unlimited (Damage only).
- The "shot modifier" upgrades are ordered by intended buy progression: Spread Shot → Orbital Death Ring → Explosive Rounds → Laser Burst → Chain Lightning → Multi-Shot.
- Bounty (`currencyMult`) has 15 tiers; all shot modifiers have 5 tiers; Chain Lightning has 5 tiers.
- `costMult` for Damage is 1.25 (lower than other upgrades — intentional).
