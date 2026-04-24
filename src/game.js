export const State = Object.freeze({
  COMBAT:   'COMBAT',
  DEFEATED: 'DEFEATED',
});

export class Game {
  constructor() {
    this.state              = State.COMBAT;
    this.wave               = 1;
    this.currency           = 0;
    this.currencyMultiplier = 1.0;
    this.waveEarned         = 0;  // display accumulator only — not banked at end
    this.waveKills          = 0;  // enemies killed this wave (cleared % and wave rush)
    this.lastWave           = 0;
    this.lastWaveEarned     = 0;
    this.bestWave           = 1;
    this.upgrades           = {};
    this.tower              = null;
    this.enemyPool          = null;
    this.projectilePool     = null;
    this.waveSpawner        = null;
    this.overlayTimer       = 0;
    this.DEFEATED_DURATION  = 3;
    this.resultsTimer       = 0;  // counts down; results overlay shown while > 0
    this.RESULTS_DURATION   = 2;
    this.wavePending            = false; // true = next wave held until enemy count < 250
    this.wavePendingKeepEnemies = false;

    // Short-lived visual effects (drained each frame by renderer)
    this.explosions    = []; // { x, y, r, t } — t counts down to 0
    this.lightningArcs = []; // { x1, y1, x2, y2, t }
    this.ricochetLines = []; // { x1, y1, x2, y2, t, life }
    this.deathRings    = []; // { x, y, r, t, color } — expanding ring on enemy death
    this.edgeFlash     = 0;  // seconds remaining for boss screen-edge flash
    this.currencyPopups = []; // { amount, x, y, t } — +$N floaters above killed enemies
    this.skullPopups    = []; // { x, y, t } — skull floaters on execute kills
    this.obliterateTimer    = -1;   // countdown in seconds; -1 = inactive
    this.obliterateOverkill = 0;   // overkill multiplier that triggered this round
    this.obliterateInFlight = false; // true while blastwave kill setTimeout is pending
    this.obliterateMigrated = false; // true if the active countdown carried over from a prior wave
    this.blastwaves         = []; // { x, y, r, maxR, t, life } — obliterate shockwave rings
    this.enemyProjectiles   = []; // { x, y, vx, vy, damage, type, t } — boss/colossus shots

    // ── Transmissions ───────────────────────────────────────────────────────
    // Queue of { lines: string[], timer: number } broadcasts shown centre-top.
    this.transmissions      = [];
    this._transmissionSeen  = new Set(); // dedup keys so each fires only once per session

    // Particle system — initialized in main.js after bootstrap
    this.particles = null;

    // Visual quality: 'high' | 'medium' | 'low'
    // Loaded from localStorage in main.js; default high.
    this.quality     = 'high';
    this.autoQuality = true;   // when true, AUTO mode may step quality down

    // FPS tracking — maintained by main.js loop, read by renderer
    this.fps         = 60;     // smoothed display value

    // Rolling 60-second earned tally — used by shop UI to estimate time-to-afford.
    // _earnLog entries: { amount, age } where age counts up; purged when age > 60s.
    this._earnLog    = [];
    this.recentEarned = 0;     // sum of _earnLog amounts (kept in sync)

    // ── Prestige (Ascension) ────────────────────────────────────────────────
    // pendingShards: earned this run from wave-50+ boss kills; locked until Ascension
    // shards: spendable balance (spent shards are deducted from this)
    // totalShardsEarned: monotonically increasing — never decremented; drives passive dmg bonus
    // prestigeUpgrades: purchased prestige tiers, persist across Ascensions
    // ascensionCount: number of times player has ascended (cosmetic / future use)
    this.pendingShards      = 0;
    this.shards             = 0;
    this.totalShardsEarned  = 0;
    this.prestigeUpgrades   = {};
    this.ascensionCount     = 0;

    // ── Auto-Buyer (prestige upgrade) ───────────────────────────────────────
    this.autoBuyInterval    = 0;  // seconds between auto-purchases; 0 = disabled
    this.autoBuyTimer       = 0;
    this.autoBuyEnabled     = true;  // HUD toggle — user can pause auto-buying
    this.autoAbilitiesEnabled = true; // HUD toggle — auto-fire WARBORN abilities (gated by Eternal Warrior)

    // ── Shard meta upgrades ─────────────────────────────────────────────────
    this.shardBonusMult      = 1.0; // multiplier on shards awarded (Shard Tithe)
    this.veteranBonusDivisor = 0;   // if > 0: floor(wave / divisor) bonus shards on ascend
    this.shardCovenantMult   = 0;   // 0 = disabled; coefficient × shards = wave bonus mult

    // ── Traitor (pet) system ────────────────────────────────────────────────
    this.traitorSystem              = null; // set in main.js bootstrap
    this.pendingTraitorAnnouncements = [];  // [{ type, rarity }] drained by ui.js

    // ── Faction (Covenant) system ───────────────────────────────────────────
    this.factionSystem        = null;   // set in main.js bootstrap
    // Per-run faction flags (reset by FactionSystem.reapplyAll)
    this.lureProtocols        = false;  // NEXUS A1
    this.optimalRoster        = false;  // NEXUS A2
    this.stackCascade         = false;  // NEXUS A3
    this.signalHarvest        = false;  // NEXUS B1
    this.resonanceField       = false;  // NEXUS B2
    this.apexProtocol         = false;  // NEXUS B3
    this.dataHarvest          = false;  // NEXUS C1
    this.stackAmplifier       = false;  // NEXUS C2
    this.recursiveGrowth      = false;  // NEXUS C3
    // Neural Stack counters
    this.neuralStacks         = 0;      // total stacks active this run (permanent + run-earned)
    this.permanentNeuralStacks = 0;     // preserved stacks from Singularity (loaded from capstone save)
    this.bestRunWave          = 0;      // highest wave cleared this run — Data Harvest only awards stacks on first clear
    // Lure Protocols — which enemy type has 3× capture this wave (set each wave start)
    this.lureType             = null;

    // ── WARBORN faction state ───────────────────────────────────────────────
    // Node flags (reset by FactionSystem.reapplyAll)
    this.warbornMortar        = false;  // A1
    this.warbornHeavyOrdnance = false;  // A2
    this.warbornCarpetBombing = false;  // A3
    this.warbornRallyCry      = false;  // B1
    this.warbornFury          = false;  // B2
    this.warbornAvatarOfWar   = false;  // B3
    this.warbornBloodRush     = false;  // C1
    this.warbornRampage       = false;  // C2
    this.warbornUnstoppable   = false;  // C3

    // Mortar loop state (per-run, not saved)
    this.mortarTrackTimer  = 0;      // counts up 0→0.75 s (tracking phase)
    this.mortarLocked      = false;  // true = locked, waiting for flight
    this.mortarLockedX     = 0;
    this.mortarLockedY     = 0;
    this.mortarInFlight    = false;
    this.mortarFlightTimer = 0;      // counts down 0.25→0
    this.mortarCursorX     = 0;      // canvas coords, updated by mousemove
    this.mortarCursorY     = 0;
    this.mortarCursorFrozen = false; // true = crosshair locked in place on click

    // Ability cooldowns/timers (per-run, not saved)
    this.overdriveCooldown  = 0;    // seconds until Overdrive can be used again
    this.overdriveActive    = false;
    this.overdriveTimer     = 0;    // seconds remaining in active burst
    this.furyCooldown       = 0;
    this.furyActive         = false;
    this.furyTimer          = 0;
    this.ironTideCooldown   = 0;
    this.ironTideActive     = false;
    this.ironTideTimer      = 0;

    // Rush Stack state (per-run, not saved)
    this.rushStacks         = 0;
    this.rushDecayTimer     = 0;    // counts down; 0 = start decaying
    this.rushDecayProtected = false;// Unstoppable wave-start protection
    this.rushKillTimer      = 0;    // counts up; reset on kill; stack if < 1.5s

    // Cross-faction permanent capstone rank (persists like NEXUS permanentNeuralStacks)
    // Loaded from factionCapstones save; read by projectile.js and mortar damage calc
    this.warbornCapstoneRank = 0;

    // ── VANGUARD faction state ──────────────────────────────────────────────
    // Node flags (reset by FactionSystem.reapplyAll)
    this.vanguardAdvanceGuard  = false; // A1
    this.vanguardTideSurge     = false; // A2
    this.vanguardSpoilsOfWar   = false; // A3
    this.vanguardEternalTithe  = false; // B1
    this.vanguardShardMastery  = false; // B2
    this.vanguardIronVault     = false; // B3
    this.vanguardBattleHardened = false;// C1
    this.vanguardMomentum      = false; // C2
    this.vanguardApexMomentum  = false; // C3
    this.vanguardTidalConvergence = false; // legacy — no longer functional
    this.vanguardIronWill      = false; // C3 legacy alias (old saves) — no longer functional

    // Per-run VANGUARD state (reset on ascension)
    this.vanguardSpeedBonus    = 0;     // accumulated +2%/wave (applied multiplicatively in enemy.js)
    this.vanguardSpoilsStacks  = 0;     // current A3 additive stack count
    this.vanguardBossKilledThisWave = false; // track boss death for Tide Surge trigger

    // Permanent Apex Momentum bonus — accrues on ascension, cross-faction
    // Stored in FactionSystem.permanent.vanguard.apexDmgBonus and synced here each run
    this.vanguardApexDmgBonus  = 0;    // fractional multiplier, e.g. 0.06 = +6%

    // Cross-faction capstone rank
    this.vanguardCapstoneRank  = 0;

    // Auto-ascension mode (capstone synergy): 'off' | 'overkill' | 'defeat'
    this.autoAscensionMode     = 'off';
  }

  transition(newState) {
    this.state        = newState;
    this.overlayTimer = 0;
  }

  tickOverlay(dt) {
    this.overlayTimer += dt;
    return this.overlayTimer >= this.DEFEATED_DURATION;
  }

  // Call once per frame from main.js to age out old entries.
  tickEarnLog(dt) {
    const WINDOW = 60; // seconds
    for (const e of this._earnLog) e.age += dt;
    this._earnLog = this._earnLog.filter(e => e.age < WINDOW);
    this.recentEarned = this._earnLog.reduce((s, e) => s + e.amount, 0);
  }

  // Queue a transmission broadcast. `key` is a dedup identifier — each key fires once per session.
  transmit(key, lines) {
    if (this._transmissionSeen.has(key)) return;
    this._transmissionSeen.add(key);
    this.transmissions.push({ lines, timer: 15 });
  }

  // Record a kill reward in the rolling window.
  logEarned(amount) {
    this._earnLog.push({ amount, age: 0 });
    this.recentEarned += amount;
  }

  // Award pending shards for killing a boss on wave >= 50.
  // Formula: floor(1 + (wave-50)/10) × milestone multiplier
  // Milestone ×3 at x00 waves, ×10 at x000 waves.
  awardShards(wave) {
    if (wave < 50) return;
    const base = Math.floor(1 + (wave - 50) / 10);
    const mult = wave % 1000 === 0 ? 10
               : wave % 100  === 0 ? 3
               : 1;
    this.pendingShards += Math.floor(base * mult * this.shardBonusMult);
    // totalShardsEarned is incremented in ascend() when pending shards are claimed
  }

  // Passive damage multiplier from total shards ever earned (spent shards still count).
  // VANGUARD C1 Battle Hardened: ×1.5 coefficient → 0.15
  // VANGUARD B2 Shard Mastery:   ×2 the C1 coefficient → 0.30 (or 0.20 without C1)
  shardDmgMult() {
    let coeff = 0.10;
    if (this.vanguardBattleHardened) coeff *= 1.5;
    if (this.vanguardShardMastery)   coeff *= 2;
    return 1 + this.totalShardsEarned * coeff;
  }

  // Multiplicative damage bonus from active traitor pets.
  // NEXUS B2 (Resonance Field) doubles each pet's bonus.
  traitorDmgMult() {
    const bonus = this.traitorSystem?.damageBonus() ?? 0;
    const resonanceMult = this.resonanceField ? 2 : 1;
    return 1 + bonus * resonanceMult;
  }

  // Multiplicative damage bonus from Neural Stacks.
  // Base: +0.2%/stack (all factions). +0.8%/stack extra with NEXUS C2 Stack Amplifier.
  factionDmgMult() {
    if (this.neuralStacks <= 0) return 1.0;
    const coeff = 0.002 + (this.stackAmplifier ? 0.008 : 0);
    return 1 + this.neuralStacks * coeff;
  }

  // Multiplicative currency bonus from Neural Stacks.
  // Base: +0.2%/stack (all factions). +0.8%/stack extra with NEXUS C1 Data Harvest.
  factionCurrencyMult() {
    if (this.neuralStacks <= 0) return 1.0;
    const coeff = 0.002 + (this.dataHarvest ? 0.008 : 0);
    return 1 + this.neuralStacks * coeff;
  }

  // WARBORN: maximum Rush Stacks (base 1000, +25 per Eternal Warrior rank)
  rushStackCap() {
    return 1000 + this.warbornCapstoneRank * 25;
  }

  // Increment Rush Stacks by n, clamped to the cap.
  addRushStacks(n = 1) {
    this.rushStacks = Math.min(this.rushStackCap(), this.rushStacks + n);
  }

  // WARBORN: Rush Stack damage multiplier (Blood Rush C1, each stack +3%)
  rushDmgMult() {
    if (!this.warbornBloodRush || this.rushStacks === 0) return 1.0;
    return 1 + this.rushStacks * 0.03;
  }

  // WARBORN: Fury damage multiplier
  furyDmgMult() {
    return (this.warbornFury && this.furyActive) ? 2.0 : 1.0;
  }

  // WARBORN: Overdrive fire-rate multiplier
  overdriveFireRateMult() {
    return (this.warbornRallyCry && this.overdriveActive) ? 3.0 : 1.0;
  }

  // WARBORN: Rampage fire-rate bonus (% per 10 stacks)
  rampageFireRateMult() {
    if (!this.warbornRampage || this.rushStacks === 0) return 1.0;
    return 1 + Math.floor(this.rushStacks / 10) * 0.01;
  }

  // WARBORN: cross-faction current-HP removal per regular projectile hit
  warbornProjectileHpPct() {
    if (this.warbornCapstoneRank <= 0) return 0;
    return this.warbornCapstoneRank * 0.001; // rank × 0.1%
  }

  // WARBORN: mortar current-HP removal per hit (capstone rank 1 = 5%, +0.1%/rank)
  warbornMortarHpPct() {
    if (this.warbornCapstoneRank <= 0) return 0;
    return 0.05 + (this.warbornCapstoneRank - 1) * 0.001;
  }

  // WARBORN: ability cooldown reduction from capstone (cap 40 s)
  warbornCooldownReduction() {
    return Math.min(40, this.warbornCapstoneRank * 0.5);
  }

  // VANGUARD: Spoils of War damage multiplier (A3)
  // Each surviving carryover enemy at switch = +5% dmg until next switch
  vanguardSpoilsDmgMult() {
    if (!this.vanguardSpoilsOfWar || this.vanguardSpoilsStacks === 0) return 1.0;
    return 1 + this.vanguardSpoilsStacks * 0.05;
  }

  // VANGUARD: Spoils of War crit damage multiplier (A3)
  // Each surviving carryover enemy at switch = +5% crit damage
  vanguardSpoilsCritAdd() {
    if (!this.vanguardSpoilsOfWar || this.vanguardSpoilsStacks === 0) return 0;
    return this.vanguardSpoilsStacks * 0.05;
  }

  // VANGUARD C3: Apex Momentum — permanent cross-faction damage bonus accrued on ascension
  // Each ascension adds bestWave × 0.001 (i.e. bestWave × 0.1%) to the permanent pool.
  vanguardApexDmgMult() {
    if (this.vanguardApexDmgBonus <= 0) return 1.0;
    return 1 + this.vanguardApexDmgBonus;
  }
}
