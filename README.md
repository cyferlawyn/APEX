# Cyfer Tower

A browser-based single-tower defense game. One tower. Endless waves. Countless upgrades.

## Playing the Game

Open `index.html` in any modern browser. No build step, no server required.

---

## Development Process

### Guiding Principle

Every commit leaves the game in a **working, playable state**. No commit may break
the game loop or introduce a runtime error visible to the player. Work-in-progress
code lives on a branch or stays local until it meets this bar.

### Workflow per Phase

Each phase in the MVP Implementation Plan (see `ROADMAP.md`) follows this exact sequence:

1. **Implement** — write the code for all checklist items in the phase
2. **Test manually** — open `index.html`, verify the phase's features work end-to-end;
   check that nothing broken from previous phases
3. **Check off** — mark every completed item in `ROADMAP.md` with `[x]`
4. **Commit** — one commit per completed phase, message format:

   ```
   phase N: <short description>

   - bullet summary of what was added
   - any notable decisions or deviations from the plan
   ```

No phase is committed until all its checklist items are checked off and the game
runs without errors.

### What "Functioning State" Means

At every commit, the game must satisfy all of the following:

- `index.html` opens in the browser without console errors
- The current and all previously completed phases work as specified
- No placeholder UI that crashes or produces visible errors
- Save/load does not corrupt game state
- Performance is acceptable (target: 60 fps during combat)

If a phase introduces a partially-implemented system (e.g. an upgrade whose combat
effect is wired in a later phase), it must degrade gracefully — the button exists,
the purchase works, the stat is stored — it just has no visible combat effect yet.

### Branch Strategy

- `main` — stable, every commit is a completed phase
- Feature work that spans multiple sessions may use a short-lived branch named
  `phase/N-description`, merged to `main` only when the phase is complete

### Post-MVP

After the 9 MVP phases are committed, subsequent milestones (fire modes, polish,
balance) follow the same process: implement → test → check off → commit.
The `ROADMAP.md` is the single source of truth for what is done and what is next.

---

## Project Structure

```
tower-defense/
├── index.html
├── style.css
├── README.md
├── ROADMAP.md
└── src/
    ├── main.js          # Entry point, requestAnimationFrame loop
    ├── game.js          # State machine (SHOP / COMBAT / RESULTS / GAME_OVER)
    ├── tower.js         # Tower stats, targeting, attack logic
    ├── enemy.js         # Enemy types, object pool, spawning, movement
    ├── projectile.js    # Projectile pool, movement, collision
    ├── wave.js          # Wave definitions, scaling, boss scheduling
    ├── shop.js          # Upgrade catalogue, purchase logic, cost curves
    ├── renderer.js      # All canvas drawing
    ├── particles.js     # Particle effect pool
    └── storage.js       # localStorage save / load / reset
```

## Tech Stack

- **Rendering:** Canvas 2D API
- **Language:** Vanilla JS (ES modules)
- **Persistence:** localStorage
- **Dependencies:** None
