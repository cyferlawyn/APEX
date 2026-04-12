export const State = Object.freeze({
  SHOP:      'SHOP',
  COMBAT:    'COMBAT',
  RESULTS:   'RESULTS',
  GAME_OVER: 'GAME_OVER',
});

export class Game {
  constructor() {
    this.state         = State.SHOP;
    this.wave          = 1;
    this.currency      = 100;   // starter currency
    this.currencyMultiplier = 1.0;
    this.waveEarned    = 0;     // currency earned in the current wave (pre-multiplier)
    this.lastWave      = 0;     // wave number just completed (for results display)
    this.lastWaveEarned = 0;    // post-multiplier currency shown on results screen
    this.upgrades      = {};    // { upgradeId: tier }
    this.tower         = null;  // set by main after Tower is constructed
    this.enemyPool     = null;  // set by main
    this.projectilePool = null; // set by main
    this.waveSpawner   = null;  // set by main
    this.resultsTimer  = 0;
    this.RESULTS_DURATION = 3;  // seconds to show results screen
  }

  transition(newState) {
    this.state = newState;
  }

  // Called each frame during RESULTS to auto-advance
  tickResults(dt) {
    this.resultsTimer += dt;
    if (this.resultsTimer >= this.RESULTS_DURATION) {
      this.resultsTimer = 0;
      this.transition(State.SHOP);
    }
  }
}
