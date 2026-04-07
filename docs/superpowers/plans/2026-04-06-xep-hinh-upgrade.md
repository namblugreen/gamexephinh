# Xep Hinh Pixel - Nang Cap Toan Dien Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Block Blast Pixel game with save system, responsive layout, interactive settings, 6 power-ups, 4 visual themes, UI polish, and GitHub Pages deployment.

**Architecture:** The game is a single-page Canvas 2D app bundled in an IIFE. We'll split the growing codebase into multiple `<script>` files loaded sequentially (no ES modules, to avoid file:// CORS). Each feature builds on the previous: Save → Responsive → Settings → Power-ups → Themes → UI Polish → Deploy.

**Tech Stack:** Vanilla JS, HTML5 Canvas 2D, Web Audio API, localStorage, CSS3, GitHub Pages

---

## File Structure

```
index.html              — Entry point, loads all scripts in order
css/style.css           — Responsive CSS (modify)
game.js                 — Core game: Storage, Board, Pieces, Score, Modes, Audio, Renderer, Effects, Input, Main game loop (modify)
themes.js               — Theme definitions + theme-aware rendering helpers (create)
powerups.js             — Power-up system: definitions, state, UI, activation logic (create)
```

**Why split:** game.js is already ~900 lines. Adding power-ups (~300 lines) and themes (~200 lines) would push it to ~1400+ lines. Splitting keeps each file focused and editable. All files share the global scope via the IIFE removal pattern (each file wraps its additions, but shares globals through `window`).

**Key constraint:** No ES modules (`import`/`export`). All files use global scope or attach to a shared `window.Game` namespace object. Scripts load in order via `<script>` tags.

---

### Task 1: Shared Namespace + Script Loading Setup

**Files:**
- Modify: `index.html`
- Modify: `game.js` — expose internals on `window.Game` namespace

This task restructures game.js to expose key objects on a global namespace so that themes.js and powerups.js (added later) can access them.

- [ ] **Step 1: Add namespace to game.js**

At the very top of game.js (line 1), before the IIFE, add:

```javascript
window.Game = {};
```

Inside the IIFE, after each major object definition, expose it on the namespace. Add these lines:

After `const Storage = { ... };` (around line 42):
```javascript
Game.Storage = Storage;
```

After `const Board = { ... };` (around line 87):
```javascript
Game.Board = Board;
```

After `const Pieces = { ... };` (around line 130):
```javascript
Game.Pieces = Pieces;
```

After `const Score = { ... };` (around line 148):
```javascript
Game.Score = Score;
```

After `const Audio = { ... };` (around line 226):
```javascript
Game.Audio = Audio;
```

After the Renderer object `const R = { ... };` (around line 408):
```javascript
Game.R = R;
Game.CPAL = CPAL;
Game.CELL = CELL;
Game.GSIZ = GSIZ;
```

After the effects section (around line 500), expose effect functions:
```javascript
Game.spawnParticles = spawnParticles;
Game.spawnPlaceEffect = spawnPlaceEffect;
Game.spawnFloatText = spawnFloatText;
Game.spawnLineExplosion = spawnLineExplosion;
```

At the end of the IIFE (before the closing `})()`), expose game state accessors:
```javascript
Game.getState = () => ({ board, pieces, scoreState, highScore, mode, undosLeft, undoSnapshot, rng, state, comboText, comboAlpha, comboScale, playerName });
Game.setState = (s) => {
    if (s.board !== undefined) board = s.board;
    if (s.pieces !== undefined) pieces = s.pieces;
    if (s.scoreState !== undefined) scoreState = s.scoreState;
    if (s.highScore !== undefined) highScore = s.highScore;
    if (s.mode !== undefined) mode = s.mode;
    if (s.undosLeft !== undefined) undosLeft = s.undosLeft;
    if (s.undoSnapshot !== undefined) undoSnapshot = s.undoSnapshot;
    if (s.rng !== undefined) rng = s.rng;
    if (s.state !== undefined) state = s.state;
};
Game.ST = ST;
Game.startGame = startGame;
Game.menuBtns = menuBtns;
Game.Input = Input;
```

- [ ] **Step 2: Update index.html for multiple scripts**

Replace the current `<script src="game.js"></script>` with:

```html
<script src="game.js"></script>
<script src="themes.js"></script>
<script src="powerups.js"></script>
```

- [ ] **Step 3: Create placeholder themes.js**

```javascript
// themes.js — Theme definitions (placeholder, implemented in Task 6)
(function() {
'use strict';
// Will be populated in Task 6
})();
```

- [ ] **Step 4: Create placeholder powerups.js**

```javascript
// powerups.js — Power-up system (placeholder, implemented in Task 5)
(function() {
'use strict';
// Will be populated in Task 5
})();
```

- [ ] **Step 5: Test the game still works**

Open `index.html` in browser. Verify:
- Game loads, menu appears
- Can start a game, place pieces, clear lines
- All effects still work
- No console errors

- [ ] **Step 6: Commit**

```bash
git add index.html game.js themes.js powerups.js
git commit -m "refactor: expose Game namespace for multi-file architecture"
```

---

### Task 2: Save Game System

**Files:**
- Modify: `game.js` — Add save/load to Storage, auto-save hook, "TIEP TUC" button, load logic

- [ ] **Step 1: Add save/load functions to Storage**

In game.js, inside the `Storage` object (after `saveDailyResult` method), add:

```javascript
    saveGame(data) {
        const key = data.mode && data.mode.type === 'daily' ? 'bbp_savegame_daily' : 'bbp_savegame';
        localStorage.setItem(key, JSON.stringify(data));
    },
    loadGame(type) {
        const key = type === 'daily' ? 'bbp_savegame_daily' : 'bbp_savegame';
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    },
    clearSave(type) {
        const key = type === 'daily' ? 'bbp_savegame_daily' : 'bbp_savegame';
        localStorage.removeItem(key);
    },
    hasSave() {
        return localStorage.getItem('bbp_savegame') !== null || localStorage.getItem('bbp_savegame_daily') !== null;
    },
    hasSaveForType(type) {
        const key = type === 'daily' ? 'bbp_savegame_daily' : 'bbp_savegame';
        return localStorage.getItem(key) !== null;
    },
```

- [ ] **Step 2: Add auto-save function**

In game.js, after the `checkGameOver()` function, add:

```javascript
function autoSave() {
    if (state !== ST.PLAY) return;
    const saveData = {
        board: Board.clone(board),
        pieces: pieces.map(p => p ? { ...p, cells: p.cells.map(c => [...c]) } : null),
        scoreState: { ...scoreState },
        highScore: highScore,
        mode: { ...mode },
        undosLeft: undosLeft,
        undoSnapshot: undoSnapshot ? {
            board: Board.clone(undoSnapshot.board),
            pieces: undoSnapshot.pieces.map(p => p ? { ...p, cells: p.cells.map(c => [...c]) } : null),
            scoreState: { ...undoSnapshot.scoreState },
        } : null,
        rngSeed: rng ? null : null, // rng state can't be easily serialized for LCG; daily games re-seed on load
    };
    Storage.saveGame(saveData);
}
```

- [ ] **Step 3: Hook auto-save into piece placement**

In the `Input.onPieceDrop` handler, at the very end of the `if (Board.canPlace(...))` block (after `checkGameOver();`), add:

```javascript
        autoSave();
```

Also in `spawnNewPieces()`, after setting pieces, add:

```javascript
function spawnNewPieces() {
    pieces = rng ? Pieces.seededSpawnSet(rng) : Pieces.spawnSet();
    autoSave();
}
```

- [ ] **Step 4: Clear save on game over and new game**

In `checkGameOver()`, inside the `if` block where `state = ST.OVER` is set, add:

```javascript
        Storage.clearSave(mode.type);
```

In `startGame(mType)`, at the beginning, add:

```javascript
    Storage.clearSave(mType);
```

- [ ] **Step 5: Add "TIEP TUC" button to menu**

Add a continue button to the `menuBtns` array. Insert it at index 0 (before 'CO DIEN'):

```javascript
const continueBtnDef = { label: 'TIEP TUC', mode: 'continue', x:0, y:0, w:180, h:36 };
```

In the `drawMenu()` function, before drawing buttons, check if save exists and conditionally include the continue button:

Replace the button drawing loop in `drawMenu()` with:

```javascript
function drawMenu() {
    const ctx = R.ctx; R.clear();
    ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffcc00'; ctx.font = '20px "Press Start 2P"'; ctx.textAlign = 'center';
    ctx.fillText('XEP HINH', R.cw/2, 80);
    ctx.shadowColor = '#ff6b6b'; ctx.shadowBlur = 15;
    ctx.fillStyle = '#ff6b6b'; ctx.font = '12px "Press Start 2P"';
    ctx.fillText('PIXEL', R.cw/2, 105);
    ctx.shadowBlur = 0;

    const btns = Storage.hasSave() ? [continueBtnDef, ...menuBtns] : menuBtns;
    const startY = Storage.hasSave() ? 130 : 150;
    const gap = Storage.hasSave() ? 42 : 50;

    for (let i = 0; i < btns.length; i++) {
        const btn = btns[i];
        btn.x = (R.cw - btn.w) / 2; btn.y = startY + i * gap;

        if (btn.mode === 'continue') {
            // Green highlight for continue button
            ctx.fillStyle = '#1a3a1a'; ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
            ctx.fillStyle = '#2a4a2a'; ctx.fillRect(btn.x, btn.y, btn.w, 2);
            ctx.strokeStyle = '#44bb44'; ctx.lineWidth = 2; ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
            ctx.shadowColor = '#44bb44'; ctx.shadowBlur = 8;
            ctx.fillStyle = '#44bb44';
        } else {
            ctx.fillStyle = '#2a2a4a'; ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
            ctx.fillStyle = '#3a3a5a'; ctx.fillRect(btn.x, btn.y, btn.w, 2);
            ctx.strokeStyle = '#5a5a7a'; ctx.lineWidth = 2; ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
            ctx.fillStyle = '#fff';
        }
        ctx.font = '8px "Press Start 2P"';
        ctx.fillText(btn.label, R.cw/2, btn.y+22);
        ctx.shadowBlur = 0;
    }
    ctx.textAlign = 'left';
}
```

- [ ] **Step 6: Add continue button click handler**

In `Input.onClick`, update the menu button check to include the continue button:

Replace the menu section of `Input.onClick` with:

```javascript
    if (state === ST.MENU) {
        const btns = Storage.hasSave() ? [continueBtnDef, ...menuBtns] : menuBtns;
        for (const btn of btns) {
            if (x >= btn.x && x <= btn.x+btn.w && y >= btn.y && y <= btn.y+btn.h) {
                Audio.playClick();
                if (btn.mode === 'continue') {
                    loadSavedGame();
                } else if (btn.mode === 'leaderboard') {
                    state = ST.LB;
                } else if (btn.mode === 'settings') {
                    state = ST.SET;
                } else {
                    startGame(btn.mode);
                }
                return;
            }
        }
    }
```

- [ ] **Step 7: Implement loadSavedGame function**

After `autoSave()`, add:

```javascript
function loadSavedGame() {
    // Try loading regular save first, then daily
    let save = Storage.loadGame('classic');
    if (!save) save = Storage.loadGame('daily');
    if (!save) return;

    board = save.board;
    pieces = save.pieces;
    scoreState = save.scoreState;
    highScore = save.highScore;
    mode = save.mode;
    undosLeft = save.undosLeft;
    undoSnapshot = save.undoSnapshot;
    rng = null; // Daily mode RNG can't be restored; pieces are already saved
    comboText = ''; comboAlpha = 0; comboScale = 1;
    state = ST.PLAY;
    Audio.startMusic();
}
```

- [ ] **Step 8: Test save system**

Open game in browser. Verify:
1. Start a classic game, place a few pieces, close browser tab
2. Reopen — "TIEP TUC" button appears on menu
3. Click "TIEP TUC" — game resumes with same board, pieces, score
4. Play until game over — save is cleared, no "TIEP TUC" on menu
5. Start new game — no issues with previous save

- [ ] **Step 9: Commit**

```bash
git add game.js
git commit -m "feat: add auto-save and continue game system"
```

---

### Task 3: Responsive Layout + Mobile Touch

**Files:**
- Modify: `css/style.css` — Full viewport canvas scaling
- Modify: `game.js` — Mobile touch offset, fullscreen button

- [ ] **Step 1: Update CSS for responsive scaling**

Replace the entire `css/style.css` with:

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background: #1a1a2e;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    overflow: hidden;
    font-family: 'Press Start 2P', cursive;
    touch-action: none;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
}

canvas {
    display: block;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    max-width: 100vw;
    max-height: 100vh;
    object-fit: contain;
}
```

- [ ] **Step 2: Add mobile detection and touch offset**

In game.js, after the `Input` object initialization but before the event listeners, add mobile detection:

```javascript
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
```

In the `R.drawDragging` method, change the Y offset based on mobile:

```javascript
    drawDragging(piece, mx, my) {
        if (!piece) return;
        const yOff = isMobile ? -CELL * 2 : -CELL;
        for (const [r, c] of piece.cells) this.drawCell(mx+c*CELL-CELL/2, my+r*CELL+yOff, piece.color, true);
    },
```

Also update `dragToGrid` to match:

```javascript
    dragToGrid(mx, my) {
        const adjX = mx;
        const adjY = isMobile ? my - CELL * 1.5 : my - CELL / 2;
        return this.screenToGrid(adjX, adjY);
    },
```

- [ ] **Step 3: Add fullscreen button to menu**

Add a fullscreen button to the menu buttons array:

```javascript
const menuBtns = [
    { label: 'CO DIEN', mode: 'classic', x:0, y:0, w:180, h:36 },
    { label: 'VUOT THOI GIAN', mode: 'timeattack', x:0, y:0, w:180, h:36 },
    { label: 'HANG NGAY', mode: 'daily', x:0, y:0, w:180, h:36 },
    { label: 'BANG XEP HANG', mode: 'leaderboard', x:0, y:0, w:180, h:36 },
    { label: 'CAI DAT', mode: 'settings', x:0, y:0, w:180, h:36 },
    { label: 'TOAN MAN HINH', mode: 'fullscreen', x:0, y:0, w:180, h:36 },
];
```

In the menu click handler, add fullscreen case:

```javascript
                } else if (btn.mode === 'fullscreen') {
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else {
                        document.documentElement.requestFullscreen().catch(() => {});
                    }
```

- [ ] **Step 4: Test responsive behavior**

Test in browser:
1. Resize browser window — canvas scales to fit, stays centered
2. Open dev tools mobile view (F12 → toggle device toolbar) — game scales to phone size
3. Test drag on simulated touch — piece lifts higher than desktop
4. Click "TOAN MAN HINH" — enters fullscreen, game scales correctly

- [ ] **Step 5: Commit**

```bash
git add css/style.css game.js
git commit -m "feat: responsive layout, mobile touch offset, fullscreen button"
```

---

### Task 4: Interactive Settings

**Files:**
- Modify: `game.js` — Rewrite drawSettings() and settings click handler

- [ ] **Step 1: Add settings state tracking**

In game.js, near the game state variables (around line 650), add:

```javascript
let settingsHover = -1; // which setting row is hovered
let deleteConfirm = false; // XOA DU LIEU confirmation state
```

- [ ] **Step 2: Define settings items**

After the settings state variables, add:

```javascript
const settingsItems = [
    { key: 'sfxEnabled', label: 'AM THANH', type: 'toggle' },
    { key: 'musicEnabled', label: 'NHAC', type: 'toggle' },
    { key: 'sfxVolume', label: 'AM LUONG', type: 'range' },
    { key: 'musicVolume', label: 'NHAC LUONG', type: 'range' },
    { key: 'theme', label: 'CHU DE', type: 'cycle' },
    { key: 'delete', label: 'XOA DU LIEU', type: 'confirm' },
];
```

- [ ] **Step 3: Rewrite drawSettings()**

Replace `drawSettings()` with:

```javascript
function drawSettings() {
    const ctx = R.ctx; R.clear();
    ctx.fillStyle = '#ffcc00'; ctx.font = '12px "Press Start 2P"'; ctx.textAlign = 'center';
    ctx.fillText('CAI DAT', R.cw/2, 50);

    const s = Storage.getSettings();
    const startY = 80;
    const rowH = 35;
    const rowW = 240;
    const rx = (R.cw - rowW) / 2;

    for (let i = 0; i < settingsItems.length; i++) {
        const item = settingsItems[i];
        const ry = startY + i * rowH;

        // Store hitbox for click detection
        item.x = rx; item.y = ry; item.w = rowW; item.h = rowH - 5;

        // Background (highlight on hover)
        ctx.fillStyle = settingsHover === i ? '#3a3a6a' : '#2a2a4a';
        ctx.fillRect(rx, ry, rowW, rowH - 5);
        ctx.strokeStyle = '#5a5a7a'; ctx.lineWidth = 1;
        ctx.strokeRect(rx, ry, rowW, rowH - 5);

        ctx.fillStyle = '#fff'; ctx.font = '7px "Press Start 2P"';

        let valueText = '';
        if (item.type === 'toggle') {
            valueText = s[item.key] ? 'BAT' : 'TAT';
            ctx.fillStyle = s[item.key] ? '#44bb44' : '#ff4444';
        } else if (item.type === 'range') {
            valueText = '< ' + Math.round(s[item.key] * 100) + '% >';
            ctx.fillStyle = '#74c0fc';
        } else if (item.type === 'cycle') {
            const themeNames = { default: 'MAC DINH', retro: 'RETRO XANH', sunset: 'HOANG HON', galaxy: 'GALAXY' };
            valueText = themeNames[s.theme || 'default'] || 'MAC DINH';
            ctx.fillStyle = '#b197fc';
        } else if (item.type === 'confirm') {
            valueText = deleteConfirm ? 'CHAC CHUA?' : 'NHAN DE XOA';
            ctx.fillStyle = deleteConfirm ? '#ff4444' : '#aaa';
        }

        // Label on left
        ctx.textAlign = 'left';
        ctx.fillStyle = '#fff'; ctx.font = '7px "Press Start 2P"';
        ctx.fillText(item.label, rx + 8, ry + 18);

        // Value on right
        ctx.textAlign = 'right';
        ctx.fillStyle = item.type === 'toggle' ? (s[item.key] ? '#44bb44' : '#ff4444') :
                        item.type === 'range' ? '#74c0fc' :
                        item.type === 'cycle' ? '#b197fc' :
                        (deleteConfirm ? '#ff4444' : '#aaa');
        ctx.fillText(valueText, rx + rowW - 8, ry + 18);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#aaa'; ctx.font = '7px "Press Start 2P"';
    ctx.fillText('Nhan de quay lai', R.cw/2, startY + settingsItems.length * rowH + 20);
    ctx.textAlign = 'left';
}
```

- [ ] **Step 4: Add settings click handling**

Replace the settings section in `Input.onClick` (the `else if (state === ST.LB || state === ST.SET)` block) with:

```javascript
    } else if (state === ST.LB) {
        Audio.playClick(); state = ST.MENU;
    } else if (state === ST.SET) {
        // Check if clicked a settings item
        let clickedItem = false;
        const s = Storage.getSettings();
        for (let i = 0; i < settingsItems.length; i++) {
            const item = settingsItems[i];
            if (x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h) {
                Audio.playClick();
                clickedItem = true;

                if (item.type === 'toggle') {
                    s[item.key] = !s[item.key];
                    Storage.saveSettings(s);
                    Audio.init(s);
                    if (item.key === 'musicEnabled' && !s.musicEnabled) Audio.stopMusic();
                } else if (item.type === 'range') {
                    // Left half decreases, right half increases
                    const midX = item.x + item.w / 2;
                    if (x < midX) {
                        s[item.key] = Math.max(0, Math.round((s[item.key] - 0.1) * 10) / 10);
                    } else {
                        s[item.key] = Math.min(1, Math.round((s[item.key] + 0.1) * 10) / 10);
                    }
                    Storage.saveSettings(s);
                    // Update audio gain nodes
                    if (masterSfxGain) masterSfxGain.gain.value = s.sfxVolume;
                    if (masterMusicGain) masterMusicGain.gain.value = s.musicVolume;
                } else if (item.type === 'cycle') {
                    const themes = ['default', 'retro', 'sunset', 'galaxy'];
                    const ci = themes.indexOf(s.theme || 'default');
                    s.theme = themes[(ci + 1) % themes.length];
                    Storage.saveSettings(s);
                } else if (item.type === 'confirm') {
                    if (deleteConfirm) {
                        localStorage.clear();
                        deleteConfirm = false;
                    } else {
                        deleteConfirm = true;
                    }
                }
                break;
            }
        }
        if (!clickedItem) {
            Audio.playClick();
            deleteConfirm = false;
            state = ST.MENU;
        }
    }
```

- [ ] **Step 5: Add hover tracking for settings**

In the `mousemove` handler (inside `Input.init`), add settings hover detection. After `self.mouseX = pos.x; self.mouseY = pos.y;` in the mousemove listener, the hover detection happens in the draw loop instead. Update `drawSettings` to check mouse position directly:

At the top of `drawSettings()`, add:

```javascript
    // Update hover state
    settingsHover = -1;
    const mx = Input.mouseX, my = Input.mouseY;
```

And after computing `item.x, item.y, item.w, item.h` for each item, add:

```javascript
        if (mx >= rx && mx <= rx + rowW && my >= ry && my <= ry + rowH - 5) settingsHover = i;
```

- [ ] **Step 6: Add theme field to default settings**

In `DEFAULT_SETTINGS`, add:

```javascript
const DEFAULT_SETTINGS = { sfxEnabled: true, musicEnabled: true, sfxVolume: 0.7, musicVolume: 0.5, theme: 'default' };
```

- [ ] **Step 7: Test settings**

Open game in browser. Verify:
1. Go to CAI DAT — see all 6 setting rows
2. Click AM THANH — toggles BAT/TAT, sound changes
3. Click left/right side of AM LUONG — decreases/increases 10%
4. Click CHU DE — cycles through theme names (visual won't change until Task 6)
5. Click XOA DU LIEU — shows "CHAC CHUA?", click again — clears all data
6. Click outside items — returns to menu
7. Hover over items — row highlights

- [ ] **Step 8: Commit**

```bash
git add game.js
git commit -m "feat: interactive settings with toggle, range, cycle, and delete"
```

---

### Task 5: Power-ups System

**Files:**
- Modify: `game.js` — Add power-up state, earning logic, activation hooks
- Modify: `powerups.js` — Full power-up implementation

- [ ] **Step 1: Add power-up state to game.js**

In game.js, near the game state variables, add:

```javascript
let powerups = []; // max 3, each is { type: string } or null
let activePowerup = null; // { type, step } when a power-up is being used
let powerupScore = 0; // accumulates toward next power-up
const POWERUP_COST = 300; // points per power-up earned
```

In `startGame()`, add reset:

```javascript
    powerups = []; activePowerup = null; powerupScore = 0;
```

In `loadSavedGame()`, add restoration:

```javascript
    powerups = save.powerups || [];
    activePowerup = null;
    powerupScore = save.powerupScore || 0;
```

In `autoSave()`, add to saveData:

```javascript
        powerups: [...powerups],
        powerupScore: powerupScore,
```

Expose on namespace:

```javascript
Game.getPowerups = () => ({ powerups, activePowerup, powerupScore });
Game.setPowerups = (p) => { powerups = p.powerups; activePowerup = p.activePowerup; powerupScore = p.powerupScore; };
```

- [ ] **Step 2: Add power-up earning logic**

In `Input.onPieceDrop`, after `Score.addPlacement(scoreState, piece.cells.length);`, add:

```javascript
        // Check power-up earning
        powerupScore += pts;
        while (powerupScore >= POWERUP_COST && powerups.length < 3) {
            const types = ['bom', 'doimau', 'xoay', 'phahang', 'hoandoi', 'ghost'];
            const newPU = types[Math.floor(Math.random() * types.length)];
            powerups.push({ type: newPU });
            powerupScore -= POWERUP_COST;
            Game.spawnFloatText('POWER-UP!', R.bx + (GSIZ*CELL)/2, R.by - 20, '#b197fc');
            Audio.playCombo(2);
        }
```

- [ ] **Step 3: Implement powerups.js**

Replace the placeholder `powerups.js` with the full implementation:

```javascript
// powerups.js — Power-up system
(function() {
'use strict';

const { R, Board, CPAL, CELL, GSIZ, Audio, Pieces, spawnParticles, spawnPlaceEffect, spawnFloatText, spawnLineExplosion, Input, ST } = Game;

const PU_NAMES = {
    bom: 'BOM', doimau: 'MAU', xoay: 'XOAY',
    phahang: 'PHA', hoandoi: 'DOI', ghost: 'MA'
};
const PU_COLORS = {
    bom: '#ff4444', doimau: '#ffcc00', xoay: '#74c0fc',
    phahang: '#ff8822', hoandoi: '#44bb44', ghost: '#b197fc'
};

// Draw power-up slots in score panel area
const origDrawScorePanel = R.drawScorePanel.bind(R);
R.drawScorePanel = function(sc, hi, undo, mode) {
    origDrawScorePanel(sc, hi, undo, mode);
    const { powerups, activePowerup } = Game.getPowerups();
    const ctx = this.ctx;
    const px = this.bx + GSIZ * CELL + 20;
    const py = this.by + 200;

    ctx.fillStyle = '#fff'; ctx.font = '7px "Press Start 2P"';
    ctx.fillText('POWER-UP', px, py);

    for (let i = 0; i < 3; i++) {
        const sx = px + i * 44;
        const sy = py + 8;
        const pu = powerups[i];
        const isActive = activePowerup && pu && activePowerup.type === pu.type && activePowerup.slotIndex === i;

        // Slot background
        ctx.fillStyle = isActive ? '#4a4a1a' : '#2a2a4a';
        ctx.fillRect(sx, sy, 40, 40);
        ctx.strokeStyle = isActive ? '#ffcc00' : '#5a5a7a';
        ctx.lineWidth = isActive ? 2 : 1;
        ctx.strokeRect(sx, sy, 40, 40);

        if (pu) {
            // Icon: colored square with letter
            const col = PU_COLORS[pu.type] || '#fff';
            ctx.fillStyle = col;
            ctx.fillRect(sx + 4, sy + 4, 32, 24);
            ctx.fillStyle = '#000';
            ctx.font = '6px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(PU_NAMES[pu.type] || '?', sx + 20, sy + 20);
            ctx.textAlign = 'left';
        }

        // Store hitbox for click detection
        if (!Game._puSlots) Game._puSlots = [];
        Game._puSlots[i] = { x: sx, y: sy, w: 40, h: 40 };
    }
};

// Handle power-up slot clicks
const origOnClick = Input.onClick;
Input.onClick = function(x, y) {
    const gs = Game.getState();
    if (gs.state === ST.PLAY && Game._puSlots) {
        const { powerups, activePowerup } = Game.getPowerups();

        // Check power-up slot clicks
        for (let i = 0; i < 3; i++) {
            const slot = Game._puSlots[i];
            if (!slot) continue;
            if (x >= slot.x && x <= slot.x + slot.w && y >= slot.y && y <= slot.y + slot.h) {
                if (powerups[i]) {
                    if (activePowerup && activePowerup.slotIndex === i) {
                        // Deactivate
                        Game.setPowerups({ powerups, activePowerup: null, powerupScore: Game.getPowerups().powerupScore });
                    } else {
                        // Activate
                        Game.setPowerups({ powerups, activePowerup: { type: powerups[i].type, slotIndex: i, step: 0 }, powerupScore: Game.getPowerups().powerupScore });
                    }
                    Audio.playClick();
                    return;
                }
            }
        }

        // Check board clicks for active power-ups
        if (activePowerup) {
            const gridPos = R.screenToGrid(x, y);
            if (gridPos) {
                executeBoardPowerup(activePowerup, gridPos.row, gridPos.col);
                return;
            }

            // Check spawn piece clicks for piece-targeting power-ups
            const spawnSlot = R.getSpawnSlot(x, y);
            if (spawnSlot >= 0) {
                executePiecePowerup(activePowerup, spawnSlot);
                return;
            }
        }
    }

    // Fall through to original handler
    origOnClick.call(Input, x, y);
};

function consumePowerup() {
    const { powerups, activePowerup, powerupScore } = Game.getPowerups();
    if (activePowerup) {
        powerups.splice(activePowerup.slotIndex, 1);
        Game.setPowerups({ powerups, activePowerup: null, powerupScore });
    }
}

function executeBoardPowerup(pu, row, col) {
    const gs = Game.getState();
    const board = gs.board;

    if (pu.type === 'bom') {
        // Clear 3x3 area
        const cleared = [];
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const r = row + dr, c = col + dc;
                if (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] !== 0) {
                    cleared.push({ r, c, color: board[r][c] });
                    board[r][c] = 0;
                }
            }
        }
        if (cleared.length > 0) {
            spawnLineExplosion([], [], cleared);
            R.shake(6);
            playPowerupSfx('bom');
        }
        consumePowerup();
    } else if (pu.type === 'phahang') {
        // Clear entire row or column (whichever is closer to center of cell)
        const cleared = [];
        // Clear the row
        for (let c = 0; c < 8; c++) {
            if (board[row][c] !== 0) {
                cleared.push({ r: row, c, color: board[row][c] });
                board[row][c] = 0;
            }
        }
        // Also clear the column
        for (let r = 0; r < 8; r++) {
            if (board[r][col] !== 0) {
                cleared.push({ r, c: col, color: board[r][col] });
                board[r][col] = 0;
            }
        }
        if (cleared.length > 0) {
            spawnLineExplosion([row], [col], cleared);
            R.shake(8);
            playPowerupSfx('phahang');
        }
        consumePowerup();
    }
}

function executePiecePowerup(pu, slotIndex) {
    const gs = Game.getState();
    const pieces = gs.pieces;
    const piece = pieces[slotIndex];

    if (!piece) return;

    if (pu.type === 'doimau') {
        // Change to random different color
        let newColor = piece.color;
        while (newColor === piece.color) newColor = Math.floor(Math.random() * 7) + 1;
        piece.color = newColor;
        Game.setState({ pieces });
        spawnPlaceEffect(piece.cells.map(([r,c]) => [r, c]), newColor);
        playPowerupSfx('doimau');
        consumePowerup();
    } else if (pu.type === 'xoay') {
        // Rotate 90 degrees clockwise: [r, c] -> [c, -r] normalized
        const rotated = piece.cells.map(([r, c]) => [c, -r]);
        const minR = Math.min(...rotated.map(([r]) => r));
        const minC = Math.min(...rotated.map(([, c]) => c));
        piece.cells = rotated.map(([r, c]) => [r - minR, c - minC]);
        Game.setState({ pieces });
        playPowerupSfx('xoay');
        consumePowerup();
    } else if (pu.type === 'hoandoi') {
        // Two-step: first click selects, second click swaps
        if (pu.step === 0) {
            const puState = Game.getPowerups();
            puState.activePowerup.step = 1;
            puState.activePowerup.firstSlot = slotIndex;
            Game.setPowerups(puState);
            spawnFloatText('CHON MIENG 2', R.bx + (GSIZ*CELL)/2, R.by - 20, '#44bb44');
        } else if (pu.step === 1 && slotIndex !== pu.firstSlot) {
            const other = pieces[pu.firstSlot];
            if (other) {
                pieces[pu.firstSlot] = piece;
                pieces[slotIndex] = other;
                Game.setState({ pieces });
                playPowerupSfx('hoandoi');
                consumePowerup();
            }
        }
    }
}

// Ghost power-up: modify canPlace temporarily
const origCanPlace = Board.canPlace;
Game._ghostActive = false;

Game.activateGhost = function() {
    const puState = Game.getPowerups();
    Game._ghostActive = true;
    consumePowerup();
    spawnFloatText('GHOST!', R.bx + (GSIZ*CELL)/2, R.by + (GSIZ*CELL)/2, '#b197fc');
    playPowerupSfx('ghost');
};

// Override Board.canPlace when ghost is active
Board.canPlace = function(b, piece, row, col) {
    if (Game._ghostActive) {
        // Only check bounds, ignore existing blocks
        for (const [dr, dc] of piece.cells) {
            const r = row + dr, c = col + dc;
            if (r < 0 || r >= 8 || c < 0 || c >= 8) return false;
        }
        return true;
    }
    return origCanPlace.call(Board, b, piece, row, col);
};

// Override Board.place when ghost is active: only fill empty cells
const origPlace = Board.place;
Board.place = function(b, piece, row, col) {
    if (Game._ghostActive) {
        for (const [dr, dc] of piece.cells) {
            const r = row + dr, c = col + dc;
            if (b[r][c] === 0) b[r][c] = piece.color;
        }
        Game._ghostActive = false;
        return;
    }
    origPlace.call(Board, b, piece, row, col);
};

// Ghost activation on slot click
const prevSlotClick = Input.onClick;
// Ghost is activated when its power-up is clicked, then next piece drop uses ghost mode
// We handle it by checking in the slot click — if ghost is active powerup, activate immediately

function playPowerupSfx(type) {
    const freqs = {
        bom: [200, 150, 100], doimau: [400, 600, 800], xoay: [300, 500, 300],
        phahang: [500, 400, 300, 200], hoandoi: [400, 500, 400], ghost: [800, 600, 400]
    };
    const f = freqs[type] || [400];
    if (!Audio.sfxEnabled) return;
    f.forEach((freq, i) => setTimeout(() => {
        try {
            const ctx = Game._audioCtx || (window.AudioContext ? new AudioContext() : null);
            if (!ctx) return;
            Game._audioCtx = ctx;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = type === 'ghost' ? 'sine' : 'square';
            osc.frequency.value = freq;
            g.gain.setValueAtTime(0.15, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            osc.connect(g);
            g.connect(ctx.destination);
            osc.start(); osc.stop(ctx.currentTime + 0.1);
        } catch(e) {}
    }, i * 60));
}

// ESC to cancel active powerup
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const puState = Game.getPowerups();
        if (puState.activePowerup) {
            Game.setPowerups({ ...puState, activePowerup: null });
        }
    }
});

})();
```

- [ ] **Step 4: Handle ghost activation in power-up slot click**

In powerups.js, in the slot click section, add ghost special case. When ghost power-up is activated, immediately enable ghost mode for next placement:

Replace the activation block in the slot click handler:

```javascript
                    if (activePowerup && activePowerup.slotIndex === i) {
                        // Deactivate
                        Game.setPowerups({ powerups, activePowerup: null, powerupScore: Game.getPowerups().powerupScore });
                    } else if (powerups[i].type === 'ghost') {
                        // Ghost activates immediately
                        Game.setPowerups({ powerups, activePowerup: { type: 'ghost', slotIndex: i, step: 0 }, powerupScore: Game.getPowerups().powerupScore });
                        Game.activateGhost();
                    } else {
                        // Activate
                        Game.setPowerups({ powerups, activePowerup: { type: powerups[i].type, slotIndex: i, step: 0 }, powerupScore: Game.getPowerups().powerupScore });
                    }
```

- [ ] **Step 5: Test power-ups**

Open game in browser. To test quickly, temporarily change `POWERUP_COST` to 30:
1. Place a few pieces — see "POWER-UP!" popup, slot fills
2. Click BOM slot → click on board → 3x3 area explodes
3. Click DOI MAU slot → click a spawn piece → color changes
4. Click XOAY slot → click a spawn piece → piece rotates
5. Click PHA HANG slot → click on board → row+col clears
6. Click HOAN DOI slot → click piece 1 → click piece 2 → they swap
7. Click GHOST slot → ghost activates → next drop ignores collisions
8. Press ESC while power-up active → cancels

Restore `POWERUP_COST` to 300 after testing.

- [ ] **Step 6: Commit**

```bash
git add game.js powerups.js
git commit -m "feat: add 6 power-ups system (bom, doimau, xoay, phahang, hoandoi, ghost)"
```

---

### Task 6: Themes System

**Files:**
- Modify: `themes.js` — Full theme definitions and rendering overrides
- Modify: `game.js` — Minor hooks for theme loading

- [ ] **Step 1: Implement themes.js**

Replace the placeholder `themes.js` with:

```javascript
// themes.js — Theme system
(function() {
'use strict';

const { R, Storage } = Game;
const CELL = Game.CELL, GSIZ = Game.GSIZ;

const THEMES = {
    default: {
        name: 'MAC DINH',
        bgColor: '#1a1a2e', gridBg: '#2a2a4a', gridLine: '#3a3a5a',
        cellStyle: 'square',
        palette: {
            1: { light: '#ff6b6b', base: '#ee4444', dark: '#bb2222' },
            2: { light: '#ffa94d', base: '#ff8822', dark: '#cc6600' },
            3: { light: '#ffe066', base: '#ffcc00', dark: '#cc9900' },
            4: { light: '#69db7c', base: '#44bb44', dark: '#228822' },
            5: { light: '#74c0fc', base: '#4488ee', dark: '#2266bb' },
            6: { light: '#b197fc', base: '#8844ee', dark: '#6622bb' },
            7: { light: '#faa2c1', base: '#ee4488', dark: '#bb2266' },
        },
        bgEffect: null,
        particleStyle: 'square',
    },
    retro: {
        name: 'RETRO XANH',
        bgColor: '#0a1a0a', gridBg: '#0a2a0a', gridLine: '#1a3a1a',
        cellStyle: 'square',
        palette: {
            1: { light: '#88cc88', base: '#66aa66', dark: '#448844' },
            2: { light: '#77bb77', base: '#559955', dark: '#337733' },
            3: { light: '#99dd99', base: '#77bb77', dark: '#559955' },
            4: { light: '#aaeebb', base: '#88cc99', dark: '#66aa77' },
            5: { light: '#66aa88', base: '#449966', dark: '#227744' },
            6: { light: '#bbffbb', base: '#99dd99', dark: '#77bb77' },
            7: { light: '#55aa55', base: '#338833', dark: '#226622' },
        },
        bgEffect: null,
        particleStyle: 'square',
    },
    sunset: {
        name: 'HOANG HON',
        bgColor: '#2a1a0e', gridBg: '#3a2a1e', gridLine: '#4a3a2e',
        cellStyle: 'rounded',
        palette: {
            1: { light: '#ff8866', base: '#ee5533', dark: '#bb3311' },
            2: { light: '#ffaa44', base: '#ee8822', dark: '#cc6600' },
            3: { light: '#ffdd66', base: '#eebb33', dark: '#cc9911' },
            4: { light: '#ff7788', base: '#ee4466', dark: '#cc2244' },
            5: { light: '#ffcc88', base: '#eeaa55', dark: '#cc8833' },
            6: { light: '#ff99aa', base: '#ee6688', dark: '#cc4466' },
            7: { light: '#ffbb77', base: '#ee9944', dark: '#cc7722' },
        },
        bgEffect: null,
        particleStyle: 'circle',
    },
    galaxy: {
        name: 'GALAXY',
        bgColor: '#0a0a2e', gridBg: '#1a1a3e', gridLine: '#2a2a4e',
        cellStyle: 'diamond',
        palette: {
            1: { light: '#ff5577', base: '#ff2255', dark: '#cc0033' },
            2: { light: '#ffaa22', base: '#ff8800', dark: '#cc6600' },
            3: { light: '#ffff44', base: '#ffee00', dark: '#ccbb00' },
            4: { light: '#44ff88', base: '#22ee55', dark: '#00cc33' },
            5: { light: '#44ddff', base: '#22bbee', dark: '#0099cc' },
            6: { light: '#cc66ff', base: '#aa44ee', dark: '#8822cc' },
            7: { light: '#ff66cc', base: '#ee44aa', dark: '#cc2288' },
        },
        bgEffect: 'stars',
        particleStyle: 'circle',
    },
};

// Star field for galaxy theme
let stars = [];
function initStars() {
    stars = [];
    for (let i = 0; i < 80; i++) {
        stars.push({
            x: Math.random() * R.cw,
            y: Math.random() * R.ch,
            size: 1 + Math.random() * 2,
            twinkle: Math.random() * Math.PI * 2,
            speed: 0.5 + Math.random() * 2,
        });
    }
}
initStars();

function getTheme() {
    const s = Storage.getSettings();
    return THEMES[s.theme || 'default'] || THEMES.default;
}

// Override R.clear to use theme background
const origClear = R.clear.bind(R);
R.clear = function() {
    const t = getTheme();
    this.ctx.fillStyle = t.bgColor;
    this.ctx.fillRect(0, 0, this.cw, this.ch);

    // Stars effect for galaxy
    if (t.bgEffect === 'stars') {
        const ctx = this.ctx;
        const time = Date.now() / 1000;
        for (const star of stars) {
            star.twinkle += 0.02;
            const alpha = 0.3 + Math.sin(star.twinkle * star.speed) * 0.4;
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(star.x, star.y, star.size, star.size);
        }
        ctx.globalAlpha = 1;
    }
};

// Override R.drawGrid to use theme colors
const origDrawGrid = R.drawGrid.bind(R);
R.drawGrid = function(board) {
    const t = getTheme();
    const ctx = this.ctx;
    const bx = this.bx + this.shakeX, by = this.by + this.shakeY;

    ctx.fillStyle = t.gridBg;
    ctx.fillRect(bx, by, GSIZ * CELL, GSIZ * CELL);

    ctx.strokeStyle = t.gridLine;
    ctx.lineWidth = 1;
    for (let i = 0; i <= GSIZ; i++) {
        ctx.beginPath(); ctx.moveTo(bx + i * CELL, by); ctx.lineTo(bx + i * CELL, by + GSIZ * CELL); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx, by + i * CELL); ctx.lineTo(bx + GSIZ * CELL, by + i * CELL); ctx.stroke();
    }

    for (let r = 0; r < GSIZ; r++) {
        for (let c = 0; c < GSIZ; c++) {
            if (board[r][c] !== 0) {
                this.drawCell(bx + c * CELL, by + r * CELL, board[r][c]);
            }
        }
    }
};

// Override R.drawCell to use theme palette and cell style
const origDrawCell = R.drawCell.bind(R);
R.drawCell = function(x, y, cid, glow) {
    const t = getTheme();
    const ctx = this.ctx;
    const p = t.palette[cid] || THEMES.default.palette[cid];
    const s = CELL;

    if (glow) { ctx.shadowColor = p.light; ctx.shadowBlur = 12; }

    if (t.cellStyle === 'rounded') {
        const r = 4;
        ctx.fillStyle = p.base;
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, s - 2, s - 2, r);
        ctx.fill();
        // Highlight top-left
        ctx.fillStyle = p.light;
        ctx.beginPath(); ctx.roundRect(x + 1, y + 1, s - 2, 3, [r, r, 0, 0]); ctx.fill();
        // Shadow bottom-right
        ctx.fillStyle = p.dark;
        ctx.beginPath(); ctx.roundRect(x + 1, y + s - 4, s - 2, 3, [0, 0, r, r]); ctx.fill();
        // Specular
        ctx.fillStyle = '#ffffff44'; ctx.fillRect(x + 6, y + 6, 4, 4);
    } else if (t.cellStyle === 'diamond') {
        const cx = x + s / 2, cy = y + s / 2;
        const half = s / 2 - 2;
        ctx.fillStyle = p.base;
        ctx.beginPath();
        ctx.moveTo(cx, cy - half); ctx.lineTo(cx + half, cy); ctx.lineTo(cx, cy + half); ctx.lineTo(cx - half, cy);
        ctx.closePath(); ctx.fill();
        // Highlight
        ctx.fillStyle = p.light;
        ctx.beginPath();
        ctx.moveTo(cx, cy - half); ctx.lineTo(cx + half, cy); ctx.lineTo(cx, cy - half + 4); ctx.lineTo(cx - half + 4, cy - 2);
        ctx.closePath(); ctx.fill();
        // Shadow
        ctx.fillStyle = p.dark;
        ctx.beginPath();
        ctx.moveTo(cx, cy + half); ctx.lineTo(cx - half, cy); ctx.lineTo(cx, cy + half - 4); ctx.lineTo(cx + half - 4, cy + 2);
        ctx.closePath(); ctx.fill();
        // Specular
        ctx.fillStyle = '#ffffff44'; ctx.fillRect(cx - 2, cy - 4, 3, 3);
    } else {
        // Default square (same as original)
        ctx.fillStyle = p.base; ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
        ctx.fillStyle = p.light; ctx.fillRect(x + 1, y + 1, s - 2, 3); ctx.fillRect(x + 1, y + 1, 3, s - 2);
        ctx.fillStyle = p.dark; ctx.fillRect(x + 1, y + s - 4, s - 2, 3); ctx.fillRect(x + s - 4, y + 1, 3, s - 2);
        ctx.fillStyle = '#ffffff44'; ctx.fillRect(x + 4, y + 4, 4, 4);
    }

    if (glow) { ctx.shadowBlur = 0; }
};

// Expose theme getter
Game.getTheme = getTheme;
Game.THEMES = THEMES;

})();
```

- [ ] **Step 2: Update body CSS background to match theme**

In game.js, at the start of the game loop, after `R.updateShake(dt)`, add:

```javascript
    // Update body background to match theme
    if (Game.getTheme) {
        document.body.style.background = Game.getTheme().bgColor;
    }
```

- [ ] **Step 3: Update spawn pieces to use theme palette**

In themes.js, override `R.drawSpawnPieces` to use theme palette:

Add at the end of themes.js (before the closing `})()`):

```javascript
// Override spawn piece drawing to use theme palette
const origDrawSpawn = R.drawSpawnPieces.bind(R);
R.drawSpawnPieces = function(pieces, selIdx) {
    const t = getTheme();
    const ctx = this.ctx, bx = this.bx, by = this.sy, sw = 80, sp = 10;
    for (let i = 0; i < pieces.length; i++) {
        const pc = pieces[i]; if (!pc) continue;
        const sx = bx + i * (sw + sp);
        ctx.fillStyle = i === selIdx ? '#4a4a6a' : t.gridBg;
        ctx.strokeStyle = t.gridLine; ctx.lineWidth = 1;
        ctx.fillRect(sx, by, sw, sw); ctx.strokeRect(sx, by, sw, sw);
        let mr = 0, mc = 0;
        for (const [r, c] of pc.cells) { if (r > mr) mr = r; if (c > mc) mc = c; }
        const ox = sx + (sw - (mc+1)*12) / 2, oy = by + (sw - (mr+1)*12) / 2;
        const p = t.palette[pc.color] || THEMES.default.palette[pc.color];
        for (const [r, c] of pc.cells) {
            const cx = ox+c*12, cy = oy+r*12;
            ctx.fillStyle = p.base; ctx.fillRect(cx, cy, 11, 11);
            ctx.fillStyle = p.light; ctx.fillRect(cx, cy, 11, 2); ctx.fillRect(cx, cy, 2, 11);
            ctx.fillStyle = p.dark; ctx.fillRect(cx+9, cy, 2, 11); ctx.fillRect(cx, cy+9, 11, 2);
        }
    }
};
```

- [ ] **Step 4: Test themes**

Open game in browser:
1. Go to CAI DAT → click CHU DE repeatedly
2. Verify each theme changes: background color, grid color, cell shapes
3. Start a game with each theme — blocks render correctly
4. Galaxy theme shows twinkling stars
5. Sunset theme has rounded cells
6. Retro theme is all green shades

- [ ] **Step 5: Commit**

```bash
git add themes.js game.js
git commit -m "feat: add 4 visual themes (default, retro, sunset, galaxy)"
```

---

### Task 7: UI Polish

**Files:**
- Modify: `game.js` — Menu hover, spawn animation, transitions, game over animation, board warning

- [ ] **Step 1: Add UI state variables**

In game.js, near the game state variables, add:

```javascript
let menuHover = -1;
let transitionAlpha = 0; // 0 = no transition, >0 = fading
let prevState = null;
let spawnAnim = 0; // counts up from 0 to 1 for spawn animation
let gameOverAnim = 0; // 0 to 1 for game over cascade
let gameOverPhase = 'cascade'; // 'cascade' or 'text'
```

- [ ] **Step 2: Add spawn animation**

In `spawnNewPieces()`, trigger the animation:

```javascript
function spawnNewPieces() {
    pieces = rng ? Pieces.seededSpawnSet(rng) : Pieces.spawnSet();
    spawnAnim = 0; // reset animation
    autoSave();
}
```

In `R.drawSpawnPieces` (or in the game loop when calling it), add scale animation. In the game loop, just before `R.drawSpawnPieces(...)`, add:

```javascript
            spawnAnim = Math.min(1, spawnAnim + dt * 5); // 0->1 in 0.2s
```

Modify `drawSpawnPieces` to accept and use a scale parameter. In game.js, wrap the call:

```javascript
            // In game loop, PLAY state:
            R.drawSpawnPieces(pieces, Input.dragging ? Input.dragging.pieceIndex : -1, spawnAnim);
```

Update `R.drawSpawnPieces` signature to accept `anim` parameter and apply easeOutBack scale:

In the spawn piece drawing (either in game.js or themes.js override), add at the start of each piece draw:

```javascript
    drawSpawnPieces(pieces, selIdx, anim) {
        // ... existing code, but for each piece i, apply scale:
        const t = anim !== undefined ? anim : 1;
        // Per piece delay: piece 0 at t=0, piece 1 at t=0.1s, piece 2 at t=0.2s
        // ...
```

For simplicity, add animation in the game loop render instead. Before drawing spawn pieces, save/restore context with scale:

```javascript
            if (spawnAnim < 1) {
                const ctx = R.ctx;
                for (let i = 0; i < pieces.length; i++) {
                    if (!pieces[i]) continue;
                    const delay = i * 0.15;
                    const t = Math.max(0, Math.min(1, (spawnAnim - delay) * 5));
                    const scale = t < 1 ? easeOutBack(t) : 1;
                    // Draw individual piece with scale (handled in custom draw)
                }
            }
```

Actually, for simplicity, apply a global scale to the spawn area:

In the game loop PLAY state, replace the spawn draw call with:

```javascript
            spawnAnim = Math.min(1, spawnAnim + dt * 4);
            if (spawnAnim < 1) {
                const ctx = R.ctx;
                ctx.save();
                const scale = easeOutBack(spawnAnim);
                const cx = R.bx + 135, cy = R.sy + 40;
                ctx.translate(cx, cy);
                ctx.scale(scale, scale);
                ctx.translate(-cx, -cy);
                R.drawSpawnPieces(pieces, Input.dragging ? Input.dragging.pieceIndex : -1);
                ctx.restore();
            } else {
                R.drawSpawnPieces(pieces, Input.dragging ? Input.dragging.pieceIndex : -1);
            }
```

Add the easing function near the top of game.js (after constants):

```javascript
function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
```

- [ ] **Step 3: Add screen transitions**

Track state changes and trigger fade. In the game loop, before the switch statement:

```javascript
    // Track state transitions
    if (state !== prevState) {
        transitionAlpha = 1;
        prevState = state;
        if (state === ST.OVER) { gameOverAnim = 0; gameOverPhase = 'cascade'; }
    }
    if (transitionAlpha > 0) transitionAlpha -= dt * 3; // 0.3s fade
```

At the end of each case in the switch (after all drawing), add the fade overlay:

```javascript
    // Draw transition overlay (after switch)
    if (transitionAlpha > 0) {
        R.ctx.fillStyle = '#000000';
        R.ctx.globalAlpha = Math.max(0, transitionAlpha);
        R.ctx.fillRect(0, 0, R.cw, R.ch);
        R.ctx.globalAlpha = 1;
    }
```

- [ ] **Step 4: Add menu hover effect**

In `drawMenu()`, check mouse position against each button and highlight:

In the button loop, replace the background fill:

```javascript
        // Check hover
        const isHover = Input.mouseX >= btn.x && Input.mouseX <= btn.x + btn.w &&
                        Input.mouseY >= btn.y && Input.mouseY <= btn.y + btn.h;

        if (btn.mode === 'continue') {
            ctx.fillStyle = isHover ? '#2a4a2a' : '#1a3a1a';
            // ... rest of continue styling
        } else {
            ctx.fillStyle = isHover ? '#3a3a6a' : '#2a2a4a';
            // ... rest of normal styling
        }
```

- [ ] **Step 5: Add board fill warning**

In the game loop PLAY state, after drawing the grid, add warning effect:

```javascript
            // Board fill warning
            const fillRatio = Board.getOccupiedCount(board) / 64;
            if (fillRatio > 0.7) {
                const warn = Math.sin(Date.now() / 250) > 0;
                if (warn) {
                    const ctx = R.ctx;
                    ctx.strokeStyle = '#ff444488';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(R.bx + R.shakeX, R.by + R.shakeY, GSIZ * CELL, GSIZ * CELL);
                }
            }
```

- [ ] **Step 6: Add game over cascade animation**

Replace the GAMEOVER case in the game loop:

```javascript
        case ST.OVER:
            R.clear();
            gameOverAnim = Math.min(1, gameOverAnim + dt * 1.5);

            // Draw board with cascading gray effect
            const ctx2 = R.ctx;
            const bx = R.bx + R.shakeX, by2 = R.by + R.shakeY;

            // Draw grid background
            ctx2.fillStyle = Game.getTheme ? Game.getTheme().gridBg : '#2a2a4a';
            ctx2.fillRect(bx, by2, GSIZ * CELL, GSIZ * CELL);

            for (let r = 0; r < 8; r++) {
                const rowProgress = Math.max(0, Math.min(1, gameOverAnim * 10 - r * 0.8));
                for (let c = 0; c < 8; c++) {
                    if (board[r][c] !== 0) {
                        if (rowProgress >= 1) {
                            // Gray out
                            const gray = '#555555';
                            ctx2.fillStyle = gray;
                            ctx2.fillRect(bx + c * CELL + 1, by2 + r * CELL + 1, CELL - 2, CELL - 2);
                        } else {
                            R.drawCell(bx + c * CELL, by2 + r * CELL, board[r][c]);
                        }
                    }
                }
            }

            // After cascade completes, show game over text
            if (gameOverAnim > 0.6) {
                const textAlpha = Math.min(1, (gameOverAnim - 0.6) * 2.5);
                ctx2.globalAlpha = textAlpha;
                R.drawGameOver(scoreState.score);
                ctx2.globalAlpha = 1;
            }
            break;
```

- [ ] **Step 7: Test UI polish**

Open game in browser:
1. Menu — hover over buttons, see highlight effect
2. Start game — pieces pop in with bounce animation
3. Fill board >70% — red border flashes
4. Game over — board grays out row by row, then text fades in
5. Navigate between screens — smooth fade transitions

- [ ] **Step 8: Commit**

```bash
git add game.js
git commit -m "feat: UI polish - hover, spawn animation, transitions, game over cascade"
```

---

### Task 8: Deploy to GitHub Pages

**Files:**
- No code changes. Git + GitHub operations only.

- [ ] **Step 1: Verify all files are committed**

```bash
git status
git log --oneline -5
```

Ensure no uncommitted changes.

- [ ] **Step 2: Create GitHub repository**

```bash
gh repo create xep-hinh-pixel --public --source=. --push
```

If `gh` CLI is not available, create the repo manually on github.com, then:

```bash
git remote add origin https://github.com/<username>/xep-hinh-pixel.git
git branch -M main
git push -u origin main
```

- [ ] **Step 3: Enable GitHub Pages**

```bash
gh api repos/<username>/xep-hinh-pixel/pages -X POST -f source.branch=main -f source.path=/
```

Or manually: go to repo Settings → Pages → Source: Deploy from branch → Branch: main, / (root) → Save.

- [ ] **Step 4: Verify deployment**

Wait 1-2 minutes, then visit: `https://<username>.github.io/xep-hinh-pixel/`

Verify:
- Game loads with menu
- Font loads from Google CDN
- Can play a full game
- Themes work
- Power-ups work
- Save/load works
- Sound works (after first click)

- [ ] **Step 5: Commit any final fixes if needed**

```bash
git push
```

---

## Self-Review Checklist

| Spec Requirement | Task |
|---|---|
| Auto-save after placement | Task 2 Step 3 |
| TIEP TUC button | Task 2 Steps 5-6 |
| Clear save on game over | Task 2 Step 4 |
| Daily save separate key | Task 2 Step 1 |
| CSS responsive scaling | Task 3 Step 1 |
| Mobile touch offset | Task 3 Step 2 |
| Fullscreen button | Task 3 Step 3 |
| Settings toggle/range/cycle/confirm | Task 4 Steps 2-5 |
| 6 power-ups | Task 5 Step 3 |
| Power-up earning (300 pts) | Task 5 Step 2 |
| Power-up UI (3 slots) | Task 5 Step 3 |
| 4 themes with palette/cellStyle/bgEffect | Task 6 Step 1 |
| Theme applied to grid/cells/spawn | Task 6 Steps 1-3 |
| Galaxy stars | Task 6 Step 1 |
| Menu hover | Task 7 Step 4 |
| Spawn animation | Task 7 Step 2 |
| Screen transitions | Task 7 Step 3 |
| Board fill warning | Task 7 Step 5 |
| Game over cascade | Task 7 Step 6 |
| GitHub Pages deploy | Task 8 |
