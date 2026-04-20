# The Covenant — Faction System Design

## Overview

- The faction choice modal is shown **immediately after every ascension**, before the new run begins
- The chosen faction is **active for that run**; ascension always prompts a new choice
- **Re-picking the same faction restores all previously purchased nodes** — nodes are permanent single-time purchases
- **Regular gold** funds faction nodes — no new currency
- Faction nodes are **permanent** (stored alongside capstones in `apex_faction_capstones`); they survive ascension and hard reset
- **First run has no faction** — faction tab is absent until first ascension
- **Hard reset keeps faction capstones and nodes** (like prestige upgrades)

## Trigger Condition

Player presses Ascend → `beginAscend()` banks shards, calls `onAscend`, sets `game.pendingFactionChoice = true` → faction choice overlay is shown → player picks a faction → `completeAscend(factionId)` resets the run, calls `reapplyAll`, starts wave 1.

---

## Design Principle: Each Faction Advances a Different Existing System

| Faction | Advances | Playstyle |
|---|---|---|
| **NEXUS** | Traitor / pet system | Passive observer — automation compounds without input |
| **THE CONCLAVE** | Weapon amplification + abilities | Strategic — periodic powerful commands, passive weapon buffs |
| **THE WARBORN** | Direct combat contribution | Active — mortars and kill-streaks reward constant engagement |
| **THE VANGUARD** | Wave farming / shard farming | Speed-runner — carry enemies between waves to scale damage and shards |

---

## Capstone Persistence (Cross-Ascension)

Capstones are **permanent across ascensions**, stored in `apex_faction_capstones`. They are **not** reset when the player picks a different faction or performs a hard reset.

CONCLAVE and WARBORN capstones each reduce the enemy HP exponent:

```
const exponent = Math.max(1.02, 1.07 - conclaveCapstone*0.001 - warbornCapstone*0.001);
```

Each capped at **rank 40** (max −0.04 each, −0.08 combined). Floor of 1.02 enforced.

At 1.02^500 vs 1.07^500: ~15 billion times less HP — wave 500 becomes reachable.

NEXUS Singularity does not reduce the HP exponent — its scaling path is permanent Neural Stack accumulation.

---

## Talent Tree Structure

Identical layout for all three factions:

```
[A1]──[B1]──[C1]   Tier 1 — always purchasable after joining
 │     │     │
[A2]──[B2]──[C2]   Tier 2 — requires same-column T1
 │     │     │
[A3]──[B3]──[C3]   Tier 3 — requires same-column T2
        │
    [CAPSTONE]     Unlocks when any full column is complete.
                   Unlimited rank. Persists across all ascensions.
```

### Node Costs

| Tier | Cost |
|---|---|
| T1 | 500,000 |
| T2 | 2,500,000 |
| T3 | 12,500,000 |

Total per faction (9 nodes): ~46.5M gold. T3 nodes are long-term investments spanning many ascensions.

---

## NEXUS — Implemented ✓

> *"The machine never sleeps. Join us, and neither will your tower."*

Automation path. The tree deepens the traitor/pet system — passive compounding is the NEXUS identity.

### Talent Tree

| Node | Name | Effect |
|---|---|---|
| A1 | *Lure Protocols* | One random enemy type per wave has 3× capture chance; highlighted in HUD |
| A2 | *Optimal Roster* | After every capture or merge, auto-slots the highest-value traitors and auto-merges inactive excess. Protected: skips a merge if it would remove a type+rarity the optimal lineup needs. |
| A3 | *Stack Cascade* | When a traitor merges, gain Neural Stacks equal to the resulting rarity tier (common=1 … apex=10) |
| B1 | *Signal Harvest* | Traitor capture chance doubled globally (stacks × with A1) |
| B2 | *Resonance Field* | Active traitor pets grant double their normal damage bonus |
| B3 | *Apex Protocol* | Merge cost reduced from 5 → 4 pets per merge |
| C1 | *Data Harvest* | +1 Neural Stack per wave cleared; stacks persist the run |
| C2 | *Stack Amplifier* | Each Neural Stack: +0.8% multiplicative damage, +0.3% currency multiplier |
| C3 | *Recursive Growth* | Neural Stacks gained per wave multiplied by number of filled active traitor slots |

### Capstone — SINGULARITY

- `baseCost: 1,000,000`, `costMult: 1.30`, unlimited rank
- **Rank 1**: permanently unlocks a 4th active traitor slot for all future runs (all factions)
- **Each rank**: at ascension, (rank)% of run-earned Neural Stacks are permanently preserved and seed every future run
- Permanent stacks are never re-counted by Singularity (only fresh run-earned stacks are subject to the %)
- Stored in `apex_faction_capstones` alongside capstone rank
- Cross-faction synergy: permanent Neural Stacks — and their C2 damage/currency multiplier — are active in every future run regardless of which faction is chosen next

### Implementation Notes

- `reapplyAll()` restores `permanentNeuralStacks` from `this.permanent.nexus.permanentNeuralStacks`
- `serializeRun(neuralStacks)` saves current stack count so page refresh restores mid-run progress
- `deserializeRun()` stores `_runNeuralStacks`; `reapplyAll()` restores from it if non-null, then clears
- `tryCapture()` has no roster cap — merging to apex requires far more than any fixed limit
- `optimizeForNexus()` is called before the roster check in `tryCapture` to unblock captures when auto-merge is pending
- Apex Protocol's `apply()` immediately sets `traitorSystem.mergeCount = 4` at purchase (not only on reload)
- Resonance Field doubling is applied in display code (`ui.js`) as well as `game.traitorDmgMult()` — both must stay in sync
- Traitor roster sorted by rarity desc, then damage% desc within tier (includes resonance multiplier)

---

## THE CONCLAVE — Stub (coming soon)

> *"We have seen a thousand wars. We know where every battle is won."*

Strategic path. Amplifies tower weapon systems passively and unlocks three powerful battlefield commands on cooldown. Requires periodic attention — not constant.

### Talent Tree

| Node | Name | Effect |
|---|---|---|
| A1 | *Ballistic Doctrine* | Explosive radius +40%; chain lightning bounces +2 |
| A2 | *Siege Doctrine* | Laser burst and orbital ring DPS ×1.75 |
| A3 | *Overwhelming Force* | All shot modifiers deal +75% damage |
| B1 | *Field Command* | Unlocks ability panel. **RALLY** (Q) — tower fires 3× rate for 5 s, 90 s CD |
| B2 | *Veteran's Arsenal* | **GRAVITY WELL** (W) — pulls all enemies toward tower for 3 s + contact damage, 75 s CD |
| B3 | *War Council* | **OBLITERATING STRIKE** (E) — all enemies lose 25% current HP instantly, ignores armor, 120 s CD |
| C1 | *Reconnaissance* | All enemies always show HP bar |
| C2 | *Vulnerability Analysis* | Enemies below 50% HP take +25% damage from all sources |
| C3 | *Perfect Intel* | Execute threshold doubled; execute kills grant 2× currency and +1 pending shard |

### Capstone — TOTAL WAR

- `baseCost: 75,000`, `costMult: 1.35`, **capped at rank 40**
- Each rank: −0.5 s off all ability cooldowns (floor 10 s each)
- Each rank: +0.001 to `conclaveHpContribution` (enemy HP exponent reduction)

### Implementation Notes (pre-build)

- Ability panel: 3 buttons below the HP bar on canvas, keyed Q/W/E, showing cooldown fill
- OBLITERATING STRIKE overlaps thematically with the prestige OBLITERATE upgrade — they should stack (different triggers: one is a timed manual ability, the other is an automatic overkill reaction)
- `conclaveHpContribution` stored in `apex_faction_capstones`; read by enemy HP formula in `enemy.js`
- Ability state (cooldowns) is per-run, not saved — resets on page load / ascension

---

## THE VANGUARD — Stub (coming soon)

> *"Every wave is a resource. Learn to spend it wisely."*

Wave-farming path. Rewards speed-running the wave ladder. Primary damage scaling comes from carrying enemies between waves. Long-game enabler for all factions via capstone cross-faction synergies.

### Talent Tree

| Node | Name | Effect |
|---|---|---|
| A1 | *Advance Guard* | Enemies gain +2% movement speed AND +2% damage per wave cleared (stacks within run, resets on ascension) |
| A2 | *Tide Surge* | Killing 50% of a wave immediately triggers the next wave, carrying survivors over. On boss waves the boss must die first. Replaces the Wave Rush prestige upgrade entirely (Wave Rush is removed from the prestige shop; existing purchases are refunded in shards) |
| A3 | *Spoils of War* | When a wave switches early via Tide Surge, each enemy alive at the moment of switch grants +5% damage and +5% crit damage until the *next* early switch. Stacks additive, resets to zero at each switch |
| B1 | *Eternal Tithe* | Each ascension grants bonus shards equal to the current ascension count (e.g. 3rd ascension = +3 bonus shards on top of normal award) |
| B2 | *Shard Mastery* | Doubles the per-shard coefficient in the passive damage formula (stacks with C1 — if C1 is also purchased the coefficient is ×1.5 from C1 then ×2 from B2 = ×3 overall: `1 + shards × 0.30`) |
| B3 | *Iron Vault* | Gain 1% of current shards (rounded down, minimum 1) as bonus shards on every ascension |
| C1 | *Battle Hardened* | ×1.5 to the shard passive bonus coefficient (`1 + shards × 0.15` instead of default `0.10`) |
| C2 | *Momentum* | Shards awarded on ascension are multiplied by `1 + 0.1 × ascensionCount` |
| C3 | *Tidal Convergence* | Merges every 10-wave decade into one gigantic wave. Waves 1–10 become one wave; 11–20 become one; and so on. The merged wave always contains a boss scaled to the boss-wave HP of that decade, plus all regular enemies from the 9 non-boss waves. Clearing the merged wave advances the wave counter by 10. Makes VANGUARD the fastest faction for wave-per-second progression. |

### Capstone — ENDLESS WAR

- `baseCost: 1,000,000`, `costMult: 1.30`, unlimited rank
- **All factions (rank 1+):** Wave-skip threshold is set to 75% for all non-VANGUARD factions (half-strength Tide Surge; VANGUARD always keeps 50%). Merged Tidal Convergence waves always require boss-dead before Tide Surge can fire.
- **All factions (rank 1+):** Auto-ascension dropdown added to the Ascension tab — options: *Off*, *On overkill end*, *On defeat*
- **All factions (rank 1+):** Faction choice overlay gains a 10-second countdown that re-selects the previously active faction automatically
- **Per rank:** The normalised damage value used for the obliterate overkill *check* is multiplied by `1 + rank × 0.25` — makes the tower appear stronger to the trigger formula so obliterate fires more frequently at high ranks. Does **not** change actual damage dealt.

### Implementation Notes

- Wave Rush prestige upgrade removed; on load, detect prior purchases and credit shards back
- `vanguardSpeedBonus` — accumulated speed ramp, resets on ascension
- `vanguardSpoilsStacks` — current A3 additive stack count; reset to 0 at each early-switch, then recalculated from carryover enemy count
- `ascensionCount` — incremented in `beginAscend()`; used by B1 (bonus shards) and C2 (shard multiplier)
- Tide Surge trigger: at 50% of wave total killed, fire wave transition and carry survivors; boss waves (and Tidal Convergence merged waves) require boss dead first
- A3 wired into both damage multiplier and crit damage multiplier in `normalizedShotDamage()` / crit path
- C3 Tidal Convergence: `game.vanguardTidalConvergence = true`; `waveSpawner.begin()` calls `buildMergedWave(firstWave, bossWave)`; `onWaveComplete` advances `game.wave` by 10 instead of 1; merged wave uses `entry.wave` per-enemy for correct HP scaling; boss tagged with `bossWave` number
- Auto-ascension logic (capstone): `autoAscensionMode ∈ {off, overkill, defeat}` stored in `apex_prefs`; checked after overkill-end and after defeat events
- Obliterate check in `checkObliterateAtWaveStart()` in `projectile.js`: multiply `normShot` by `1 + vanguardCapstoneRank × 0.25` for the check only
- Shard passive formula reference:
  - Default:         `1 + shards × 0.10`
  - C1 only:         `1 + shards × 0.15`
  - B2 only:         `1 + shards × 0.20`
  - C1 + B2:         `1 + shards × 0.30`
- `vanguardCapstoneRank` stored in `apex_faction_capstones` alongside `warbornCapstoneRank`

---

## THE WARBORN — Stub (coming soon)

> *"The tower fights for you. Now fight for it."*

Active path. The player fires mortars by targeting positions on the canvas and triggers three combat abilities. Demands constant attention; rewards it with a DPS ceiling neither other faction can reach.

### Talent Tree

| Node | Name | Effect |
|---|---|---|
| A1 | *Field Artillery* | Enables mortar. A crosshair follows the cursor and shrinks over 0.75 s. At 0.75 s it locks in place. A mortar projectile flies to that position in 0.25 s, dealing 100% normalized shot damage to all enemies within 50 px. Loop restarts immediately — one mortar per second. Visual: shrinking crosshair ring during tracking, locked crosshair while in flight. |
| A2 | *Heavy Ordnance* | Mortar blast radius 150 px; mortar damage 300% normalized shot damage; enemies hit are stunned for 0.5 s. |
| A3 | *Carpet Bombing* | 4 additional mortar projectiles fire simultaneously, each offset 100 px from the main impact point (N/S/E/W). Incentive: if the main shot lands directly on a dense cluster all 5 overlap for 5× effective hits. |
| B1 | *Rallying Cry* | Unlocks ability panel. **OVERDRIVE** (1) — tower fires 3× rate for 5 s, 60 s CD. Passive: completing a wave removes 1 s from all active ability cooldowns. |
| B2 | *Fury* | **FURY** (2) — all damage ×2 for 4 s, 60 s CD. Passive: active abilities that are currently running have their remaining duration extended by 0.5 s on wave completion. |
| B3 | *Avatar of War* | **ANNIHILATION** (3) — all enemies on screen instantly lose 30% current HP, 60 s CD. Passive: completing a wave removes an additional 1 s from all active ability cooldowns (stacks with B1, total −2 s per wave clear). |
| C1 | *Blood Rush* | Kills within 1.5 s of each other grant a Rush Stack (no cap). Each stack: +3% damage. Stacks decay 3 s after the last kill. |
| C2 | *Rampage* | For every 10 Rush Stacks, tower fire rate +1%. |
| C3 | *Unstoppable* | At the start of each wave, Rush Stacks are protected from decay for 10 s (enemies need time to reach the tower). Mortar hits reset the decay timer. Mortar kills grant a stack. Overkill kills grant 2 stacks. |

### Capstone — ETERNAL WARRIOR

- `baseCost: 1,000,000`, `costMult: 1.30`, unlimited rank
- **Rank 1**: mortar hits remove 5% of current HP from all enemies in the blast radius (in addition to flat damage)
- **Each rank**: mortar current-HP removal increases by +0.1% (rank 10: 6%, rank 20: 7%, etc.)
- **Each rank**: regular projectiles (including spread, multi-shot, chain, ricochet extra hits) remove `(rank × 0.1)%` of current HP of each enemy hit — **active regardless of current faction**
- **Each rank**: all ability cooldowns are reduced by 0.1 s (cap: −30 s total, i.e. rank 300 ceiling, effectively unlimited for normal play)
- Current-HP removal is applied after flat damage on the same hit
- Cross-faction synergy: just as NEXUS Singularity seeds permanent Neural Stacks into every future run, ETERNAL WARRIOR seeds a permanent per-hit current-HP% strip into every future run — the more ranks, the more every projectile shreds high-HP enemies across all factions

### Implementation Notes (pre-build)

- Mortar damage uses `normalizedShotDamage(tower, game)` — already accounts for shard/traitor/faction/crit/overcharge multipliers without recalculating them
- Mortar state per frame: `mortarTrackTimer` (0→0.75 s), `mortarLocked` (bool), `mortarLockedX/Y`, `mortarInFlight` (bool), `mortarFlightTimer` (0→0.25 s)
- Canvas `mousemove` updates `game.mortarCursorX/Y`; tracking phase follows cursor, locked phase ignores it
- Crosshair drawn in `renderer.js`: large ring shrinking to small ring over 0.75 s during tracking; static ring during flight
- On lock: record `mortarLockedX/Y`, set `mortarInFlight = true`, reset `mortarFlightTimer`
- On impact: AoE hit all enemies within 50 px (150 px with A2); apply stun if A2; fire 4 offset projectiles if A3; then restart tracking phase
- Stun: enemies with `stunTimer > 0` skip movement update
- B passive (wave complete): subtract 1 s from all cooldowns if B1 purchased, another 1 s if B3 purchased; extend active ability durations by 0.5 s if B2 purchased
- Rush Stack counter in HUD
- `rushStacks`, `rushDecayTimer`, `rushDecayProtected` (bool, wave-start grace), `mortarLockedX`, `mortarLockedY`, `mortarTrackTimer`, `mortarInFlight`, `mortarFlightTimer`, `overdriveCooldown`, `furyCooldown`, `annihilationCooldown`, `overdriveTimer`, `furyTimer` all live on `game`
- Capstone current-HP removal applied in `_damageEnemy` in `projectile.js` after flat damage; mortar path applies its own removal at impact
- Ability cooldowns are per-run, not saved
- `warbornCapstoneRank` read from `apex_faction_capstones` to compute cooldown reduction and HP% values at runtime

---

## Resolved Design Questions

| Question | Resolution |
|---|---|
| Faction nodes wiped on ascension — refunded or lost? | **Permanent** — nodes are never lost, re-picking the same faction restores full tree |
| CONCLAVE OBLITERATING STRIKE vs prestige OBLITERATE overlap? | **Stack** — different triggers (manual timed ability vs auto overkill reaction) |
| Mortar visual: instant-hit or arc projectile? | **Arc projectile**, 0.25 s travel time after 0.75 s cursor-tracking lock-in phase |
| Ability panel placement? | Below HP bar on canvas for both CONCLAVE and WARBORN |
| Neural Stack double-dip via Singularity? | **No** — `onAscend` subtracts `permanentNeuralStacks` before applying the %; only fresh run-earned stacks count |
| Roster size cap? | **Removed** — no cap; merging to apex requires far more than any fixed limit |
| VANGUARD Column B direction? | **Pure shard focus** — War Tax / Blood Tithe / Endless Column replaced with Eternal Tithe / Shard Mastery / Iron Vault |
| VANGUARD A1 per-wave speed value? | **+2% per wave** |
| VANGUARD A3 stack reset behaviour? | **Reset to zero at each early-switch**, then recalculated from carryover count |
| VANGUARD Wave Rush removal handling? | **Hard-remove, refund shards** to any player who purchased it |
| VANGUARD faction name confirmed? | **THE VANGUARD** |
| VANGUARD B2 Shard Mastery value? | **×2 the C1 coefficient** — if both C1 and B2 purchased, coefficient is ×3 (`0.10 × 1.5 × 2 = 0.30`) |
| VANGUARD B3 Iron Vault effect? | **1% of existing shards (rounded down, min 1) as bonus shards on ascension** |
| VANGUARD capstone obliterate multiplier per rank? | **×(1 + rank × 0.25)** applied to normShot in the overkill check only |

---

## Storage Keys

| Key | Contents |
|---|---|
| `apex_faction` | `activeFaction`, `neuralStacks` (run state, cleared on ascension) |
| `apex_faction_capstones` | `permanent` object: per-faction `nodes`, `capstoneRank`, `permanentNeuralStacks` (NEXUS only), `vanguardCapstoneRank` |
| `apex_prefs` | `quality`, `autoQuality`, `volume`, `autoAscensionMode` (ENDLESS WAR capstone setting, survives New Game) |
