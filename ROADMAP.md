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
[COMBAT]  (zero-player, fully automatic, runs continuously)
  Enemies spawn off-screen, march straight to tower center
  Tower fires based on its current stats and unlocked fire modes
  Player may purchase upgrades at any time from the side panel
        │
        ├─ All enemies dead → [WAVE COMPLETE FLASH]  (2 sec)
        │    Currency earned displayed
        │    Wave counter increments
        │    Auto-starts next wave
        │
        └─ Tower HP = 0 → [DEFEATED FLASH]  (3 sec)
             "Fell on wave N / Best: wave N" shown
             Upgrades and currency are kept
             Resets to wave 1 and resumes combat
```

**New Game** (side panel button) — wipes all progress after confirmation dialogue.

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
- [x] Project scaffolding (HTML, CSS, JS module structure)
- [x] Canvas setup, game loop, delta-time
- [x] State machine: shop → combat → results → shop
- [x] Save/load/reset via localStorage

### M2 — Combat Core
- [x] Tower renders at center with basic hex shape
- [x] Enemy spawning (Drone only) from random off-screen positions
- [x] Enemy marches straight to center
- [x] Tower targets nearest enemy, fires single projectile
- [x] Projectile hits enemy, deals damage, enemy dies
- [x] Tower takes damage when enemy reaches center
- [x] Wave ends when all enemies dead or tower destroyed

### M3 — Wave Scaling
- [x] Wave number tracked and displayed
- [x] Enemy HP/speed/count scales with wave formula
- [x] Boss spawns on wave 10, 20, 30 …
- [x] All five enemy types implemented
- [x] Currency awarded on enemy death, totalled at wave end

### M4 — Shop & Upgrades
- [x] Shop UI panel always visible, purchases allowed at any time
- [x] All 13 upgrade categories implemented (Armor Pierce deferred)
- [x] Purchase logic: deduct currency, increment tier, apply stat changes immediately
- [x] Upgrade state persists across waves and resets
- [x] Self-destruct button: voluntary wave reset, keeps all upgrades and currency
- [x] New Game button with confirmation dialogue

### M5 — Fire Modes
*See Post-MVP Phase P1 for detailed checklist.*
- [x] Multi-Shot
- [x] Spread Shot
- [x] Explosive Rounds
- [x] Chain Lightning
- [x] Rotating Turrets
- [x] Laser Burst
- [x] Tower visual updates to reflect active modes

### M6 — Polish
*See Post-MVP Phase P2 for detailed checklist.*
- [ ] Particle system (hit sparks, death explosions, tower hit flash)
- [ ] Projectile motion trails
- [ ] Tower core glow animation
- [ ] Enemy death animations
- [ ] Boss arrival emphasis
- [ ] Defeated screen improvements
- [ ] Sound effects (stretch goal — see P5)

### M7 — Balance Pass
*See Post-MVP Phase P4 for detailed checklist.*
- [ ] Playtest waves 1–50
- [ ] Tune cost curves
- [ ] Tune enemy scaling
- [ ] Verify pool sizes hold at high wave counts
- [ ] Performance profiling pass (see P3)

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

- [x] Create `index.html` — canvas element, shop panel div, script module entry point
- [x] Create `style.css` — dark background, layout (canvas left, shop panel right), base font
- [x] Create `src/main.js` — `requestAnimationFrame` loop, delta-time calculation, kick-off
- [x] Create `src/game.js` — state machine enum (`SHOP`, `COMBAT`, `RESULTS`, `GAME_OVER`), transition logic
- [x] Create `src/storage.js` — `save(state)`, `load()`, `clear()` using `localStorage`
- [x] Wire save/load into game init: load existing save on startup or start fresh

---

### Phase 2 — Renderer Foundation

- [x] Create `src/renderer.js` — canvas context setup, `clear()`, coordinate system (0,0 = top-left, tower at center)
- [x] Draw faint grid background
- [x] Draw tower: filled hexagon, neon outline, fixed at canvas center
- [x] Draw HUD overlay: wave number (top-left), tower HP bar (top-center), currency (top-right)
- [x] Draw state overlays: "Wave N complete — earned X" results screen, game over screen

---

### Phase 3 — Enemy System

- [x] Create `src/enemy.js` — `Enemy` class with fields: `x, y, hp, maxHp, speed, radius, color, shape, reward, active`
- [x] Implement enemy object pool (`EnemyPool`) — fixed array, `acquire()` / `release()`
- [x] Implement `spawnEnemy(type, wave)` — random off-screen position, stats scaled by wave formula
- [x] Implement `Enemy.update(dt)` — move straight toward canvas center, detect arrival (deal damage to tower)
- [x] Draw enemies by shape: circle (Drone/Swarm), square (Brute), triangle (Elite), hexagon (Boss) — neon outlined, with HP bar above
- [x] Define all 5 enemy types with base stats (Drone, Swarm, Brute, Elite, Boss)

---

### Phase 4 — Wave System

- [x] Create `src/wave.js` — `buildWave(waveNumber)` returns spawn list: `[{type, delay}]`
- [x] Wave composition rules:
  - Waves 1–4: Drones only
  - Wave 5+: add Elites to mix
  - Wave 8+: add Brutes to mix
  - Every 10th wave: single Boss (no other enemies)
  - Swarm: random 20% chance of cluster replacing a Drone group from wave 3+
- [x] Enemy count formula: `floor(5 + wave * 1.5)`, capped at 80 for non-boss waves
- [x] HP scaling: `base_hp × 1.15^wave`
- [x] Speed scaling: `base_speed × 1.02^wave`
- [x] Spawn sequencer in `game.js`: releases enemies from spawn list on a per-enemy delay (staggered, not all at once)
- [x] Wave-end detection: all enemies dead → transition to RESULTS
- [x] Tower-death detection: HP ≤ 0 → transition to GAME_OVER

---

### Phase 5 — Tower & Projectiles

- [x] Create `src/tower.js` — `Tower` class with fields: `hp, maxHp, damage, fireRate, range, projectileSpeed, fireCooldown`
- [x] Targeting logic: scan active enemies, pick nearest within range; if none in range, pick globally nearest
- [x] Fire cooldown: accumulate `dt`, fire when `fireCooldown` reached, reset
- [x] Create `src/projectile.js` — `Projectile` class: `x, y, vx, vy, damage, active`; object pool (`ProjectilePool`)
- [x] `Projectile.update(dt)` — move by velocity; check bounds (deactivate if off-screen)
- [x] Collision detection: per-frame, each active projectile vs each active enemy — circle overlap test; on hit: deal damage, deactivate projectile, if enemy HP ≤ 0 award currency and release enemy
- [x] Draw projectiles: bright filled circle with simple 2px glow (shadow blur on canvas)

---

### Phase 6 — Shop & Upgrades

- [x] Create `src/shop.js` — upgrade catalogue array; each entry: `{ id, name, description, maxTier, baseCost, costMultiplier, apply(tower, tier) }`
- [x] Implement all 13 MVP upgrades (Armor Pierce deferred):
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
- [x] `Shop.cost(id)` — returns `baseCost × 1.4^currentTier`
- [x] `Shop.purchase(id, game)` — validate afford, deduct currency, increment tier, call `apply()`
- [x] Upgrade tiers saved with game state; re-applied on load via `reapplyAll(tower, upgradeLevels)`

---

### Phase 7 — Shop UI

- [x] Render shop panel (right side): currency display, "Start Wave N" button, scrollable upgrade card list
- [x] Each upgrade card: name, tier indicator (`[2/10]`), description, next-tier effect, cost button
- [x] Unaffordable upgrades: cost button greyed out, non-interactive
- [x] Maxed upgrades: show "MAX" badge, no button
- [x] Locked mechanic upgrades (tier 0): show unlock cost and flavor description
- [x] Currency updates live as purchases are made
- [x] "Start Wave N" button: only active during SHOP phase; clicking transitions to COMBAT

---

### Phase 8 — Game Over & Persistence UX

- [x] Game over screen: wave number reached, "New Game" button
- [x] New Game button: if save exists → show inline confirmation ("Erase save and start over?", Confirm / Cancel); if no save → start directly
- [x] Auto-save after every RESULTS transition (wave number, currency, tower HP, all upgrade tiers)
- [x] On startup: if save found → restore and land on SHOP; if no save → land on SHOP at wave 1 with starter currency

---

### Phase 9 — Integration & Smoke Test

- [x] All modules wired together in `main.js`
- [x] Full loop playable: spawn → fight → result → next wave (automatic)
- [x] Upgrades purchased mid-wave active immediately and in all subsequent waves
- [x] Save survives page reload
- [x] New Game confirmation works; save is cleared on confirm
- [x] Defeat resets to wave 1 with upgrades and currency kept
- [x] Self-destruct triggers voluntary defeat/reset
- [x] No object pool exhaustion errors observed in waves 1–15
- [x] Performance acceptable at 60 fps during normal play

---

## Post-MVP Work

Items below represent the delta between the current shipped state and the full
roadmap vision. Each section follows the same rule: implement → test → check off → commit.

---

### P1 — Fire Modes (Combat Depth)

The upgrade flags are already set by the shop. This phase wires their combat effects.

- [x] **Multi-Shot** — tower fires at up to `multiShotCount` nearest enemies per cooldown tick
- [x] **Spread Shot** — fire `spreadPellets` projectiles in a `spreadAngle` cone toward primary target
- [x] **Explosive Rounds** — on projectile hit, deal `damage * 0.6` to all enemies within `explosiveRadius`; visual ring flash on impact
- [x] **Chain Lightning** — on hit, arc to up to `chainJumps` nearest enemies within 120px, each jump deals 60% of previous damage
- [x] **Rotating Turrets** — `turretCount` additional emplacements orbit the tower at fixed angles, each with independent fire cooldown and targeting
- [x] **Laser Burst** — every 8s (reduced by tier), emit a 360° sweep beam over 1.5s; enemies in beam radius take continuous damage per frame
- [x] Tower visual: draw active turret emplacements as small neon diamonds orbiting the hex
- [x] Tower visual: pulse tower outline color when laser burst is charging vs. firing

---

### P2 — Visual Polish

- [x] **Particle system** — implement `src/particles.js` pool; emit on: projectile hit (sparks), enemy death (burst), tower hit (red flash fragments)
- [x] **Projectile motion trails** — store last 4 positions per projectile; draw fading line behind each
- [x] **Enemy death animation** — brief expanding ring + fade at death position before releasing from pool
- [x] **Tower core glow pulse** — animate core dot radius/opacity on a sine curve; speed increases with fire rate
- [x] **Boss arrival emphasis** — brief screen-edge red flash when a boss spawns
- [x] **Tower hit flash** — tower hex briefly turns red for 120ms when taking damage
- [x] **Wave counter in HUD** — display current wave number more prominently; show enemy count remaining
- [x] **Defeated screen** — display total currency accumulated this run alongside wave reached

---

### P3 — Performance & Correctness

- [x] **Spatial grid collision** — replace O(n×m) projectile×enemy loop with a bucketed grid; target: handles 500 enemies + 2000 projectiles at 60 fps
- [x] **Enemy pool expansion** — increase pool size to 512; verify no pool starvation on wave 30+
- [x] **Projectile pool expansion** — increase to 2048; verify no starvation with spread shot + turrets active
- [x] **Canvas state batching** — group all enemies of same shape/color into a single path before stroking to reduce `save/restore` calls
- [x] **Off-screen cull** — skip draw calls for entities more than 50px outside canvas bounds

---

### P4 — Balance Pass

- [ ] Playtest waves 1–10: verify starter currency (100) allows at least 2 upgrades before wave 3 feels threatening
- [ ] Playtest waves 10–30: verify fire mode unlocks provide a noticeable power spike at their cost point
- [ ] Playtest waves 30–50: verify boss waves are defeatable with a reasonably upgraded tower but require spread/multi/explosive investment
- [ ] Tune enemy HP scaling exponent (currently `1.15^wave`) — adjust if wave 20+ becomes unkillable without fire modes
- [ ] Tune enemy speed scaling exponent (currently `1.02^wave`) — adjust if enemies become unreadably fast
- [ ] Tune cost curve multiplier (currently `1.4^tier`) per upgrade category — stat upgrades vs mechanic unlocks may need different curves
- [ ] Verify currency income keeps pace with cost curve across waves 1–30
- [ ] Boss HP multiplier tuning — boss should require ~3–5 full clip hits to kill at the wave it appears
- [ ] Verify self-destruct + reset loop is a viable strategy (i.e. income per run is meaningful even at low waves)

---

### P5 — Sound (Stretch Goal)

- [ ] Evaluate Web Audio API vs. pre-baked audio sprites
- [ ] Projectile fire sound (per fire mode variant)
- [ ] Enemy death sound (differentiated by type size)
- [ ] Tower hit sound
- [ ] Wave complete chime
- [ ] Defeated sting
- [ ] Boss arrival sound
- [ ] Master volume control in shop panel footer

---

## Out of Scope (Initial Release)

- Branching upgrade trees / permanent meta-progression (planned for v2)
- Sound design beyond basic effects
- Mobile / touch support
- Multiplayer
- Enemy pathfinding (enemies always walk straight to center)

---

*Last updated: 2026-04-12 — post-MVP phases P1–P5 added*
