export const State = Object.freeze({
  COMBAT:   'COMBAT',
  RESULTS:  'RESULTS',
  DEFEATED: 'DEFEATED',
});

export class Game {
  constructor() {
    this.state              = State.COMBAT;
    this.wave               = 1;
    this.currency           = 100;
    this.currencyMultiplier = 1.0;
    this.waveEarned         = 0;
    this.lastWave           = 0;
    this.lastWaveEarned     = 0;
    this.bestWave           = 1;
    this.upgrades           = {};
    this.tower              = null;
    this.enemyPool          = null;
    this.projectilePool     = null;
    this.waveSpawner        = null;
    this.overlayTimer       = 0;
    this.RESULTS_DURATION   = 2;
    this.DEFEATED_DURATION  = 3;

    // Short-lived visual effects (drained each frame by renderer)
    this.explosions    = []; // { x, y, r, t } — t counts down to 0
    this.lightningArcs = []; // { x1, y1, x2, y2, t }
    this.deathRings    = []; // { x, y, r, t, color } — expanding ring on enemy death
    this.edgeFlash     = 0;  // seconds remaining for boss screen-edge flash

    // Particle system — initialized in main.js after bootstrap
    this.particles = null;
  }

  transition(newState) {
    this.state        = newState;
    this.overlayTimer = 0;
  }

  tickOverlay(dt) {
    this.overlayTimer += dt;
    const dur = this.state === State.RESULTS
      ? this.RESULTS_DURATION
      : this.DEFEATED_DURATION;
    return this.overlayTimer >= dur;
  }
}
