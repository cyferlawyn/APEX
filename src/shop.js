import { Tower } from './tower.js';

// Upgrade catalogue
// Each entry: { id, name, tooltip, maxTier, baseCost, costMult, apply(tower, game, tier) }

const UPGRADES = [
  // ── Sorted by tier-1 base cost (ascending) ───────────────────────────────
  {
    id: 'projectileSpeed',
    name: 'Projectile Speed',
    tooltip: 'Multiplies projectile velocity by ×1.12 per tier.\nBase: 400 px/s → max (tier 10): ~1241 px/s.\nFaster projectiles reach distant enemies before they close in.',
    maxTier: 10,
    baseCost: 40,
    costMult: 1.85,
    apply(tower, game, tier) {
      tower.projectileSpeed *= 1.12;
    },
  },
  {
    id: 'range',
    name: 'Range',
    tooltip: 'Multiplies detection radius by ×1.10 per tier.\nBase: 220 px → max (tier 15): ~918 px.\nAlso extends the laser beam range.',
    maxTier: 15,
    baseCost: 45,
    costMult: 1.55,
    apply(tower, game, tier) {
      tower.range *= 1.10;
    },
  },
  {
    id: 'damage',
    name: 'Damage',
    tooltip: 'Multiplies base damage by ×1.10 per purchase. Max 50 tiers.\nBase: 250. Affects all weapons — main gun, laser, and orbital ring.',
    maxTier: 50,
    baseCost: 50,
    costMult: 1.25,
    apply(tower, game, tier) {
      tower.damage = Math.round(tower.damage * 1.10);
    },
  },
  {
    id: 'fireRate',
    name: 'Fire Rate',
    tooltip: 'Multiplies fire rate by ×1.10 per tier.\nBase: 1.5 shots/s → max (tier 10): ~3.9 shots/s.',
    maxTier: 10,
    baseCost: 60,
    costMult: 1.8,
    apply(tower, game, tier) {
      tower.fireRate *= 1.10;
    },
  },
  {
    id: 'maxHp',
    name: 'Max HP',
    tooltip: 'Adds 10% of base HP (250) per tier, additively.\nBase: 2500 HP → max (tier 15): 6250 HP.',
    maxTier: 15,
    baseCost: 70,
    costMult: 1.85,
    apply(tower, game, tier) {
      const BASE_HP  = 2500;
      const newMaxHp = BASE_HP + tier * 250;
      const delta    = newMaxHp - tower.maxHp;
      tower.maxHp    = newMaxHp;
      tower.hp       = Math.min(tower.hp + delta, tower.maxHp);
    },
  },
  {
    id: 'hpRegen',
    name: 'HP Regen',
    tooltip: 'Continuously heals the tower during combat.\nTier 1: 0.2%/s — Tier 2: 0.4%/s — Tier 3: 0.6%/s — Tier 4: 0.8%/s — Tier 5: 1.0%/s\nTier 6: 1.2%/s — Tier 7: 1.4%/s — Tier 8: 1.6%/s — Tier 9: 1.8%/s — Tier 10: 2.0%/s',
    maxTier: 10,
    baseCost: 80,
    costMult: 1.65,
    apply(tower, game, tier) {
      tower.regenFraction = tier * 0.002;
    },
  },
  {
    id: 'currencyMult',
    name: 'Bounty',
    tooltip: 'Multiplies all kill rewards by ×1.10 per tier.\nMax (tier 20): ×6.73 on all currency earned.\nApplies to every weapon and kill source.',
    maxTier: 20,
    baseCost: 100,
    costMult: 1.638,
    apply(tower, game, tier) {
      game.currencyMultiplier *= 1.10;
    },
  },
  {
    id: 'satelliteTurrets',
    name: 'Satellite Turrets',
    tooltip: 'Four small turrets orbit the tower at diagonal positions, firing tracers that mirror every main shot and converge on the same target.\nDamage is baked into the main projectile — tracers are purely visual.\nTier 1: 1 turret +100% dmg  Tier 2: 2 turrets +200% dmg\nTier 3: 3 turrets +300% dmg  Tier 4: 4 turrets +400% dmg.',
    maxTier: 4,
    baseCost: 300,
    costMult: 1.9,
    apply(tower, game, tier) {
      tower.satelliteTurrets     = Math.min(tier, 4);
      tower.satelliteDamageMult  = 1 + tier;
    },
  },
  {
    id: 'turrets',
    name: 'Orbital Death Ring',
    tooltip: 'A swirling ring of energy surrounds the tower, dealing continuous damage to all enemies inside the zone.\nDPS = damage × fire rate × 200 (scales with all damage multipliers).\nZone radius: tower radius + 160 px.\nTier 1: 1 node.  Each tier adds another node (cosmetic — zone is the same size).\nUnlocks Deflector Ring and Vortex Sweep prestige upgrades.',
    maxTier: 5,
    baseCost: 1500,
    costMult: 2.1,
    apply(tower, game, tier) {
      tower.ringTier = tier;
    },
  },
  {
    id: 'explosive',
    name: 'Explosive Rounds',
    tooltip: 'Projectiles detonate on impact, dealing full damage in a blast radius.\nTier 1: 35 px radius. Each tier adds 15 px.\nMax (tier 5): 95 px radius.',
    maxTier: 5,
    baseCost: 4000,
    costMult: 2.0,
    apply(tower, game, tier) {
      tower.explosiveRadius = 20 + tier * 15;
    },
  },
  {
    id: 'laserBurst',
    name: 'Laser Burst',
    tooltip: 'A sweeping laser fires periodically, making a full 360° rotation.\nDPS = damage × fire rate × multiplier (high — contact time per pass is brief).\nTier 1: 1.8 s burst / 7 s cooldown / 220 px / ×8 DPS.\nEach tier: +0.3 s burst, −1 s cooldown, more range, higher DPS.\nMax (tier 5): 3.0 s / 3 s cooldown / 660 px / ×36 DPS.\nOnly activates when at least one enemy is in range.',
    maxTier: 5,
    baseCost: 8000,
    costMult: 2.0,
    apply(tower, game, tier) {
      tower.laserUnlocked = true;
      tower.laserTier     = tier;
    },
  },
  {
    id: 'chainLightning',
    name: 'Chain Lightning',
    tooltip: 'On hit, lightning jumps to nearby enemies, dealing 60% of the previous jump\'s damage.\nEach tier adds one additional jump.\nMax (tier 5): 5 chain jumps per projectile.\nWith WARBORN Fury the range cap is removed — chain can jump to any enemy on screen.',
    maxTier: 5,
    baseCost: 12000,
    costMult: 2.0,
    apply(tower, game, tier) {
      tower.chainJumps = tier;
    },
  },
  {
    id: 'multiShot',
    name: 'Multi-Shot',
    tooltip: 'The main gun targets and fires at multiple enemies per shot.\nTier 1: 2 targets. Each tier adds 1 more.\nMax (tier 5): 6 simultaneous targets.\nWith WARBORN Fury the shots collapse into a single bullet worth all targets combined.',
    maxTier: 5,
    baseCost: 18000,
    costMult: 1.8,
    apply(tower, game, tier) {
      tower.multiShotCount = tier + 1;
    },
  },
  {
    id: 'volatile',
    name: 'Volatile Rounds',
    tooltip: 'Increases splash damage fraction for Explosive Rounds.\nBase: 60% splash.  Tier 1: 70%  Tier 2: 80%\nTier 3: 90%  Tier 4: 100%  Tier 5: 110%.',
    maxTier: 5,
    baseCost: 100000,
    costMult: 2.0,
    apply(tower, game, tier) {
      const fractions = [0.6, 0.7, 0.8, 0.9, 1.0, 1.1];
      tower.splashMult = fractions[tier] ?? 1.1;
    },
  },
  {
    id: 'overcharge',
    name: 'Overcharge',
    tooltip: 'Every Nth shot deals ×4 damage.\nTier 1: every 8th shot.  Tier 2: every 7th.\nTier 3: every 6th.  Tier 4: every 5th.\nTier 5: every 3rd shot.',
    maxTier: 5,
    baseCost: 120000,
    costMult: 2.0,
    apply(tower, game, tier) {
      const thresholds = [0, 8, 7, 6, 5, 3];
      tower.overchargeN = thresholds[tier] ?? 3;
    },
  },
  {
    id: 'leech',
    name: 'Leech',
    tooltip: 'Restores HP on every enemy kill.\nTier 1: +2 HP  Tier 2: +4 HP  Tier 3: +6 HP\nTier 4: +8 HP  Tier 5: +10 HP per kill.',
    maxTier: 5,
    baseCost: 150000,
    costMult: 1.8,
    apply(tower, game, tier) {
      tower.leechHp = tier * 2;
    },
  },
  {
    id: 'ringDps',
    name: 'Ring of Annihilation',
    tooltip: 'Multiplies the Orbital Death Ring\'s DPS output.\nTier 1: ×1.5  Tier 2: ×2.0  Tier 3: ×2.5\nTier 4: ×2.75  Tier 5: ×3.0.\nRequires Orbital Death Ring to be unlocked.',
    maxTier: 5,
    baseCost: 180000,
    costMult: 2.0,
    apply(tower, game, tier) {
      const mults = [1.0, 1.5, 2.0, 2.5, 2.75, 3.0];
      tower.ringDpsMult = mults[tier] ?? 3.0;
    },
  },
  {
    id: 'laserDps',
    name: 'Apocalypse Laser',
    tooltip: 'Multiplies the Laser Burst\'s DPS output.\nTier 1: ×1.5  Tier 2: ×2.0  Tier 3: ×2.75\nTier 4: ×3.5  Tier 5: ×5.0.\nRequires Laser Burst to be unlocked.',
    maxTier: 5,
    baseCost: 180000,
    costMult: 2.0,
    apply(tower, game, tier) {
      const mults = [1.0, 1.5, 2.0, 2.75, 3.5, 5.0];
      tower.laserDpsMult = mults[tier] ?? 5.0;
    },
  },
];

export class Shop {
  constructor(game) {
    this.game     = game;
    this.catalogue = UPGRADES;
  }

  tier(id) {
    return this.game.upgrades[id] ?? 0;
  }

  cost(id) {
    const entry = this._entry(id);
    if (!entry) return Infinity;
    const t = this.tier(id);
    return Math.round(entry.baseCost * Math.pow(entry.costMult, t));
  }

  canAfford(id) {
    return this.game.currency >= this.cost(id);
  }

  isMaxed(id) {
    const entry = this._entry(id);
    if (!entry) return true;
    if (entry.maxTier === null) return false; // unlimited
    return this.tier(id) >= entry.maxTier;
  }

  purchase(id) {
    const entry = this._entry(id);
    if (entry?.disabled || this.isMaxed(id) || !this.canAfford(id)) return false;
    this.game.currency -= this.cost(id);
    this.game.upgrades[id] = this.tier(id) + 1;
    entry.apply(this.game.tower, this.game, this.game.upgrades[id]);
    return true;
  }

  // Re-apply all upgrades from scratch (used on load)
  reapplyAll(upgrades) {
    this.game.tower              = new Tower();
    this.game.currencyMultiplier = 1.0;  // reset before re-applying so Bounty doesn't compound
    for (const entry of this.catalogue) {
      const tiers = upgrades[entry.id] ?? 0;
      for (let t = 1; t <= tiers; t++) {
        entry.apply(this.game.tower, this.game, t);
      }
      if (tiers > 0) this.game.upgrades[entry.id] = tiers;
    }
  }

  _entry(id) {
    return this.catalogue.find(u => u.id === id) ?? null;
  }
}
