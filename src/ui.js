// ui.js — shop panel rendering and button wiring
// Runs after main.js has set up window.__apex

const UPGRADE_NEXT_EFFECT = {
  damage:          t => `+15% damage`,
  fireRate:        t => `+10% fire rate`,
  projectileSpeed: t => `+12% projectile speed`,
  range:           t => `+8% range`,
  maxHp:           t => `+20% max HP`,
  hpRegen:         t => `+5 HP regen / wave`,
  currencyMult:    t => `+10% currency earned`,
  multiShot:       t => t === 0 ? `Unlock (${2} targets)` : `+1 target (${t + 2} total)`,
  spreadShot:      t => t === 0 ? `Unlock (3 pellets, 20° cone)` : `+1 pellet, wider cone`,
  explosive:       t => t === 0 ? `Unlock splash damage` : `+15px radius`,
  chainLightning:  t => t === 0 ? `Unlock (1 chain jump)` : `+1 chain jump`,
  laserBurst:      t => t === 0 ? `Unlock laser burst` : `Reduce cooldown / extend duration`,
  turrets:         t => t === 0 ? `Unlock 1st turret` : `+1 rotating turret`,
};

function getApex() {
  return window.__apex;
}

function renderShop() {
  const apex = getApex();
  if (!apex) return;

  const { shop, game } = apex;

  // Currency
  document.getElementById('currency-value').textContent = game.currency;

  // Start Wave button
  const btn = document.getElementById('start-wave-btn');
  const inShop = game.state === 'SHOP';
  btn.disabled    = !inShop;
  btn.textContent = `START WAVE ${game.wave}`;

  // Upgrade cards
  const list = document.getElementById('upgrade-list');
  list.innerHTML = '';

  for (const entry of shop.catalogue) {
    const tier    = shop.tier(entry.id);
    const maxed   = shop.isMaxed(entry.id);
    const cost    = shop.cost(entry.id);
    const afford  = game.currency >= cost;
    const nextFx  = (UPGRADE_NEXT_EFFECT[entry.id] ?? (() => ''))(tier);

    const card = document.createElement('div');
    card.className = 'upgrade-card';

    const tierLabel = maxed
      ? `<span class="upgrade-tier maxed">MAX</span>`
      : `<span class="upgrade-tier">[${tier}/${entry.maxTier}]</span>`;

    let btnHtml;
    if (maxed) {
      btnHtml = `<button class="upgrade-buy-btn maxed" disabled>MAXED</button>`;
    } else if (!inShop) {
      btnHtml = `<button class="upgrade-buy-btn" disabled>$ ${cost}</button>`;
    } else {
      btnHtml = `<button class="upgrade-buy-btn" ${afford ? '' : 'disabled'}
                   data-id="${entry.id}">
                   $ ${cost} — ${nextFx}
                 </button>`;
    }

    card.innerHTML = `
      <div class="upgrade-card-top">
        <span class="upgrade-name">${entry.name}</span>
        ${tierLabel}
      </div>
      <div class="upgrade-desc">${entry.description}</div>
      ${btnHtml}
    `;

    list.appendChild(card);
  }
}

function wireButtons() {
  // Start Wave
  document.getElementById('start-wave-btn').addEventListener('click', () => {
    getApex()?.startWave();
    renderShop();
  });

  // Upgrade purchases (delegated)
  document.getElementById('upgrade-list').addEventListener('click', e => {
    const btn = e.target.closest('[data-id]');
    if (!btn) return;
    const apex = getApex();
    if (!apex) return;
    apex.shop.purchase(btn.dataset.id);
    renderShop();
  });

  // New Game
  document.getElementById('new-game-btn').addEventListener('click', () => {
    const apex = getApex();
    if (!apex) return;
    if (apex.hasSave()) {
      document.getElementById('confirm-overlay').classList.remove('hidden');
    } else {
      apex.newGame(true);
      renderShop();
    }
  });

  // Confirm yes
  document.getElementById('confirm-yes').addEventListener('click', () => {
    document.getElementById('confirm-overlay').classList.add('hidden');
    const apex = getApex();
    apex?.newGame(true);
    renderShop();
  });

  // Confirm no
  document.getElementById('confirm-no').addEventListener('click', () => {
    document.getElementById('confirm-overlay').classList.add('hidden');
  });
}

// Poll every 250ms to keep the shop panel in sync with game state
// (cheap; avoids threading a full event bus for Phase 1)
function startPolling() {
  setInterval(renderShop, 250);
}

// Wait for main.js to expose window.__apex
window.addEventListener('load', () => {
  wireButtons();
  startPolling();
  renderShop();
});
