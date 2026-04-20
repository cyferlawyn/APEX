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
- Current series is **v1.x** — do not bump to v2.x without an explicit major redesign decision.
- Latest tag: **v1.11.6**

## Architecture

Vanilla JS ES modules, no bundler. Entry point: `src/main.js` → `requestAnimationFrame` loop.

| File | Responsibility |
|---|---|
| `src/main.js` | Game loop, FPS ring buffer, AUTO quality step-down, save/load wiring, `beginWave()` |
| `src/game.js` | `Game` state object, `State` enum (`COMBAT` / `DEFEATED`), earn-log |
| `src/tower.js` | Tower stats, main gun, laser burst, orbital ring — all combat logic; `normalizedShotDamage()` |
| `src/projectile.js` | Projectile pool, collision, chain lightning, explosive splash, `checkObliterateAtWaveStart()` |
| `src/enemy.js` | Enemy pool, `BASE_STATS`, per-wave HP/speed scaling |
| `src/wave.js` | `buildWave()` — spawn queue with delays |
| `src/shop.js` | Shop upgrade catalogue (sorted by cost), cost formula, `reapplyAll()` |
| `src/prestige.js` | Prestige upgrade catalogue (sorted by baseCost), `PrestigeShop`, `reapplyAll()` |
| `src/faction.js` | `FACTIONS`, `FACTION_NODES`, `FACTION_CAPSTONES`, `FactionSystem` class |
| `src/traitor.js` | Traitor (pet) system — `RARITIES`, `MERGE_ONLY_RARITIES`, `RARITY_BONUS`, capture/merge logic |
| `src/renderer.js` | All canvas drawing, HUD, overlays |
| `src/particles.js` | Particle pool |
| `src/ui.js` | DOM shop/prestige/faction panel, quality buttons, `patchShopCards()` every 250 ms |
| `src/audio.js` | Procedural Web Audio — no audio files |
| `src/storage.js` | `save`/`load`/`clear` under key `apex_save`; prefs under `apex_prefs` |
| `src/util.js` | `fmt(n)` (abbreviated numbers) and `fmtPct(fraction)` — use these everywhere for display |

## Key gotchas

**`reapplyAll()` call order** — `shop.js:reapplyAll()` must run before `prestige.js:reapplyAll()`. Shop resets `game.currencyMultiplier = 1.0`; prestige resets all tower prestige fields. Both must replay from scratch on every defeat/reload or multipliers compound.

**`normalizedShotDamage()` in `tower.js:451`** — canonical "single shot strength" used by the Obliterate check. Must include ALL applicable multipliers: spread pellet count (`spreadFactor`), echo shot chance (`echoFactor`), crit, voidSurge, forge, etc. WARBORN HP% bonus is additive and applied at the call site in `checkObliterateAtWaveStart`, not inside this function.

**`AudioContext` autoplay policy** — `audio.init()` must call `ctx.resume()` every time the context is suspended, not only on first call. Wired to `click`, `keydown`, `pointerdown`.

**Canvas coordinate space** is clamped to 400–1600 × 300–900 px in `renderer._resize()` to prevent off-screen spawns at unusual browser zoom levels. Don't replace `offsetWidth/Height` with `innerWidth` etc.

**`ctx.arc` anticlockwise** — always draw clockwise (`anticlockwise` omitted or `false`). Passing `true` draws the complement arc.

**Orbital Death Ring orbit** is at `tower.radius + 16` px (`ORBIT_R` in `tower.js:249`, `orbitR` in `renderer.js`). Keep both in sync — intentionally close to catch point-blank enemies.

**Laser / ring DPS multipliers are very high by design** — contact time per sweep pass is ~0.08 s (laser) and ~0.35 s (ring), so raw DPS must be large to feel impactful.

**`window.__apex`** is the bridge between `main.js` and `ui.js`. `window.__syncQualityUI` is exposed by `ui.js` so `main.js` can update quality buttons after AUTO step-down.

**Swarm clusters** spawn from wave 11 onward only (not earlier — player lacks AoE to handle them).

**Catalogue order in `shop.js` and `prestige.js`** = display order in the UI panel. Both are sorted by tier-1 base cost ascending. Ties keep their existing relative order.

**Arc Mastery** replaces the default 0.6 chain-decay with ×1.20 escalation per jump when purchased — it is not additive on top of decay.

**Shard Covenant** bonus is sampled at wave start in `beginWave()` (`main.js`) and stored in `game.shardCovenantBonus`. It is not recalculated mid-wave.

**Recursive Growth** (faction node) counts filled slots using `slots.slice(0, slotCount).filter(Boolean).length` — must cap with `slotCount` so the 4th slot (unlocked at Singularity rank 1) is included.

## Save keys

| Key | Contents |
|---|---|
| `apex_save` | wave, currency, towerHP, upgrades, prestigeUpgrades, factionState, traitors, bestWave, currencyMultiplier |
| `apex_prefs` | quality, autoQuality, volume — survives New Game |

## Upgrade catalogue notes

- `shop.js` catalogue order = display order in the shop panel. Sorted by tier-1 base cost.
- `maxTier: null` = unlimited (Damage only).
- Shot modifier buy progression: Spread Shot → Orbital Death Ring → Explosive Rounds → Laser Burst → Chain Lightning → Multi-Shot.
- Bounty (`currencyMult`) has 15 tiers; all shot modifiers have 5 tiers; Chain Lightning has 5 tiers.
- `costMult` for Damage is 1.25 (lower than other upgrades — intentional).

## Prestige catalogue notes

- `prestige.js` catalogue order = display order. Sorted by `baseCost` ascending.
- Wave Rush was removed in v1.9.0 — `reapplyAll` refunds shards for any saved `waveRush` tiers automatically.
- `maxTier: null` does not appear in prestige — all upgrades are capped.
