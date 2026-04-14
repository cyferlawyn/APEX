// ui.js — shop panel and button wiring
// Patches DOM in-place to avoid hover flicker from full re-renders.

function getApex() { return window.__apex; }

// ── Initial DOM build (runs once) ──────────────────────────────────────────

function buildPrestigeCards() {
  const apex = getApex();
  if (!apex) return;

  const list = document.getElementById('prestige-upgrade-list');
  list.innerHTML = '';

  for (const entry of apex.prestigeShop.catalogue) {
    const card = document.createElement('div');
    card.className   = 'prestige-card';
    card.dataset.upg = entry.id;

    card.innerHTML = `
      <div class="upgrade-card-top">
        <span class="upgrade-name">${entry.name}</span>
        <span class="upgrade-tier" data-tier></span>
        <span class="upgrade-tooltip-icon" aria-label="${entry.tooltip}">?
          <span class="upgrade-tooltip-box">${(entry.tooltip ?? '').replace(/\n/g, '<br>')}</span>
        </span>
      </div>
      <button class="prestige-buy-btn" data-pid="${entry.id}"></button>
    `;

    list.appendChild(card);
  }
}

function buildShopCards() {
  const apex = getApex();
  if (!apex) return;

  const list = document.getElementById('upgrade-list');
  list.innerHTML = '';

  for (const entry of apex.shop.catalogue) {
    const card = document.createElement('div');
    card.className   = 'upgrade-card';
    card.dataset.upg = entry.id;

    card.innerHTML = `
      <div class="upgrade-card-top">
        <span class="upgrade-name">${entry.name}</span>
        <span class="upgrade-tier" data-tier></span>
        <span class="upgrade-tooltip-icon" aria-label="${entry.tooltip}">?
          <span class="upgrade-tooltip-box">${(entry.tooltip ?? '').replace(/\n/g, '<br>')}</span>
        </span>
      </div>
      <button class="upgrade-buy-btn" data-id="${entry.id}"></button>
    `;

    list.appendChild(card);
  }
}

// ── Patch update (runs every 250ms) ────────────────────────────────────────
// Only touches text/attributes that actually changed — never recreates nodes,
// so hover state and focus are preserved.

function patchPrestigeCards() {
  const apex = getApex();
  if (!apex) return;

  const { prestigeShop, game } = apex;

  // Show/hide prestige section
  const showPrestige = game.ascensionCount > 0 || game.wave >= 30;
  const prestigeSection = document.getElementById('prestige-section');
  if (prestigeSection.classList.contains('hidden') === showPrestige) {
    prestigeSection.classList.toggle('hidden', !showPrestige);
  }

  if (!showPrestige) return;

  // Shard balance
  const shardEl = document.getElementById('prestige-shard-value');
  if (shardEl.textContent !== String(game.shards)) shardEl.textContent = game.shards;

  // Passive line
  const passiveLine = document.getElementById('prestige-passive-line');
  const totalShards = game.shards + game.pendingShards;
  const mult = (1 + totalShards * 0.10).toFixed(2);
  const passiveText = `Shard bonus: ×${mult} dmg (${totalShards} total)`;
  if (passiveLine.textContent !== passiveText) passiveLine.textContent = passiveText;

  // Ascend button
  const ascendBtn = document.getElementById('ascend-btn');
  const showAscend = game.wave >= 30;
  if (ascendBtn.classList.contains('hidden') === showAscend) {
    ascendBtn.classList.toggle('hidden', !showAscend);
  }
  if (showAscend) {
    const active = game.pendingShards > 0;
    ascendBtn.disabled = !active;
    const label = active ? `ASCEND (+${game.pendingShards} ◆)` : 'ASCEND (no ◆ yet)';
    if (ascendBtn.textContent !== label) ascendBtn.textContent = label;
  }

  // Prestige upgrade cards
  for (const entry of prestigeShop.catalogue) {
    const card = document.querySelector(`.prestige-card[data-upg="${entry.id}"]`);
    if (!card) continue;

    const tier   = prestigeShop.tier(entry.id);
    const maxed  = prestigeShop.isMaxed(entry.id);
    const cost   = prestigeShop.cost(entry.id);
    const afford = game.shards >= cost;

    if (card.classList.contains('is-maxed') !== maxed) {
      card.classList.toggle('is-maxed', maxed);
    }

    const tierEl   = card.querySelector('[data-tier]');
    const tierText = maxed ? 'MAX' : `[${tier}/${entry.maxTier}]`;
    if (tierEl.textContent !== tierText) tierEl.textContent = tierText;
    if (tierEl.classList.contains('maxed') !== maxed) tierEl.classList.toggle('maxed', maxed);

    const btn = card.querySelector('.prestige-buy-btn');
    if (maxed) {
      setBtn(btn, 'MAXED', true, true);
    } else {
      const label = `◆ ${cost}`;
      setBtn(btn, label, !afford, false);
      if (btn.dataset.pid !== entry.id) btn.dataset.pid = entry.id;
    }
  }
}

function patchShopCards() {
  const apex = getApex();
  if (!apex) return;

  const { shop, game } = apex;

  // Currency
  document.getElementById('currency-value').textContent = game.currency;

  for (const entry of shop.catalogue) {
    const card = document.querySelector(`.upgrade-card[data-upg="${entry.id}"]`);
    if (!card) continue;

    const tier   = shop.tier(entry.id);
    const maxed  = shop.isMaxed(entry.id);
    const cost   = shop.cost(entry.id);
    const afford = game.currency >= cost;

    // Collapsed state for maxed cards
    if (card.classList.contains('is-maxed') !== maxed) {
      card.classList.toggle('is-maxed', maxed);
    }

    // Tier label
    const tierEl = card.querySelector('[data-tier]');
    const tierText = maxed ? 'MAX' : entry.maxTier === null ? `[${tier}/∞]` : `[${tier}/${entry.maxTier}]`;
    if (tierEl.textContent !== tierText) tierEl.textContent = tierText;
    const wantMaxedClass = maxed;
    if (tierEl.classList.contains('maxed') !== wantMaxedClass) {
      tierEl.classList.toggle('maxed', wantMaxedClass);
    }

    // Buy button
    const btn = card.querySelector('.upgrade-buy-btn');
    if (maxed) {
      setBtn(btn, 'MAXED', true, true);
    } else {
      let label = `$ ${cost}`;
      if (!afford && game.recentEarned > 0) {
        const deficit = cost - game.currency;
        // recentEarned is per 60s window; convert to per-second rate
        const rate = game.recentEarned / 60;
        const secs = Math.min(999, Math.ceil(deficit / rate));
        label = `$ ${cost}  ~${secs}s`;
      }
      setBtn(btn, label, !afford, false);
      // Ensure data-id stays (shouldn't change but be safe)
      if (btn.dataset.id !== entry.id) btn.dataset.id = entry.id;
    }
  }
}

function setBtn(btn, text, disabled, maxed) {
  if (btn.textContent !== text) btn.textContent = text;
  if (btn.disabled !== disabled) btn.disabled = disabled;
  if (btn.classList.contains('maxed') !== maxed) btn.classList.toggle('maxed', maxed);
}

// ── Button wiring ──────────────────────────────────────────────────────────

function wireButtons() {
  // Upgrade purchases (delegated — single listener on the list)
  document.getElementById('upgrade-list').addEventListener('click', e => {
    const btn = e.target.closest('[data-id]');
    if (!btn || btn.disabled) return;
    const apex = getApex();
    if (!apex) return;
    apex.shop.purchase(btn.dataset.id);
    patchShopCards();
  });

  // Prestige upgrade purchases (delegated)
  document.getElementById('prestige-upgrade-list').addEventListener('click', e => {
    const btn = e.target.closest('[data-pid]');
    if (!btn || btn.disabled) return;
    const apex = getApex();
    if (!apex) return;
    apex.prestigeShop.purchase(btn.dataset.pid);
    patchPrestigeCards();
  });

  // Ascend button — open confirmation overlay
  document.getElementById('ascend-btn').addEventListener('click', () => {
    const apex = getApex();
    if (!apex) return;
    const { game } = apex;
    const totalAfter = game.shards + game.pendingShards;
    const multAfter  = (1 + totalAfter * 0.10).toFixed(2);
    document.getElementById('ascend-confirm-sub').textContent =
      `+${game.pendingShards} ◆  →  ${totalAfter} total ◆  →  ×${multAfter} shard damage`;
    document.getElementById('ascend-overlay').classList.remove('hidden');
  });

  document.getElementById('ascend-yes').addEventListener('click', () => {
    document.getElementById('ascend-overlay').classList.add('hidden');
    getApex()?.ascend();
    patchShopCards();
    patchPrestigeCards();
  });

  document.getElementById('ascend-no').addEventListener('click', () => {
    document.getElementById('ascend-overlay').classList.add('hidden');
  });

  // Self-destruct — voluntary defeat, no confirmation needed
  document.getElementById('self-destruct-btn').addEventListener('click', () => {
    getApex()?.selfDestruct();
  });

  // New Game
  document.getElementById('new-game-btn').addEventListener('click', () => {
    const apex = getApex();
    if (!apex) return;
    if (apex.hasSave()) {
      document.getElementById('confirm-overlay').classList.remove('hidden');
    } else {
      apex.newGame(true);
      patchShopCards();
    }
  });

  document.getElementById('confirm-yes').addEventListener('click', () => {
    document.getElementById('confirm-overlay').classList.add('hidden');
    getApex()?.newGame(true);
    patchShopCards();
  });

  document.getElementById('confirm-no').addEventListener('click', () => {
    document.getElementById('confirm-overlay').classList.add('hidden');
  });

  // Volume slider
  document.getElementById('volume-slider').addEventListener('input', e => {
    const apex = getApex();
    if (!apex) return;
    const vol = parseInt(e.target.value, 10) / 100;
    apex.audio?.setVolume(vol);
    apex.savePrefs({ quality: apex.game.quality, volume: vol, autoQuality: apex.game.autoQuality });
  });

  // FX level buttons (HIGH / MED / LOW) — clicking one disables AUTO
  document.getElementById('quality-buttons').addEventListener('click', e => {
    const btn = e.target.closest('.quality-btn');
    if (!btn) return;
    const apex = getApex();
    if (!apex) return;
    apex.setQuality(btn.dataset.q); // sets autoQuality = false
    syncQualityUI(apex.game);
  });

  // AUTO toggle button
  document.getElementById('auto-quality-btn').addEventListener('click', () => {
    const apex = getApex();
    if (!apex) return;
    if (apex.game.autoQuality) {
      // Turn AUTO off — revert to the quality AUTO currently holds
      apex.setQuality(apex.game.quality);
    } else {
      apex.setQuality('auto');
    }
    syncQualityUI(apex.game);
  });
}

// ── Init ───────────────────────────────────────────────────────────────────

window.addEventListener('load', () => {
  // Give main.js one tick to set window.__apex
  requestAnimationFrame(() => {
    buildShopCards();
    buildPrestigeCards();
    wireButtons();
    patchShopCards();
    patchPrestigeCards();
    syncPrefsUI();
    setInterval(patchShopCards, 250);
    setInterval(patchPrestigeCards, 250);
  });
});

// Exposed so main.js can sync the UI after an AUTO step-down
window.__syncQualityUI = () => {
  const apex = getApex();
  if (apex) syncQualityUI(apex.game);
};

// Reflect saved prefs back onto the controls
function syncPrefsUI() {
  const apex = getApex();
  if (!apex) return;
  syncQualityUI(apex.game);

  // Volume slider
  const vol = apex.audio?.volume ?? 0.4;
  document.getElementById('volume-slider').value = Math.round(vol * 100);
}

// Sync quality buttons to current game state.
// Called on load, on manual quality change, and after AUTO steps down.
function syncQualityUI(game) {
  const isAuto = game.autoQuality;
  const q      = game.quality ?? 'high';

  // Level buttons: cyan .active when manually chosen, yellow .auto-active when AUTO picked it
  document.querySelectorAll('.quality-btn').forEach(b => {
    b.classList.toggle('active',      !isAuto && b.dataset.q === q);
    b.classList.toggle('auto-active',  isAuto && b.dataset.q === q);
  });

  // AUTO toggle button
  document.getElementById('auto-quality-btn').classList.toggle('active', isAuto);
}
