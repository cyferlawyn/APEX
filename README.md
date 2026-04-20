# APEX

A browser-based single-tower defense game. One tower. Endless waves. Deep upgrade systems.

The tower fights autonomously — all strategy happens between waves in the shop panel.

## Playing the Game

ES modules require a local HTTP server — opening `index.html` directly via `file://` will be blocked by the browser.

```
npm start
```

Then open **http://localhost:3000**. Node.js is the only dependency.

---

## Current State (v2.1.x)

### Core Loop

- Endless waves of enemies march toward the tower
- Tower fights automatically based on purchased upgrades
- Defeat resets to the nearest x1 wave boundary but **keeps all upgrades and currency**
- Ascension resets the run in exchange for permanent cross-run **Shard** upgrades
- After the first ascension, the player joins a **Covenant** — a permanent faction with a talent tree and capstone ability that carries across all future runs

### In-Run Upgrade Shop

Purchased with in-wave currency. All upgrades persist until New Game or Ascension.

| Upgrade | Description |
|---|---|
| Damage | ×1.25 per tier (unlimited tiers) — affects all weapons |
| Fire Rate | ×1.10 per tier (10 tiers) |
| Projectile Speed | ×1.12 per tier (8 tiers) |
| Range | ×1.10 per tier (15 tiers) |
| Max HP | +20% per tier (8 tiers) |
| HP Regen | +3% max HP healed per wave (12 tiers) |
| Bounty | ×1.10 kill rewards per tier (15 tiers) |
| Spread Shot | Fan of pellets (5 tiers) |
| Orbital Death Ring | Rotating close-range kill ring (5 tiers) |
| Explosive Rounds | AoE splash on impact (5 tiers) |
| Laser Burst | Periodic 360° sweep beam (5 tiers) |
| Chain Lightning | Arcing chain hits (5 tiers) |
| Multi-Shot | Simultaneous multi-target fire (5 tiers, max 6 targets) |
| Overcharge | Every Nth shot deals ×4+ damage (5 tiers) |
| Volatile Rounds | Increases explosive splash fraction up to 110% (5 tiers) |
| Leech | HP restored per kill (5 tiers) |
| Ring of Annihilation | Ring DPS multiplier up to ×5 (5 tiers) |
| Apocalypse Laser | Laser DPS multiplier up to ×5 (5 tiers) |

### Ascension (Prestige) — Shard Upgrades

Shards are earned from boss kills on wave 50+. On ascension they convert to permanent upgrades that survive every future run. The shop is loosely tiered by cost:

**Early (< 1k shards total):**

| Upgrade | Effect |
|---|---|
| Auto-Buyer | Automatically buys the cheapest shop upgrade every N seconds (6 tiers, down to instant) |
| War Chest | Start each run with bonus currency — up to 1M at tier 10 (10 tiers) |
| Bounty II | ×1.10 kill rewards per tier, stacks with Bounty I (10 tiers) |
| Critical Strike | 10% crit chance per tier — 100% at max (10 tiers) |
| Critical Power | Crit damage from ×2.0 up to ×3.25 (5 tiers) |
| Ricochet | Projectiles bounce to 1–3 extra enemies (3 tiers) |
| Poison Touch | Hits apply a DoT for 25–55% of hit damage over 3s (3 tiers) |
| Laser Chill | Laser slows enemies −25% to −55% for 2s (3 tiers) |
| Ring Stun | Ring contact stuns enemies 0.3–0.75s (3 tiers) |
| Shard Tithe | ×1.25 shard income per tier — ×9.3× at max (10 tiers) |
| Veteran's Bounty | Bonus shards on ascension based on wave reached (3 tiers) |

**Mid (1k–100k shards total):**

| Upgrade | Effect |
|---|---|
| Execute | Instantly kills enemies below 5–15% HP (3 tiers) |
| Resurgence | Revive once per run at 25–50% HP with 2s invulnerability (2 tiers) |
| Overcharge Amplifier | Extends overcharge multiplier from ×4 up to ×6.5 (5 tiers) |
| Detonation Field | +15%/tier explosion radius + 1s slow on blast (4 tiers) |
| Arc Mastery | +1–3 extra chain lightning jumps with ×1.20 escalating damage per jump (3 tiers) |

**High-end (100k–10M shards):**

| Upgrade | Effect |
|---|---|
| Obliterate | When a shot overkills a drone by ×10, the entire wave is wiped after a 1–5s countdown (5 tiers, up to 625k per tier) |
| Void Surge | ×1.20 global DPS multiplier per tier — all weapons (5 tiers) |
| Echo Shot | Chance to fire a free extra volley after a multi-shot salvo (5 tiers, up to 75%) |
| Forge Eternal | +50 flat base damage per tier, applied before all multipliers (5 tiers) |
| Shard Covenant | Wave-start bonus multiplier equal to shards × coefficient (3 tiers) |
| Eternal Arsenal | +5% fire rate and +1 simultaneous target per tier beyond shop caps (4 tiers) |
| Apex Predator | Execute threshold applied to Bosses, plus +50% fire rate burst for 3s on any execute kill (3 tiers) |

### Traitor / Pet System

Enemies have a chance to desert and join as a traitor pet on kill. Active pets grant a stacking damage bonus. 5 natural rarities (Recruit → Legendary), 5 merge-only rarities (Epic → Apex). Roster holds up to 3 slots (4 with NEXUS capstone). Pets are permanent — they survive ascension and New Game.

### Enemy Types

| Type | Description |
|---|---|
| Drone | Fast, low HP — the baseline enemy |
| Swarm | Tiny, very low HP — spawns in clusters (wave 11+) |
| Brute | Slow, very high HP — high currency reward |
| Elite | Moderate speed and HP |
| Dasher | Fast and evasive |
| Bomber | Explodes on tower contact |
| Spawner | Periodically releases Swarm drones |
| Phantom | Intangible to projectiles — vulnerable only to AoE, laser, and ring |
| Colossus | Extreme HP, slow — absorbs first hit from each weapon type per wave; releases 3 drones on death |
| Boss | Massive HP — every 10 waves |

### The Covenant (Faction System)

After the first ascension the player joins one of three factions. All faction nodes and capstone ranks are **permanent** — they survive ascension and hard reset.

#### NEXUS
*Deepens the traitor/pet system.*

- **A1 Lure Protocols** — one enemy type per wave has a 3× capture chance
- **A2 Optimal Roster** — each filled pet slot grants +1% damage
- **A3 Spoils of War** — early wave clears carry surviving enemies forward and grant stacking damage and crit bonuses
- **B1 Signal Harvest** — bonus shards per wave based on active pets
- **B2 Resonance Field** — doubles each pet's damage contribution
- **B3 Apex Protocol** — unlocks Apex-rarity pets from merges
- **C1 Data Harvest** — +1 neural stack per wave cleared (×slots if C3 active)
- **C2 Stack Amplifier** — each neural stack grants +0.8% damage and +0.3% currency
- **C3 Recursive Growth** — Data Harvest gain multiplied by filled roster slots
- **Capstone — SINGULARITY** — permanently preserves a % of neural stacks across ascensions; rank 1 unlocks a permanent 4th pet slot

#### WARBORN
*Ability-driven faction focused on burst damage and momentum.*

- **A1 Mortar Strike** — cursor-targeted mortar fires every ~1s with AoE blast
- **A2 Heavy Ordnance** — mortar deals 3× damage and stuns in a larger radius
- **A3 Carpet Bombing** — each mortar strike fires 4 additional blasts N/S/E/W
- **B1 Rally Cry** — press 1 to activate Overdrive: ×3 fire rate for 5s (60s cooldown)
- **B2 Fury** — press 2 to activate Fury: ×2 damage for 4s (60s cooldown)
- **B3 Avatar of War** — press 3 to strip 30% current HP from all enemies (60s cooldown)
- **C1 Blood Rush** — kills build Rush Stacks; each stack = +3% damage; stacks decay 3s after last kill
- **C2 Rampage** — +1% fire rate per 10 Rush Stacks
- **C3 Unstoppable** — mortar kills grant extra stacks; 10s decay immunity at wave start
- **Capstone — ETERNAL WARRIOR** — each rank raises Rush Stack cap, reduces all ability cooldowns, and causes projectiles to deal extra current-HP% damage to enemies

#### VANGUARD
*Wave-manipulation and compounding shard/damage scaling.*

- **A1 Advance Guard** — +2% enemy speed per wave cleared (applies to incoming enemies — forces faster clears)
- **A2 Tide Surge** — clearing 50% of a wave (boss must die first) immediately advances to the next
- **A3 Spoils of War** — early switches carry enemies forward and grant stacking crit/damage bonuses
- **B1 Eternal Tithe** — bonus shards per ascension equal to ascension count
- **B2 Shard Mastery** — doubles the passive damage coefficient from total shards earned
- **B3 Iron Vault** — +1% of current shard balance added as bonus shards on ascension
- **C1 Battle Hardened** — ×1.5 to the shard passive damage coefficient
- **C2 Momentum** — pending shards multiplied by (1 + 0.1 × ascension count) on ascension
- **C3 Tidal Convergence** — every wave advance skips 10 waves simultaneously
- **Capstone — ENDLESS WAR** — each rank raises the Tide Surge threshold across all factions to 75%; multiplies the obliterate check power

---

## Development

### Run / Syntax Check

```
npm start                    # serves on http://localhost:3000
node --check src/<file>.js   # syntax check a file (no bundler/linter/test suite)
```

### Commit Convention

- Every commit leaves the game **fully playable**
- Always push immediately after committing (`git push`)
- Semantic version tags after each session (`git tag vX.Y.Z && git push origin vX.Y.Z`)
  - patch — bug fixes, balance tweaks, polish
  - minor — new features or content
  - major — large redesigns

---

## Project Structure

```
tower-defense/
├── index.html
├── style.css
├── AGENTS.md            ← AI agent instructions
└── src/
    ├── main.js          # Game loop, save/load wiring, ascension flow, WARBORN abilities
    ├── game.js          # Game state, multiplier helpers (shard/traitor/faction/WARBORN/VANGUARD)
    ├── tower.js         # Tower stats, main gun, laser burst, orbital ring, normalizedShotDamage
    ├── projectile.js    # Projectile pool, collision, chain lightning, splash, obliterate check
    ├── enemy.js         # Enemy pool, BASE_STATS, per-wave HP/speed scaling
    ├── wave.js          # buildWave() — spawn queue with delays
    ├── shop.js          # In-run upgrade catalogue, cost formula, reapplyAll()
    ├── prestige.js      # Shard (prestige) upgrade catalogue, PrestigeShop, reapplyAll()
    ├── renderer.js      # All canvas drawing, HUD, overlays
    ├── particles.js     # Particle pool
    ├── ui.js            # DOM shop panel, prestige panel, faction tab, traitor panel
    ├── audio.js         # Procedural Web Audio — no audio files
    ├── traitor.js       # Traitor/pet system — capture, merge, roster
    ├── faction.js       # FactionSystem — NEXUS, WARBORN, VANGUARD nodes and capstones
    └── storage.js       # save/load under apex_save; prefs under apex_prefs
```

## Save Keys

| Key | Contents |
|---|---|
| `apex_save` | wave, currency, towerHP, upgrades, bestWave, currencyMultiplier, VANGUARD per-run state |
| `apex_prestige` | shards, pendingShards, totalShardsEarned, prestigeUpgrades, ascensionCount |
| `apex_traitors` | traitor roster and all captured pets |
| `apex_faction` | active faction, run-level node state, neural stacks |
| `apex_faction_capstones` | permanent capstone ranks (SINGULARITY, ETERNAL WARRIOR, ENDLESS WAR) |
| `apex_prefs` | quality, autoQuality, volume, autoAscensionMode — survives New Game |

## Tech Stack

- **Rendering:** Canvas 2D API
- **Language:** Vanilla JS (ES modules, no bundler)
- **Persistence:** localStorage
- **Dependencies:** None
