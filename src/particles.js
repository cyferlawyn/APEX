export class Particles {
  constructor(max) {
    this.max  = max;
    this.pool = []; // implemented in Phase 6 (polish)
  }

  update(dt) {}
  draw(ctx) {}
  reset() { this.pool = []; }
}
