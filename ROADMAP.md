# APEX — Project Roadmap

## Overview

A browser-based, single-tower defense game in the spirit of *Perfect Tower*.
One tower. Endless waves. Countless upgrades.

The player has no control during combat — the tower fights autonomously.
All interaction happens between waves in the upgrade shop.
Purchased upgrades are permanent and cumulative; the tower only ever grows stronger.

---

## Project Structure

```
tower-defense/
├── index.html
├── style.css
└── src/
    ├── main.js          # Entry point, requestAnimationFrame loop
    ├── game.js          # Top-level state machine (shop / combat / game-over)
    ├── tower.js         # Tower stats, targeting, attack logic, fire modes
    ├── enemy.js         # Enemy types, object pool, spawning, movement
    ├── projectile.js    # Projectile object pool, movement, collision
    ├── wave.js          # Wave definitions, scaling formula, boss scheduling
    ├── shop.js          # Upgrade catalogue, purchase logic, cost curves
    ├── renderer.js      # All canvas drawing (background, entities, UI)
    ├── particles.js     # Particle effect pool (hits, deaths, muzzle flash)
    └── storage.js       # localStorage save / load / reset
```

---

## Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Rendering | Canvas 2D API | No dependencies, wide support, sufficient for 2D |
| Language | Vanilla JS (ES modules) | No build step required |
| Persistence | localStorage | Simple key/value, survives browser close |
| Dependencies | None | Fully self-contained |

---

## Visual Style

- **Background:** Near-black (`#0a0a12`) with a faint grid
- **Tower:** Geometric hexagon with a glowing animated core; core color shifts based on active fire modes
- **Enemies:** Simple geometric shapes with neon outlines, color-coded by type:
  - Drone → circle, cyan
  - Brute → square, orange
  - Swarm → tiny circle, green (spawns in clusters)
  - Elite → triangle, magenta
  - Boss → large hexagon, red/gold
- **Projectiles:** Bright glowing dots with motion trails
- **Particles:** Hit sparks and death bursts in complementary neon colors
- **UI:** Dark translucent panels, neon accent borders, monospace font, minimal chrome

---

## Game Loop

```
[SHOP PHASE]
  Player inspects upgrades, purchases with available currency
  "Start Wave" button → transitions to combat
        │
        ▼
[COMBAT PHASE]  (zero-player, fully automatic)
  Enemies spawn off-screen, march straight to tower center
  Tower fires based on its current stats and unlocked fire modes
  Wave ends when all enemies are dead
        │
        ├─ Tower HP > 0 → [RESULTS FLASH]
        │    Currency earned displayed briefly
        │    Auto-transition back to Shop Phase
        │
        └─ Tower HP = 0 → [GAME OVER SCREEN]
             Final wave number shown
             "New Game" button (with confirmation dialogue if save exists)
```

---

## Wave System

- Waves are numbered from 1, increasing indefinitely
- **Boss wave every 10 waves** — single very-high-HP unit
- Between bosses: mixed spawns of regular enemy types
- Enemy stats scale **exponentially** with wave number:
  - HP: `base_hp × 1.15^wave`
  - Speed: `base_speed × 1.02^wave` (gentler — avoids becoming unreadable)
  - Count: increases stepwise every few waves
- Enemy type distribution shifts over time (Drones early, Elites appear ~wave 5, Brutes ~wave 8)
- Swarm clusters appear as a subset of a wave's total count, not in addition to it

### Enemy Types

| Type | Shape | Color | HP | Speed | Size | Notes |
|---|---|---|---|---|---|---|
| Drone | Circle | Cyan | Low | Fast | Small | Baseline type |
| Brute | Square | Orange | High | Slow | Large | High currency reward |
| Swarm | Tiny circle | Green | Very low | Medium | Tiny | Spawns 10–20 at a time |
| Elite | Triangle | Magenta | Med-high | Medium | Medium | Appears from wave 5 |
| Boss | Hexagon | Red/Gold | Very high | Slow | Large | Every 10 waves |

---

## Tower Attack System

Fire modes are **additive** — once unlocked, all active modes fire simultaneously.

| Fire Mode | Unlocked | Description |
|---|---|---|
| Single Shot | Default | Targets nearest enemy, fires one projectile |
| Multi-Shot | Upgrade | Fires simultaneously at nearest N enemies (N up to 5) |
| Spread Shot | Upgrade | Fan of projectiles in a cone toward nearest enemy |
| Rotating Turrets | Upgrade | 1–4 additional gun emplacements that spin and fire independently |
| Chain Lightning | Upgrade | Projectiles arc to nearby enemies on hit |
| Explosive Rounds | Upgrade | Projectiles deal AoE splash on impact |
| Laser Burst | Upgrade | Periodic 360° sweeping beam, short range |

---

## Upgrade Shop

All upgrades are **permanent**. Purchased tiers carry forward indefinitely.
Costs follow a geometric curve: `base_cost × 1.4^tier`.

### Stat Upgrades

| Upgrade | Max Tiers | Effect per Tier | Base Cost |
|---|---|---|---|
| Damage | 10 | +15% damage | 50 |
| Fire Rate | 10 | +10% attacks/sec | 60 |
| Projectile Speed | 8 | +12% projectile velocity | 40 |
| Range | 8 | +8% detection radius | 45 |
| Max HP | 8 | +20% tower max HP | 70 |
| HP Regen | 8 | Regen N HP/sec between waves (and slowly in combat) | 80 |
| Armor Pierce | 5 | Future-proofing for enemy resistances | 100 |

### Mechanic Upgrades (unlock + scale)

| Upgrade | Tiers | Description |
|---|---|---|
| Multi-Shot | 5 | Tier 1 unlocks; tiers 2–5 add one additional simultaneous target |
| Spread Shot | 5 | Tier 1 unlocks (3 pellets, 20° cone); tiers add pellets and widen cone |
| Explosive Rounds | 4 | Tier 1 unlocks splash; tiers increase radius and splash % |
| Chain Lightning | 4 | Tier 1 unlocks (1 chain jump); tiers add jumps and chain damage |
| Laser Burst | 4 | Tier 1 unlocks; tiers reduce cooldown and extend beam duration |
| Rotating Turrets | 4 | Tier 1 adds 1 turret (up to 4); each fires independently |
| Currency Multiplier | 5 | +10% currency earned per tier (multiplicative) |

**Total upgrades: 14 categories, ~80 individual tiers**

---

## Shop UI

- Persistent side/bottom panel visible during shop phase
- Each upgrade card shows:
  - Name and description
  - Current tier / max tier
  - Effect at current tier vs. next tier
  - Cost of next tier (greyed out if unaffordable)
  - "MAX" label when fully upgraded
- Available currency shown prominently at top
- Locked mechanic upgrades show unlock cost and a brief description
- "Start Wave N" button always visible, disabled during combat

---

## Persistence (localStorage)

Saved after every wave result. Save includes:

```json
{
  "wave": 12,
  "currency": 340,
  "towerHP": 850,
  "upgrades": {
    "damage": 3,
    "fireRate": 2,
    "multiShot": 1,
    ...
  }
}
```

- On load: game restores exactly where the player left off
- "New Game" wipes the save — **protected by a confirmation dialogue if a save exists**
- No save → "New Game" starts immediately without dialogue

---

## Performance Strategy

| Concern | Approach |
|---|---|
| Many enemies | Object pool — pre-allocate, recycle on death |
| Many projectiles | Object pool — same strategy |
| Particle effects | Pool with oldest-first eviction when cap reached |
| Collision detection | Spatial grid (bucketed cells) — avoids O(n²) checks |
| Game loop | `requestAnimationFrame` with fixed-timestep physics, uncapped render |
| Draw calls | Batch same-type entities; avoid per-frame canvas state thrash |

---

## Milestones

### M1 — Skeleton
- [ ] Project scaffolding (HTML, CSS, JS module structure)
- [ ] Canvas setup, game loop, delta-time
- [ ] State machine: shop → combat → results → shop
- [ ] Save/load/reset via localStorage

### M2 — Combat Core
- [ ] Tower renders at center with basic hex shape
- [ ] Enemy spawning (Drone only) from random off-screen positions
- [ ] Enemy marches straight to center
- [ ] Tower targets nearest enemy, fires single projectile
- [ ] Projectile hits enemy, deals damage, enemy dies
- [ ] Tower takes damage when enemy reaches center
- [ ] Wave ends when all enemies dead or tower destroyed

### M3 — Wave Scaling
- [ ] Wave number tracked and displayed
- [ ] Enemy HP/speed/count scales with wave formula
- [ ] Boss spawns on wave 10, 20, 30 …
- [ ] All five enemy types implemented
- [ ] Currency awarded on enemy death, totalled at wave end

### M4 — Shop & Upgrades
- [ ] Shop UI panel renders between waves
- [ ] All 14 upgrade categories implemented
- [ ] Purchase logic: deduct currency, increment tier, apply stat changes
- [ ] Upgrade state persists across waves
- [ ] "Start Wave N" button

### M5 — Fire Modes
- [ ] Multi-Shot
- [ ] Spread Shot
- [ ] Explosive Rounds
- [ ] Chain Lightning
- [ ] Rotating Turrets
- [ ] Laser Burst
- [ ] Tower visual updates to reflect active modes

### M6 — Polish
- [ ] Particle system (hit sparks, death explosions, muzzle flash)
- [ ] Projectile motion trails
- [ ] Tower core glow animation
- [ ] Enemy death animations
- [ ] Wave result summary screen
- [ ] Game over screen with final wave
- [ ] New Game confirmation dialogue
- [ ] Screen shake on boss arrival / tower hit
- [ ] Sound effects (optional / stretch goal)

### M7 — Balance Pass
- [ ] Playtest waves 1–30
- [ ] Tune cost curves so upgrades feel meaningful but not trivially cheap
- [ ] Tune enemy scaling so difficulty ramp feels fair
- [ ] Verify object pools hold up at high enemy/projectile counts
- [ ] Performance profiling pass

---

## MVP Implementation Plan

The MVP covers **M1 through M4** plus the minimum required UX (game over screen,
New Game confirmation). The goal is a fully playable loop: shop → fight → reward → repeat,
with the game ending meaningfully and progress persisting across sessions.

Excluded from MVP: unlockable fire modes, particles/trails, screen shake, sound,
armor pierce upgrade, in-combat HP regen, spatial grid optimization, and all visual polish.
These are added in subsequent passes once the loop is verified playable.

---

### Phase 1 — Project Scaffold

- [ ] Create `index.html` — canvas element, shop panel div, script module entry point
- [ ] Create `style.css` — dark background, layout (canvas left, shop panel right), base font
- [ ] Create `src/main.js` — `requestAnimationFrame` loop, delta-time calculation, kick-off
- [ ] Create `src/game.js` — state machine enum (`SHOP`, `COMBAT`, `RESULTS`, `GAME_OVER`), transition logic
- [ ] Create `src/storage.js` — `save(state)`, `load()`, `clear()` using `localStorage`
- [ ] Wire save/load into game init: load existing save on startup or start fresh

---

### Phase 2 — Renderer Foundation

- [ ] Create `src/renderer.js` — canvas context setup, `clear()`, coordinate system (0,0 = top-left, tower at center)
- [ ] Draw faint grid background
- [ ] Draw tower: filled hexagon, neon outline, fixed at canvas center
- [ ] Draw HUD overlay: wave number (top-left), tower HP bar (top-center), currency (top-right)
- [ ] Draw state overlays: "Wave N complete — earned X" results screen, game over screen

---

### Phase 3 — Enemy System

- [ ] Create `src/enemy.js` — `Enemy` class with fields: `x, y, hp, maxHp, speed, radius, color, shape, reward, active`
- [ ] Implement enemy object pool (`EnemyPool`) — fixed array, `acquire()` / `release()`
- [ ] Implement `spawnEnemy(type, wave)` — random off-screen position, stats scaled by wave formula
- [ ] Implement `Enemy.update(dt)` — move straight toward canvas center, detect arrival (deal damage to tower)
- [ ] Draw enemies by shape: circle (Drone/Swarm), square (Brute), triangle (Elite), hexagon (Boss) — neon outlined, with HP bar above
- [ ] Define all 5 enemy types with base stats (Drone, Swarm, Brute, Elite, Boss)

---

### Phase 4 — Wave System

- [ ] Create `src/wave.js` — `buildWave(waveNumber)` returns spawn list: `[{type, delay}]`
- [ ] Wave composition rules:
  - Waves 1–4: Drones only
  - Wave 5+: add Elites to mix
  - Wave 8+: add Brutes to mix
  - Every 10th wave: single Boss (no other enemies)
  - Swarm: random 20% chance of cluster replacing a Drone group from wave 3+
- [ ] Enemy count formula: `floor(5 + wave * 1.5)`, capped at 80 for non-boss waves
- [ ] HP scaling: `base_hp × 1.15^wave`
- [ ] Speed scaling: `base_speed × 1.02^wave`
- [ ] Spawn sequencer in `game.js`: releases enemies from spawn list on a per-enemy delay (staggered, not all at once)
- [ ] Wave-end detection: all enemies dead → transition to RESULTS
- [ ] Tower-death detection: HP ≤ 0 → transition to GAME_OVER

---

### Phase 5 — Tower & Projectiles

- [ ] Create `src/tower.js` — `Tower` class with fields: `hp, maxHp, damage, fireRate, range, projectileSpeed, fireCooldown`
- [ ] Targeting logic: scan active enemies, pick nearest within range; if none in range, pick globally nearest
- [ ] Fire cooldown: accumulate `dt`, fire when `fireCooldown` reached, reset
- [ ] Create `src/projectile.js` — `Projectile` class: `x, y, vx, vy, damage, active`; object pool (`ProjectilePool`)
- [ ] `Projectile.update(dt)` — move by velocity; check bounds (deactivate if off-screen)
- [ ] Collision detection: per-frame, each active projectile vs each active enemy — circle overlap test; on hit: deal damage, deactivate projectile, if enemy HP ≤ 0 award currency and release enemy
- [ ] Draw projectiles: bright filled circle with simple 2px glow (shadow blur on canvas)

---

### Phase 6 — Shop & Upgrades

- [ ] Create `src/shop.js` — upgrade catalogue array; each entry: `{ id, name, description, maxTier, baseCost, costMultiplier, apply(tower, tier) }`
- [ ] Implement all 13 MVP upgrades (Armor Pierce deferred):
  - **Damage** — `tower.damage *= 1.15`
  - **Fire Rate** — `tower.fireRate *= 1.10`
  - **Projectile Speed** — `tower.projectileSpeed *= 1.12`
  - **Range** — `tower.range *= 1.08`
  - **Max HP** — `tower.maxHp *= 1.20`, restore delta to current HP
  - **HP Regen** — sets `tower.regenPerSec`; applied only between waves (full regen on wave complete)
  - **Currency Multiplier** — `game.currencyMultiplier *= 1.10`
  - **Multi-Shot** (tier 1 = unlock, tiers 2–5 add targets) — sets `tower.multiShotCount`
  - **Spread Shot** (tier 1 = unlock) — sets `tower.spreadShot` flag + pellet count + angle
  - **Explosive Rounds** (tier 1 = unlock) — sets `tower.explosiveRadius`
  - **Chain Lightning** (tier 1 = unlock) — sets `tower.chainJumps`
  - **Laser Burst** (tier 1 = unlock) — sets `tower.laserUnlocked` flag
  - **Rotating Turrets** (tier 1 = unlock, tiers 2–4 add turrets) — sets `tower.turretCount`
- [ ] `Shop.cost(id)` — returns `baseCost × 1.4^currentTier`
- [ ] `Shop.purchase(id, game)` — validate afford, deduct currency, increment tier, call `apply()`
- [ ] Upgrade tiers saved with game state; re-applied on load via `reapplyAll(tower, upgradeLevels)`

---

### Phase 7 — Shop UI

- [ ] Render shop panel (right side): currency display, "Start Wave N" button, scrollable upgrade card list
- [ ] Each upgrade card: name, tier indicator (`[2/10]`), description, next-tier effect, cost button
- [ ] Unaffordable upgrades: cost button greyed out, non-interactive
- [ ] Maxed upgrades: show "MAX" badge, no button
- [ ] Locked mechanic upgrades (tier 0): show unlock cost and flavor description
- [ ] Currency updates live as purchases are made
- [ ] "Start Wave N" button: only active during SHOP phase; clicking transitions to COMBAT

---

### Phase 8 — Game Over & Persistence UX

- [ ] Game over screen: wave number reached, total currency ever earned (stat), "New Game" button
- [ ] New Game button: if save exists → show inline confirmation ("Erase save and start over?", Confirm / Cancel); if no save → start directly
- [ ] Auto-save after every RESULTS transition (wave number, currency, tower HP, all upgrade tiers)
- [ ] On startup: if save found → restore and land on SHOP; if no save → land on SHOP at wave 1 with starter currency

---

### Phase 9 — Integration & Smoke Test

- [ ] All modules wired together in `main.js`
- [ ] Full loop playable: spawn → fight → result → shop → next wave
- [ ] Upgrades purchased in wave N active in wave N+1 (verified)
- [ ] Save survives page reload
- [ ] New Game confirmation works; save is cleared on confirm
- [ ] Game over triggers correctly; new game resets all state
- [ ] No object pool exhaustion errors in waves 1–15
- [ ] Performance acceptable (60 fps) with 80 enemies + ~200 projectiles on screen

---

## Out of Scope (Initial Release)

- Branching upgrade trees / permanent meta-progression (planned for v2)
- Sound design beyond basic effects
- Mobile / touch support
- Multiplayer
- Enemy pathfinding (enemies always walk straight to center)

---

*Last updated: 2026-04-12*
