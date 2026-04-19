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

## THE WARBORN — Stub (coming soon)

> *"The tower fights for you. Now fight for it."*

Active path. The player fires mortars by targeting enemies on the canvas and triggers three combat abilities. Demands constant attention; rewards it with a DPS ceiling neither other faction can reach.

### Talent Tree

| Node | Name | Effect |
|---|---|---|
| A1 | *Field Artillery* | Hover over an enemy for 0.3 s to lock mortar target; fires after 0.8 s charge dealing 100% tower base damage, 3 s CD. Crosshair reticle drawn on target. |
| A2 | *Heavy Ordnance* | Mortar damage 300% tower base damage, 60 px splash, 1.5 s CD |
| A3 | *Carpet Bombing* | 3 mortars fire simultaneously (locked target + 2 nearest), 2 s CD for the trio |
| B1 | *Rallying Cry* | Unlocks ability panel. **OVERDRIVE** (1) — tower fires 3× rate for 5 s, 60 s CD |
| B2 | *Fury* | **FURY** (2) — all damage ×2 for 4 s, 80 s CD |
| B3 | *Avatar of War* | **ANNIHILATION** (3) — all enemies on screen instantly lose 30% current HP, ignores armor, 100 s CD |
| C1 | *Blood Rush* | Kills within 1.5 s of each other grant a Rush Stack (max 10). Each stack: +3% damage. Stacks decay after 3 s with no kill. |
| C2 | *Rampage* | At 5+ Rush Stacks: fire rate +20%. At 10 stacks: fire rate +40% |
| C3 | *Unstoppable* | Rush Stacks never decay mid-wave; mortar kills grant stacks; overkill grants 2 stacks |

### Capstone — ETERNAL WARRIOR

- `baseCost: 75,000`, `costMult: 1.35`, **capped at rank 40**
- Each rank: +5% mortar damage, +1 Rush Stack cap
- Each rank: +0.001 to `warbornHpContribution` (enemy HP exponent reduction)

### Implementation Notes (pre-build)

- Mortar is visual arc projectile (not instant-hit) with travel time ~0.4 s for feel
- Ability panel: 3 buttons keyed 1/2/3, cooldown fill bars
- Rush Stack counter in HUD (top-left, below neural stacks if NEXUS was active previous run)
- `rushStacks`, `rushDecayTimer`, `mortarTarget`, `mortarHoverTimer`, `mortarCooldown` all live on `game`
- Canvas `mousemove` drives hover timer; click fires mortar if charged
- `warbornHpContribution` stored in `apex_faction_capstones`

---

## Resolved Design Questions

| Question | Resolution |
|---|---|
| Faction nodes wiped on ascension — refunded or lost? | **Permanent** — nodes are never lost, re-picking the same faction restores full tree |
| CONCLAVE OBLITERATING STRIKE vs prestige OBLITERATE overlap? | **Stack** — different triggers (manual timed ability vs auto overkill reaction) |
| Mortar visual: instant-hit or arc projectile? | **Arc projectile**, ~0.4 s travel time |
| Ability panel placement? | Below HP bar on canvas for both CONCLAVE and WARBORN |
| Neural Stack double-dip via Singularity? | **No** — `onAscend` subtracts `permanentNeuralStacks` before applying the %; only fresh run-earned stacks count |
| Roster size cap? | **Removed** — no cap; merging to apex requires far more than any fixed limit |

---

## Storage Keys

| Key | Contents |
|---|---|
| `apex_faction` | `activeFaction`, `neuralStacks` (run state, cleared on ascension) |
| `apex_faction_capstones` | `permanent` object: per-faction `nodes`, `capstoneRank`, `permanentNeuralStacks` (NEXUS only) |
