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
    this._drawDeathRings();
    this._drawEnemies();
    this._drawProjectiles();
    this._drawLightningArcs();
    this._drawLaser();
    this._drawTower();
    if (game.particles) game.particles.draw(ctx);
    this._drawEdgeFlash();
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

    // Orbital Death Ring (drawn behind tower hex)
    if (t.ringTier > 0) {
      const arcDeg  = t.ringTier === 1 ? 30 : t.ringTier === 2 ? 45 : t.ringTier === 3 ? 45 : 60;
      const arcRad  = arcDeg * (Math.PI / 180);
      const orbitR  = r + 36;
      const rings   = t.ringTier >= 3
        ? [{ angle: t.ringAngle }, { angle: t.ringAngle2 }]
        : [{ angle: t.ringAngle }];

      for (const ring of rings) {
        const startA = ring.angle - arcRad / 2;
        const endA   = ring.angle + arcRad / 2;

        ctx.save();
        ctx.shadowBlur  = 22;
        ctx.shadowColor = '#ff6d00';
        ctx.strokeStyle = '#ff6d00';
        ctx.lineWidth   = 5;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(cx, cy, orbitR, startA, endA);
        ctx.stroke();

        // Bright inner core of the arc
        ctx.shadowBlur  = 8;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth   = 2;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(cx, cy, orbitR, startA, endA);
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

    // Core dot — pulses when laser active, breathes otherwise
    const pulse = t.laserActive
      ? r * 0.25 + Math.sin(Date.now() / 60) * r * 0.08
      : r * 0.18 + Math.sin(Date.now() / 600) * r * 0.06; // gentle idle breath
    ctx.save();
    ctx.shadowBlur  = t.laserActive ? 20 : 10;
    ctx.shadowColor = glowColor;
    ctx.fillStyle   = glowColor;
    ctx.globalAlpha = t.laserActive ? 1 : 0.75 + Math.sin(Date.now() / 600) * 0.15;
    ctx.beginPath();
    ctx.arc(cx, cy, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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

    const cx = t.x, cy = t.y;
    const a  = t.laserAngle;
    const ex = cx + Math.cos(a) * t.laserRange;
    const ey = cy + Math.sin(a) * t.laserRange;

    // Beam width scales with tier — thicker at higher tiers
    const outerWidth = 2 + t.laserTier * 1.5;
    const innerWidth = 1 + t.laserTier * 0.5;

    ctx.save();
    ctx.shadowBlur  = 12 + t.laserTier * 6;
    ctx.shadowColor = COLORS.laser;
    ctx.strokeStyle = COLORS.laser;
    ctx.lineWidth   = outerWidth;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // Bright core
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = innerWidth;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();
  }

  // ── death rings ──────────────────────────────────────────────────────────────

  _drawDeathRings() {
    const { ctx, game } = this;
    const DT = 1 / 60;
    game.deathRings = game.deathRings.filter(ring => {
      ring.t -= DT;
      if (ring.t <= 0) return false;
      const progress = 1 - ring.t / 0.35;
      const alpha    = (1 - progress) * 0.8;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = ring.color;
      ctx.shadowBlur  = 8;
      ctx.shadowColor = ring.color;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r * progress, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return true;
    });
  }

  // ── screen-edge flash (boss arrival / boss death) ─────────────────────────────

  _drawEdgeFlash() {
    const { ctx, canvas, game } = this;
    if (!game.edgeFlash || game.edgeFlash <= 0) return;
    game.edgeFlash -= 1 / 60;
    const alpha = Math.max(0, game.edgeFlash / 0.6) * 0.5;
    const grad  = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
      canvas.width / 2, canvas.height / 2, canvas.height * 0.85,
    );
    grad.addColorStop(0, 'rgba(255,23,68,0)');
    grad.addColorStop(1, `rgba(255,23,68,${alpha.toFixed(3)})`);
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    const { ctx, canvas, game } = this;
    if (!game.enemyPool) return;

    // --- Batched draw: group by shape+color, one path per group ---
    // Bucket: key = shape+color → { color, shape, arr: [enemy, ...] }
    const buckets = new Map();
    for (const e of game.enemyPool.pool) {
      if (!e.active) continue;
      // Off-screen cull — skip enemies more than 50px outside canvas
      if (e.x < -50 || e.x > canvas.width + 50 ||
          e.y < -50 || e.y > canvas.height + 50) continue;
      const key    = e.shape + e.color;
      let   bucket = buckets.get(key);
      if (!bucket) { bucket = { color: e.color, shape: e.shape, arr: [] }; buckets.set(key, bucket); }
      bucket.arr.push(e);
    }

    for (const { color, shape, arr } of buckets.values()) {
      ctx.save();
      ctx.shadowBlur  = 10;
      ctx.shadowColor = color;
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1.5;
      ctx.fillStyle   = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      for (const e of arr) {
        this._appendEnemyPath(e, shape);
      }
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // HP bars drawn separately (no batching benefit, very cheap)
    for (const e of game.enemyPool.pool) {
      if (e.active) this._drawHpBar(e);
    }
  }

  // Append a single enemy's shape sub-path to the current path (no fill/stroke)
  _appendEnemyPath(e, shape) {
    switch (shape) {
      case 'circle': {
        this.ctx.moveTo(e.x + e.radius, e.y);
        this.ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        break;
      }
      case 'square': {
        const s = e.radius * 1.6;
        this.ctx.rect(e.x - s / 2, e.y - s / 2, s, s);
        break;
      }
      case 'triangle': {
        const r = e.radius * 1.3;
        for (let i = 0; i < 3; i++) {
          const a = (Math.PI * 2 / 3) * i - Math.PI / 2;
          const x = e.x + r * Math.cos(a);
          const y = e.y + r * Math.sin(a);
          i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        break;
      }
      case 'hexagon': {
        const r = e.radius * 1.2;
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 6;
          const x = e.x + r * Math.cos(a);
          const y = e.y + r * Math.sin(a);
          i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        break;
      }
    }
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
    const { ctx, canvas, game } = this;
    if (!game.projectilePool) return;

    for (const p of game.projectilePool.pool) {
      if (!p.active) continue;
      // Off-screen cull
      if (p.x < -20 || p.x > canvas.width + 20 ||
          p.y < -20 || p.y > canvas.height + 20) continue;

      // Motion trail — 3 fading dots behind the projectile
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 0) {
        const nx = p.vx / speed;
        const ny = p.vy / speed;
        for (let i = 1; i <= 3; i++) {
          const tx = p.x - nx * i * 5;
          const ty = p.y - ny * i * 5;
          ctx.save();
          ctx.globalAlpha = (0.4 - i * 0.1);
          ctx.shadowBlur  = 4;
          ctx.shadowColor = '#ffffff';
          ctx.fillStyle   = '#ffffff';
          ctx.beginPath();
          ctx.arc(tx, ty, 3 - i * 0.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Projectile dot
      ctx.save();
      ctx.shadowBlur  = 8;
      ctx.shadowColor = '#ffffff';
      ctx.fillStyle   = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
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
    // Results overlay: timer-driven, fades out over last 0.5s, combat runs beneath
    if (this.game.resultsTimer > 0) this._drawResults();
    if (this.game.state === State.DEFEATED) this._drawDefeated();
  }

  _drawResults() {
    const { ctx, canvas, game } = this;
    // Fade out during the last 0.5s of the timer
    const alpha = Math.min(1, game.resultsTimer / 0.5);

    ctx.save();
    ctx.globalAlpha = alpha;

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

    ctx.restore();
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

    ctx.fillStyle = COLORS.currency;
    ctx.font      = '13px monospace';
    ctx.fillText(`Total currency: $ ${game.currency}`, canvas.width / 2, canvas.height / 2 + 48);

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font      = '12px monospace';
    ctx.fillText('upgrades kept — restarting from wave 1...', canvas.width / 2, canvas.height / 2 + 68);
  }
}
