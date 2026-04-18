# The Covenant — Faction System Design

## Overview

- **Damage upgrade** capped at **tier 38** (total cost ~1.6M gold; finishes before the expensive endgame shop upgrades like Ring/Laser DPS at ~5.6M each)
- The faction choice modal is shown **immediately after every ascension**, before the new run begins
- The chosen faction is **permanent for that run**; ascension always resets it so the player re-evaluates when their circumstances change
- **Regular gold** funds faction nodes — no new currency
- Previously purchased faction nodes are wiped on ascension (open question: refunded as gold or simply lost?)
- After choosing, a **"Faction" tab** appears in the shop panel with a graphical talent tree (SVG nodes + connecting lines)

## Trigger Condition

Player presses Ascend → ascension resolves (shards transferred, run reset) → **faction choice modal is shown** before the new run's first wave starts. No prior condition required; the choice is always presented fresh.

---

## Design Principle: Each Faction Advances a Different Existing System

Each faction's talent tree is themed around one of the game's core passive progression systems, so the faction feel is coherent and the tree nodes reinforce player identity:

| Faction | Advances | Rationale |
|---|---|---|
| **NEXUS** | Traitor / pet system | Traitors are already passive — they accumulate and compound without player input, perfect mirror for the observer playstyle |
| **THE CONCLAVE** | Prestige / shard economy | Doctrine upgrades amplify the tower's existing weapon systems; abilities are triggered once per cooldown, not constantly |
| **THE WARBORN** | Direct combat contribution | Mortars and kill-streaks reward sustained player attention with a DPS ceiling unavailable to other factions |

---

## Capstone Persistence (Cross-Ascension)

Capstones are **permanent across ascensions**, stored separately (like prestige upgrades, key `apex_faction_capstones`). They are **not** reset when the player picks a different faction.

This creates two incentives:
1. Playing a faction you don't prefer still yields a permanent power gain via its capstone
2. Over many ascensions, a player who cycles through all three factions accumulates all three capstones — a long-term meta-goal

The `hpExponentBonus` applied to enemy scaling is the **sum** of all three capstone contributions. Maximum total bonus: 3 × 0.04 = 0.12, reducing the exponent from 1.07 → 0.95. Since an exponent below 1.0 would make enemies weaker each wave, a hard floor of **1.02** is enforced (`max(1.02, 1.07 - totalBonus)`).

At floor 1.02^500 vs 1.07^500:
- 1.07^500 ≈ 3.1×10^14
- 1.02^500 ≈ 19,900
- ~15 billion times less HP — wave 500 becomes reachable when combined with other damage systems

---

## Faction Names & Themes

| | **NEXUS** | **THE CONCLAVE** | **THE WARBORN** |
|---|---|---|---|
| Style | Passive / observer | Strategic / periodic active | Fully active / combat |
| Flavor | Distributed AI that takes over tower operations | Ancient warlord council granting tactical doctrine | Warriors who fight alongside the tower |
| Advances | Traitor system | Weapon amplification + shard income | Direct damage contribution |
| HUD addition | Neural Stack counter | Ability cooldown bars (Q/W/E) | Rush Stack counter + mortar reticle |

---

## Talent Tree Structure

Identical layout for all three factions, different content:

```
[A1]──[B1]──[C1]   ← Tier 1 (always purchasable after joining)
 │     │     │
[A2]──[B2]──[C2]   ← Tier 2 (requires same-column T1)
 │     │     │
[A3]──[B3]──[C3]   ← Tier 3 (requires same-column T2)
       │
    [CAPSTONE]     ← Unlocks when any full column (A1+A2+A3 OR B1+B2+B3 OR C1+C2+C3) is complete
                     Persists across ascensions. Always active regardless of current faction.
```

Capstone is **unlimited rank**, moderate cost curve (`baseCost: 75,000`, `costMult: 1.35`).

### Capstone Scaling Mechanic

CONCLAVE and WARBORN capstones each add `0.001` per rank to their HP exponent contribution. NEXUS Singularity does not reduce the HP exponent — its scaling path is permanent Neural Stack accumulation driving the A3 damage/currency multiplier instead.

Total enemy HP formula (CONCLAVE + WARBORN contributions only):

```
const exponent = Math.max(1.02, 1.07 - conclaveCapstone*0.001 - warbornCapstone*0.001);
Math.pow(exponent, wave - 1)
```

Each of the two contributing capstones individually capped at **rank 40** (max 0.04 each, 0.08 combined). Floor of 1.02 enforced (`1.07 - 0.08 = 0.99` without floor).

At floor 1.02^500 vs 1.07^500:
- 1.07^500 ≈ 3.1×10^14
- 1.02^500 ≈ 19,900
- ~15 billion times less HP — wave 500 becomes reachable when combined with other damage systems

---

## NEXUS

> *"The machine never sleeps. Join us, and neither will your tower."*

Automation path. The player becomes a pure observer. The tree deepens the traitor/pet system — passive compounding is the Nexus identity.

### Talent Tree

| Node | Name | Effect |
|---|---|---|
| A1 | *Lure Protocols* | One random enemy type per wave has 3× capture chance; that type is highlighted in the HUD |
| A2 | *Optimal Roster* | After every capture or merge, automatically slots the three highest-value active traitors. Auto-merges inactive (unslotted) traitors when they reach the merge threshold. Protected rule: a merge is skipped if it would remove a pet of the same type+rarity currently occupying an active slot and no replacement of equal or greater value exists. |
| A3 | *Stack Cascade* | When a traitor merges, gain Neural Stacks equal to the resulting rarity's tier index (common=1 … apex=10) |
| B1 | *Signal Harvest* | Traitor capture chance doubled (global, stacks with A1) |
| B2 | *Resonance Field* | Active traitor pets grant double their normal bonus |
| B3 | *Apex Protocol* | Merge cost reduced from 5→4 pets per merge |
| C1 | *Data Harvest* | +1 Neural Stack per wave cleared (HUD counter, persists the run) |
| C2 | *Stack Amplifier* | Each Neural Stack → +0.8% multiplicative damage AND +0.3% currency multiplier |
| C3 | *Recursive Growth* | Neural Stacks gained per wave is multiplied by the number of filled active traitor slots |

### Capstone — SINGULARITY (unlimited, persists across ascensions)

- `baseCost: 1,000,000`, `costMult: 1.30`
- Each rank: at the moment of ascension, (rank)% of Neural Stacks accumulated this run are permanently preserved and start active at the beginning of every future run
- At rank 1: unlocks a permanent 4th active traitor slot for all future runs regardless of active faction (stored in `apex_faction_capstones`)
- Permanent stacks are stored in `apex_faction_capstones` alongside the capstone rank and compound across ascensions
- The scaling path to wave 500 for NEXUS is through permanent stack accumulation driving the C2 damage/currency multiplier rather than HP exponent reduction
- Tooltip: *"The Nexus remembers. Every insight you've gathered will seed the next awakening."*

---

## THE CONCLAVE

> *"We have seen a thousand wars. We know where every battle is won."*

Strategic path. Amplifies tower weapon systems passively and unlocks three powerful battlefield commands on cooldown. Requires periodic attention — not constant.

The Conclave advances the **shard/prestige economy** through the weapon amplification column: stronger weapons → deeper waves → more boss kills → more shards.

### Talent Tree

| Node | Name | Effect |
|---|---|---|
| A1 | *Ballistic Doctrine* | Explosive radius +40%; chain lightning bounces +2 |
| A2 | *Siege Doctrine* | Laser burst and orbital ring DPS ×1.75 |
| A3 | *Overwhelming Force* | All shot modifiers deal +75% damage |
| B1 | *Field Command* | Unlocks Command Panel (Q/W/E). First ability: **RALLY** — 3× fire rate for 5s, 90s CD |
| B2 | *Veteran's Arsenal* | Second ability: **GRAVITY WELL** — pulls all enemies toward tower for 3s + contact damage, 75s CD |
| B3 | *War Council* | Third ability: **OBLITERATING STRIKE** — all enemies lose 25% current HP instantly, ignores armor, 120s CD |
| C1 | *Reconnaissance* | All enemies always show HP bar |
| C2 | *Vulnerability Analysis* | Enemies below 50% HP take +25% damage from all sources |
| C3 | *Perfect Intel* | Execute threshold doubled; execute kills grant 2× currency AND +1 pending shard |

### Capstone — TOTAL WAR (unlimited, persists across ascensions)

- `baseCost: 75,000`, `costMult: 1.35`
- Each rank: −0.5s off all ability cooldowns (floor 10s each)
- Each rank: +0.001 to `conclaveHpContribution` (enemy HP exponent reduction)
- Tooltip: *"The Conclave's war machine has no off switch."*

---

## THE WARBORN

> *"The tower fights for you. Now fight for it."*

Active path. The player fires mortars by hovering over enemies on the canvas and triggers three combat abilities on separate cooldowns. Demands constant attention; rewards engagement with a DPS ceiling that neither other faction can reach.

### Talent Tree

| Node | Name | Effect |
|---|---|---|
| A1 | *Field Artillery* | Hovering canvas cursor over an enemy for 0.3s locks it as mortar target; mortar fires after 0.8s charge dealing 100% tower base damage, 3s CD. Crosshair reticle drawn on target. |
| A2 | *Heavy Ordnance* | Mortar damage 300% tower base damage, 60px splash, CD 1.5s |
| A3 | *Carpet Bombing* | 3 mortars fire simultaneously (locked target + 2 nearest enemies), CD 2s for the trio |
| B1 | *Rallying Cry* | Unlocks ability panel (key 1). **OVERDRIVE** — tower fires 3× rate for 5s, 60s CD |
| B2 | *Veteran's Arsenal* | Key 2. **FURY** — all damage ×2 for 4s, 80s CD |
| B3 | *Avatar of War* | Key 3. **ANNIHILATION** — all enemies on screen instantly lose 30% current HP, ignores armor, 100s CD |
| C1 | *Blood Rush* | Kills within 1.5s of each other grant a Rush Stack (max 10). Each stack: +3% damage. Stacks decay if no kill for 3s. |
| C2 | *Rampage* | At 5+ Rush Stacks: fire rate +20%. At max 10 stacks: fire rate +40% |
| C3 | *Unstoppable* | Rush Stacks never decay mid-wave; mortar kills grant stacks; overkill grants 2 stacks |

### Capstone — ETERNAL WARRIOR (unlimited, persists across ascensions)

- `baseCost: 75,000`, `costMult: 1.35`
- Each rank: +5% mortar damage, +1 Rush Stack cap
- Each rank: +0.001 to `warbornHpContribution` (enemy HP exponent reduction)
- Tooltip: *"Your fury reshapes the battlefield. The enemy's numbers can no longer protect them."*

---

## Cost Structure

| Tier | Cost per node | Design intent |
|---|---|---|
| T1 | 500,000 | First node purchasable within a few runs after unlocking the faction |
| T2 | 2,500,000 | Mid-progression; requires several runs of surplus gold |
| T3 | 12,500,000 | Long-term investment; ~10–20 runs of dedicated surplus |
| Capstone rank N | 1,000,000 × 1.30^(N−1) | Endless gold sink across many ascensions; rank 10 ≈ 13.8M, rank 20 ≈ 190M |

Total T1–T3 per faction (9 nodes): ~46.5M gold. Intended to fill out over many ascensions, with T3 nodes being a meaningful long-term goal.

---

## File Change Summary

| File | Change |
|---|---|
| `src/faction.js` (new) | `FACTIONS` definition, `FactionSystem` class: `join()`, `purchaseNode()`, `purchaseCapstone()`, `reapplyAll()`, `serialize()`, `deserialize()` |
| `src/game.js` | Add `faction`, `factionNodes`, `hpExponentBonus` (computed sum), `neuralStacks`, `rushStacks`, `rushDecayTimer`, `mortarTarget`, `mortarHoverTimer`, `mortarCooldown`, `commandAbilities`, `factionSystem`; remove `factionChoicePending` (replaced by ascension trigger) |
| `src/enemy.js` | `init()` uses `game.hpExponentBonus` (passed in or accessed via pool); `droneHp()` gains same param |
| `src/wave.js` | Pass `this.game.hpExponentBonus ?? 0` into spawn chain |
| `src/shop.js` | Cap Damage at `maxTier: 38`; update tooltip |
| `src/main.js` | Faction choice shown as part of ascension flow; canvas `mousemove` for mortar targeting; keys 1/2/3 for WARBORN abilities; Q/W/E for CONCLAVE abilities; Rush Stack tick; Neural Stack increment on wave clear; mortar fire logic; ability cooldown ticks |
| `src/renderer.js` | Mortar crosshair reticle; Rush Stack HUD; Neural Stack HUD; command ability cooldown bars |
| `src/ui.js` | Faction choice modal (3 cards + confirm, shown post-ascension); faction tab in shop panel; SVG talent tree render; node tooltip on hover; capstone rank + persistence indicator |
| `src/storage.js` | `saveFactionRun()`, `loadFactionRun()` (key `apex_faction`) for per-run state; `saveFactionCapstones()`, `loadFactionCapstones()` (key `apex_faction_capstones`) for persistent capstone ranks |

---

## Open Questions

1. **Mortar visual**: instant-hit line (like chain lightning) or a visible arc projectile that travels?
2. **Ability panel placement for WARBORN/CONCLAVE**: below the HP bar on canvas? Floating HUD element?
3. **On ascension**: faction nodes wiped — refunded as gold or simply lost?
4. **CONCLAVE overlap**: OBLITERATING STRIKE (B3) and the prestige OBLITERATE upgrade both clear waves. Stack, or gate one behind the other?
5. **First ascension**: Player has never ascended — no faction on the first run. Faction tab simply absent until the first ascension occurs.
