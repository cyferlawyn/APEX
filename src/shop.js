import { Tower } from './tower.js';

// Upgrade catalogue
// Each entry: { id, name, description, maxTier, baseCost, costMult, apply(tower, game, tier) }

const UPGRADES = [
  {
    id: 'damage',
    name: 'Damage',
    description: 'Increases projectile damage.',
    maxTier: 10,
    baseCost: 50,
    costMult: 1.4,
    apply(tower, game, tier) {
      tower.damage = Math.round(tower.damage * 1.15);
    },
  },
  {
    id: 'fireRate',
    name: 'Fire Rate',
    description: 'Increases attacks per second.',
    maxTier: 10,
    baseCost: 60,
    costMult: 1.4,
    apply(tower, game, tier) {
      tower.fireRate *= 1.10;
    },
  },
  {
    id: 'projectileSpeed',
    name: 'Projectile Speed',
    description: 'Increases projectile velocity.',
    maxTier: 8,
    baseCost: 40,
    costMult: 1.4,
    apply(tower, game, tier) {
      tower.projectileSpeed *= 1.12;
    },
  },
  {
    id: 'range',
    name: 'Range',
    description: 'Increases tower detection radius.',
    maxTier: 15,
    baseCost: 45,
    costMult: 1.35,
    apply(tower, game, tier) {
      tower.range *= 1.10;
    },
  },
  {
    id: 'maxHp',
    name: 'Max HP',
    description: 'Increases maximum tower HP.',
    maxTier: 8,
    baseCost: 70,
    costMult: 1.4,
    apply(tower, game, tier) {
      const delta = Math.floor(tower.maxHp * 0.20);
      tower.maxHp += delta;
      tower.hp    += delta; // heal by the gained amount
    },
  },
  {
    id: 'hpRegen',
    name: 'HP Regen',
    description: 'Regenerate HP between waves.',
    maxTier: 8,
    baseCost: 80,
    costMult: 1.4,
    apply(tower, game, tier) {
      tower.regenPerSec += 5;
    },
  },
  {
    id: 'currencyMult',
    name: 'Bounty',
    description: 'Increases currency earned from enemies.',
    maxTier: 5,
    baseCost: 90,
    costMult: 1.5,
    apply(tower, game, tier) {
      game.currencyMultiplier *= 1.10;
    },
  },
  {
    id: 'multiShot',
    name: 'Multi-Shot',
    description: 'Fire at multiple enemies simultaneously.',
    maxTier: 5,
    baseCost: 120,
    costMult: 1.5,
    apply(tower, game, tier) {
      tower.multiShotCount = tier + 1; // tier 1 = 2 targets, tier 2 = 3, etc.
    },
  },
  {
    id: 'spreadShot',
    name: 'Spread Shot',
    description: 'Fire a fan of projectiles at the nearest enemy.',
    maxTier: 5,
    baseCost: 150,
    costMult: 1.5,
    apply(tower, game, tier) {
      tower.spreadShot    = true;
      tower.spreadPellets = 2 + tier; // 3 at tier 1, up to 7
      tower.spreadAngle   = 15 + tier * 5; // 20° at tier 1, up to 40°
    },
  },
  {
    id: 'explosive',
    name: 'Explosive Rounds',
    description: 'Projectiles deal splash damage on impact.',
    maxTier: 4,
    baseCost: 200,
    costMult: 1.5,
    apply(tower, game, tier) {
      tower.explosiveRadius = 20 + tier * 15; // 35px at tier 1
    },
  },
  {
    id: 'chainLightning',
    name: 'Chain Lightning',
    description: 'Projectiles arc to nearby enemies on hit.',
    maxTier: 4,
    baseCost: 220,
    costMult: 1.5,
    apply(tower, game, tier) {
      tower.chainJumps = tier;
    },
  },
  {
    id: 'laserBurst',
    name: 'Laser Burst',
    description: 'Periodic sweeping laser beam.',
    maxTier: 4,
    baseCost: 250,
    costMult: 1.5,
    apply(tower, game, tier) {
      tower.laserUnlocked    = true;
      tower.laserTier        = tier;
    },
  },
  {
    id: 'turrets',
    name: 'Rotating Turrets',
    description: 'Add independent gun emplacements.',
    maxTier: 4,
    baseCost: 300,
    costMult: 1.6,
    apply(tower, game, tier) {
      tower.turretCount = tier;
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
    return entry ? this.tier(id) >= entry.maxTier : true;
  }

  purchase(id) {
    if (this.isMaxed(id) || !this.canAfford(id)) return false;
    const entry = this._entry(id);
    this.game.currency -= this.cost(id);
    this.game.upgrades[id] = this.tier(id) + 1;
    entry.apply(this.game.tower, this.game, this.game.upgrades[id]);
    return true;
  }

  // Re-apply all upgrades from scratch (used on load)
  reapplyAll(upgrades) {
    this.game.tower = new Tower();
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
