import { State } from './game.js';

const COLORS = {
  bg:        '#0a0a12',
  grid:      'rgba(255,255,255,0.04)',
  towerFill: '#1a1a2e',
  towerGlow: '#00e5ff',
  hpBar:     '#00e5ff',
  hpBarBg:   '#1a1a2e',
  currency:  '#ffd600',
  text:      '#e0e0e0',
  dim:       'rgba(0,0,0,0.55)',
  laser:     '#ff4081',
  turret:    '#b2ebf2',
  explosion: '#ff9100',
  chain:     '#e040fb',
};

export class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.game   = game;

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    this.canvas.width  = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    if (this.game.tower) {
      this.game.tower.x = this.canvas.width  / 2;
      this.game.tower.y = this.canvas.height / 2;
    }
    if (this.game.projectilePool) {
      this.game.projectilePool._bounds = { w: this.canvas.width, h: this.canvas.height };
    }
  }

  render() {
    const { ctx, canvas, game } = this;

    if (game.tower) {
      game.tower.x = canvas.width  / 2;
      game.tower.y = canvas.height / 2;
    }
    if (game.projectilePool) {
      game.projectilePool._bounds = { w: canvas.width, h: canvas.height };
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this._drawBackground();
    this._drawExplosions();
    this._drawEnemies();
    this._drawProjectiles();
    this._drawLightningArcs();
    this._drawLaser();
    this._drawTower();
    this._drawHUD();
    this._drawStateOverlay();
  }

  // ── background ───────────────────────────────────────────────────────────────

  _drawBackground() {
    const { ctx, canvas } = this;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const step = 40;
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x += step) {
      ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
    }
    for (let y = 0; y < canvas.height; y += step) {
      ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
  }

  // ── tower ─────────────────────────────────────────────────────────────────────

  _drawTower() {
    const { ctx, game } = this;
    const t = game.tower;
    if (!t) return;

    const cx = t.x, cy = t.y, r = t.radius;

    // Determine outline color:
    // - red flash on hit
    // - magenta tint while laser is charging (cooldown < 1.5s)
    // - default cyan
    let glowColor = COLORS.towerGlow;
    if (t.hitFlash > 0) {
      glowColor = '#ff1744';
    } else if (t.laserUnlocked && !t.laserActive && t.laserCooldown < 1.5) {
      glowColor = COLORS.laser;
    } else if (t.laserUnlocked && t.laserActive) {
      glowColor = COLORS.laser;
    }

    // Rotating turret emplacements (drawn behind tower)
    if (t.turretCount > 0) {
      const orbitR = r + 18;
      for (let i = 0; i < t.turretCount; i++) {
        const a  = t.turretAngle + (Math.PI * 2 / t.turretCount) * i;
        const tx = cx + Math.cos(a) * orbitR;
        const ty = cy + Math.sin(a) * orbitR;

        ctx.save();
        ctx.shadowBlur  = 10;
        ctx.shadowColor = COLORS.turret;
        ctx.strokeStyle = COLORS.turret;
        ctx.fillStyle   = COLORS.towerFill;
        ctx.lineWidth   = 1.5;
        // Diamond shape
        ctx.beginPath();
        ctx.moveTo(tx,     ty - 5);
        ctx.lineTo(tx + 5, ty);
        ctx.lineTo(tx,     ty + 5);
        ctx.lineTo(tx - 5, ty);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    // Tower hex
    ctx.save();
    ctx.shadowBlur  = t.hitFlash > 0 ? 32 : 24;
    ctx.shadowColor = glowColor;
    ctx.beginPath();
    this._hexPath(cx, cy, r);
    ctx.fillStyle   = COLORS.towerFill;
    ctx.fill();
    ctx.strokeStyle = glowColor;
    ctx.lineWidth   = t.hitFlash > 0 ? 3 : 2;
    ctx.stroke();
    ctx.restore();

    // Core dot — pulses when laser is active
    const coreR = t.laserActive
      ? r * 0.25 + Math.sin(Date.now() / 60) * r * 0.08
      : r * 0.25;
    ctx.beginPath();
    ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
    ctx.fillStyle = glowColor;
    ctx.fill();
  }

  _hexPath(cx, cy, r) {
    const ctx = this.ctx;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  // ── laser beam ───────────────────────────────────────────────────────────────

  _drawLaser() {
    const { ctx, game } = this;
    const t = game.tower;
    if (!t || !t.laserActive) return;

    const LASER_RANGE = 180;
    const cx = t.x, cy = t.y;
    const a  = t.laserAngle;
    const ex = cx + Math.cos(a) * LASER_RANGE;
    const ey = cy + Math.sin(a) * LASER_RANGE;

    ctx.save();
    ctx.shadowBlur  = 18;
    ctx.shadowColor = COLORS.laser;
    ctx.strokeStyle = COLORS.laser;
    ctx.lineWidth   = 3;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // Thin bright core
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();
  }

  // ── explosion rings ──────────────────────────────────────────────────────────

  _drawExplosions() {
    const { ctx, game } = this;
    // Tick and draw, remove expired
    game.explosions = game.explosions.filter(ex => {
      ex.t -= 1 / 60;
      if (ex.t <= 0) return false;
      const progress = 1 - ex.t / 0.25;
      const alpha    = 1 - progress;
      ctx.save();
      ctx.globalAlpha = alpha * 0.7;
      ctx.strokeStyle = COLORS.explosion;
      ctx.shadowBlur  = 12;
      ctx.shadowColor = COLORS.explosion;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, ex.r * progress, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return true;
    });
  }

  // ── lightning arcs ───────────────────────────────────────────────────────────

  _drawLightningArcs() {
    const { ctx, game } = this;
    game.lightningArcs = game.lightningArcs.filter(arc => {
      arc.t -= 1 / 60;
      if (arc.t <= 0) return false;
      const alpha = arc.t / 0.15;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = COLORS.chain;
      ctx.shadowBlur  = 10;
      ctx.shadowColor = COLORS.chain;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(arc.x1, arc.y1);
      // Slight jag midpoint for lightning feel
      const mx = (arc.x1 + arc.x2) / 2 + (Math.random() - 0.5) * 20;
      const my = (arc.y1 + arc.y2) / 2 + (Math.random() - 0.5) * 20;
      ctx.quadraticCurveTo(mx, my, arc.x2, arc.y2);
      ctx.stroke();
      ctx.restore();
      return true;
    });
  }

  // ── enemies ───────────────────────────────────────────────────────────────────

  _drawEnemies() {
    const { ctx, game } = this;
    if (!game.enemyPool) return;

    for (const e of game.enemyPool.pool) {
      if (!e.active) continue;

      ctx.save();
      ctx.shadowBlur  = 10;
      ctx.shadowColor = e.color;
      ctx.strokeStyle = e.color;
      ctx.lineWidth   = 1.5;
      ctx.fillStyle   = 'rgba(0,0,0,0.5)';

      switch (e.shape) {
        case 'circle':   this._drawCircleEnemy(e);   break;
        case 'square':   this._drawSquareEnemy(e);   break;
        case 'triangle': this._drawTriangleEnemy(e); break;
        case 'hexagon':  this._drawHexEnemy(e);      break;
      }

      ctx.restore();
      this._drawHpBar(e);
    }
  }

  _drawCircleEnemy(e) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }

  _drawSquareEnemy(e) {
    const ctx = this.ctx;
    const s = e.radius * 1.6;
    ctx.beginPath();
    ctx.rect(e.x - s / 2, e.y - s / 2, s, s);
    ctx.fill(); ctx.stroke();
  }

  _drawTriangleEnemy(e) {
    const ctx = this.ctx;
    const r = e.radius * 1.3;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = (Math.PI * 2 / 3) * i - Math.PI / 2;
      const x = e.x + r * Math.cos(a);
      const y = e.y + r * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }

  _drawHexEnemy(e) {
    const ctx = this.ctx;
    ctx.beginPath();
    this._hexPath(e.x, e.y, e.radius * 1.2);
    ctx.fill(); ctx.stroke();
  }

  _drawHpBar(e) {
    const ctx  = this.ctx;
    const w    = e.radius * 2.5;
    const h    = 3;
    const x    = e.x - w / 2;
    const y    = e.y - e.radius - 7;
    const pct  = Math.max(0, e.hp / e.maxHp);

    ctx.fillStyle = '#111';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = e.color;
    ctx.fillRect(x, y, w * pct, h);
  }

  // ── projectiles ───────────────────────────────────────────────────────────────

  _drawProjectiles() {
    const { ctx, game } = this;
    if (!game.projectilePool) return;

    ctx.save();
    ctx.shadowBlur  = 8;
    ctx.shadowColor = '#ffffff';
    ctx.fillStyle   = '#ffffff';

    for (const p of game.projectilePool.pool) {
      if (!p.active) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── HUD ───────────────────────────────────────────────────────────────────────

  _drawHUD() {
    const { ctx, canvas, game } = this;
    const t = game.tower;
    if (!t) return;

    ctx.font      = '13px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(`Wave ${game.wave}`, 12, 22);

    // Enemy count remaining
    const remaining = game.enemyPool ? game.enemyPool.activeCount() : 0;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font      = '11px monospace';
    ctx.fillText(`enemies: ${remaining}`, 12, 38);

    // HP bar
    const barW  = 200;
    const barH  = 12;
    const barX  = canvas.width / 2 - barW / 2;
    const barY  = 10;
    const hpPct = Math.max(0, t.hp / t.maxHp);

    ctx.fillStyle = COLORS.hpBarBg;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = hpPct > 0.5 ? '#00e676' : hpPct > 0.25 ? '#ffea00' : '#ff1744';
    ctx.fillRect(barX, barY, barW * hpPct, barH);
    ctx.strokeStyle = COLORS.hpBar;
    ctx.lineWidth   = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle   = COLORS.text;
    ctx.textAlign   = 'center';
    ctx.font        = '11px monospace';
    ctx.fillText(`${Math.ceil(t.hp)} / ${t.maxHp}`, canvas.width / 2, barY - 3);

    // Laser cooldown indicator
    if (t.laserUnlocked && !t.laserActive) {
      const BURST_COOLDOWN = Math.max(4, 8 - t.laserTier);
      const pct = Math.max(0, 1 - t.laserCooldown / BURST_COOLDOWN);
      const indW = 80, indH = 4;
      const indX = canvas.width / 2 - indW / 2;
      const indY = barY + barH + 5;
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(indX, indY, indW, indH);
      ctx.fillStyle = COLORS.laser;
      ctx.fillRect(indX, indY, indW * pct, indH);
      ctx.fillStyle = 'rgba(255,64,129,0.5)';
      ctx.font      = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('LASER', canvas.width / 2, indY + indH + 8);
    }

    // Currency
    ctx.textAlign   = 'right';
    ctx.fillStyle   = COLORS.currency;
    ctx.font        = '13px monospace';
    ctx.fillText(`$ ${game.currency}`, canvas.width - 12, 22);
  }

  // ── state overlays ────────────────────────────────────────────────────────────

  _drawStateOverlay() {
    switch (this.game.state) {
      case State.RESULTS:  this._drawResults();  break;
      case State.DEFEATED: this._drawDefeated(); break;
    }
  }

  _drawResults() {
    const { ctx, canvas, game } = this;

    ctx.fillStyle = COLORS.dim;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#00e676';
    ctx.font      = 'bold 28px monospace';
    ctx.fillText(`Wave ${game.lastWave} complete!`, canvas.width / 2, canvas.height / 2 - 20);

    ctx.fillStyle = COLORS.currency;
    ctx.font      = '18px monospace';
    ctx.fillText(`+$ ${game.lastWaveEarned} earned`, canvas.width / 2, canvas.height / 2 + 14);

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font      = '12px monospace';
    ctx.fillText('next wave incoming...', canvas.width / 2, canvas.height / 2 + 40);
  }

  _drawDefeated() {
    const { ctx, canvas, game } = this;

    ctx.fillStyle = COLORS.dim;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff1744';
    ctx.font      = 'bold 32px monospace';
    ctx.fillText('TOWER DESTROYED', canvas.width / 2, canvas.height / 2 - 36);

    ctx.fillStyle = COLORS.text;
    ctx.font      = '18px monospace';
    ctx.fillText(`Fell on wave ${game.wave}`, canvas.width / 2, canvas.height / 2 + 2);

    ctx.fillStyle = COLORS.currency;
    ctx.font      = '14px monospace';
    ctx.fillText(`Best: wave ${game.bestWave}`, canvas.width / 2, canvas.height / 2 + 26);

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font      = '12px monospace';
    ctx.fillText('upgrades kept — restarting from wave 1...', canvas.width / 2, canvas.height / 2 + 52);
  }
}
