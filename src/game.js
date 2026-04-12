export const State = Object.freeze({
  COMBAT:   'COMBAT',
  RESULTS:  'RESULTS',  // brief wave-complete flash before next wave
  DEFEATED: 'DEFEATED', // tower died — brief screen before resetting to wave 1
});

export class Game {
  constructor() {
    this.state              = State.COMBAT;
    this.wave               = 1;
    this.currency           = 100;   // starter currency
    this.currencyMultiplier = 1.0;
    this.waveEarned         = 0;     // currency earned in the current wave (pre-multiplier)
    this.lastWave           = 0;     // wave number just completed (for results display)
    this.lastWaveEarned     = 0;     // post-multiplier currency shown on results screen
    this.bestWave           = 1;     // furthest wave reached (shown on defeat screen)
    this.upgrades           = {};    // { upgradeId: tier }
    this.tower              = null;  // set by main after Tower is constructed
    this.enemyPool          = null;  // set by main
    this.projectilePool     = null;  // set by main
    this.waveSpawner        = null;  // set by main
    this.overlayTimer       = 0;
    this.RESULTS_DURATION   = 2;     // seconds to show wave-complete flash
    this.DEFEATED_DURATION  = 3;     // seconds to show defeat screen
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
