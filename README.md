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

## Current State (v1.7.x)

### Core Loop

- Endless waves of enemies march toward the tower
- Tower fights automatically based on purchased upgrades
- Defeat resets the wave counter but **keeps all upgrades and currency**
- Ascension resets the run for permanent cross-run shard upgrades

### Upgrade Shop

Permanent upgrades purchased with in-wave currency:

| Category | Description |
|---|---|
| Damage | Raw damage multiplier (unlimited tiers, costMult 1.25) |
| Fire Rate | Attacks per second |
| Projectile Speed | Projectile velocity |
| Range | Detection and engagement radius |
| Max HP | Tower maximum health |
| HP Regen | Regeneration per second |
| Bounty | Currency earned per kill (multiplicative, 15 tiers) |
| Spread Shot | Fan of pellets per shot (5 tiers) |
| Orbital Death Ring | Rotating close-range kill ring (5 tiers) |
| Explosive Rounds | AoE splash on impact (5 tiers) |
| Laser Burst | Periodic 360° sweep beam (5 tiers) |
| Chain Lightning | Arcing hit chain (5 tiers) |
| Multi-Shot | Simultaneous multi-target fire (5 tiers) |

### Ascension (Prestige)

After reaching a certain power threshold, the player may ascend — resetting the run in exchange for permanent **Shard upgrades** that carry into every future run. Shard upgrades include: Overkill/Obliterate, Critical Hits, Execute, Overcharge, Ricochet, Poison, and HP Exponent reduction.

### The Covenant (Faction System)

After the first ascension, the player joins one of three factions. Currently only **NEXUS** is playable; THE CONCLAVE and THE WARBORN are in design.

**NEXUS** deepens the traitor/pet system:

- Enemies have a small per-kill chance to desert and join as traitor pets
- Active traitor pets grant a stacking additive damage bonus
- Rarer traitors grant larger bonuses; 5 natural rarities capturable, 5 merge-only (up to Apex)
- NEXUS talent tree: Lure Protocols, Signal Harvest, Resonance Field, Optimal Roster, Apex Protocol, Stack Cascade, Data Harvest, Stack Amplifier, Recursive Growth
- **SINGULARITY** capstone: permanently preserves a % of run Neural Stacks across ascensions; rank 1 unlocks a 4th traitor slot forever

Faction nodes and capstones are **permanent** — they survive ascension and hard reset. See `faction.md` for full design documentation.

### Enemy Types

| Type | Description |
|---|---|
| Drone | Fast, low HP — baseline type |
| Swarm | Tiny, very low HP — spawns in clusters from wave 3 |
| Brute | Slow, high HP — high currency reward |
| Elite | Medium speed and HP |
| Dasher | Fast, evasive |
| Bomber | Explodes on tower contact for extra damage |
| Spawner | Periodically releases Swarm drones |
| Phantom | Intangible (projectiles pass through) — vulnerable only to AoE/laser/ring |
| Colossus | Very high HP, slow |
| Boss | Massive HP — every 10 waves |

---

## Development

### Run / Syntax Check

```
npm start                    # serves on http://localhost:3000
node --check src/<file>.js   # syntax check a file (no bundler/linter)
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
├── faction.md           ← Covenant faction system design doc
├── AGENTS.md            ← AI agent instructions
└── src/
    ├── main.js          # Game loop, save/load wiring, ascension flow
    ├── game.js          # Game state, multiplier helpers (traitor/faction/shard)
    ├── tower.js         # Tower stats, main gun, laser burst, orbital ring
    ├── projectile.js    # Projectile pool, collision, chain lightning, splash
    ├── enemy.js         # Enemy pool, BASE_STATS, per-wave HP/speed scaling
    ├── wave.js          # buildWave() — spawn queue with delays
    ├── shop.js          # Upgrade catalogue, cost formula, reapplyAll()
    ├── renderer.js      # All canvas drawing, HUD, overlays
    ├── particles.js     # Particle pool
    ├── ui.js            # DOM shop panel, faction tab, traitor panel
    ├── audio.js         # Procedural Web Audio — no audio files
    ├── traitor.js       # Traitor/pet system — capture, merge, roster
    ├── faction.js       # FactionSystem, NEXUS nodes, capstones
    ├── prestige.js      # Shard upgrade catalogue
    └── storage.js       # save/load under apex_save; prefs under apex_prefs
```

## Tech Stack

- **Rendering:** Canvas 2D API
- **Language:** Vanilla JS (ES modules, no bundler)
- **Persistence:** localStorage
- **Dependencies:** None
