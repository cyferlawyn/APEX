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
    // Canvas fills the left portion (set by CSS); read actual size
    this.canvas.width  = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;

    // Update tower position
    if (this.game.tower) {
      this.game.tower.x = this.canvas.width  / 2;
      this.game.tower.y = this.canvas.height / 2;
    }

    // Update projectile pool bounds
    if (this.game.projectilePool) {
      this.game.projectilePool._bounds = {
        w: this.canvas.width,
        h: this.canvas.height,
      };
    }
  }

  render() {
    const { ctx, canvas, game } = this;

    // Sync tower position each frame (cheap)
    if (game.tower) {
      game.tower.x = canvas.width  / 2;
      game.tower.y = canvas.height / 2;
    }
    if (game.projectilePool) {
      game.projectilePool._bounds = { w: canvas.width, h: canvas.height };
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this._drawBackground();
    this._drawEnemies();
    this._drawProjectiles();
    this._drawTower();
    this._drawHUD();
    this._drawStateOverlay();
  }

  // ── background ──────────────────────────────────────────────────────────────

  _drawBackground() {
    const { ctx, canvas } = this;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Faint grid
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

  // ── tower ───────────────────────────────────────────────────────────────────

  _drawTower() {
    const { ctx, game } = this;
    const t = game.tower;
    if (!t) return;

    const cx = t.x, cy = t.y, r = t.radius;

    // Glow
    ctx.save();
    ctx.shadowBlur  = 24;
    ctx.shadowColor = COLORS.towerGlow;

    // Hex fill
    ctx.beginPath();
    this._hexPath(cx, cy, r);
    ctx.fillStyle   = COLORS.towerFill;
    ctx.fill();
    ctx.strokeStyle = COLORS.towerGlow;
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.restore();

    // Core dot
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.towerGlow;
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

  // ── enemies ─────────────────────────────────────────────────────────────────

  _drawEnemies() {
    const { ctx, game } = this;
    if (!game.enemyPool) return;

    for (const e of game.enemyPool.pool) {
      if (!e.active) continue;

      ctx.save();
      ctx.shadowBlur  = 10;
      ctx.shadowColor = e.color;

      // Shape
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

      // HP bar
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

  // ── projectiles ─────────────────────────────────────────────────────────────

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

  // ── HUD ─────────────────────────────────────────────────────────────────────

  _drawHUD() {
    const { ctx, canvas, game } = this;
    const t = game.tower;
    if (!t) return;

    ctx.font      = '13px monospace';
    ctx.textAlign = 'left';

    // Wave number
    ctx.fillStyle = COLORS.text;
    ctx.fillText(`Wave ${game.wave}`, 12, 22);

    // Tower HP bar (top-center)
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
    ctx.fillText(`${t.hp} / ${t.maxHp}`, canvas.width / 2, barY + barH - 1);

    // Currency (top-right)
    ctx.textAlign   = 'right';
    ctx.fillStyle   = COLORS.currency;
    ctx.fillText(`$ ${game.currency}`, canvas.width - 12, 22);
  }

  // ── state overlays ───────────────────────────────────────────────────────────

  _drawStateOverlay() {
    const { game } = this;
    switch (game.state) {
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
