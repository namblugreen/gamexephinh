# Block Blast Pixel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Block Blast clone with pixel art 8-bit style, running in browser with Canvas 2D.

**Architecture:** Vanilla JS with ES Modules. Each module handles one responsibility (board logic, pieces, rendering, input, scoring, audio, game modes, storage). A central game loop in main.js coordinates everything. Canvas 2D for all rendering, Web Audio API for procedural 8-bit sounds.

**Tech Stack:** HTML5 Canvas 2D, Vanilla JavaScript (ES Modules), Web Audio API, LocalStorage, CSS, Google Fonts (Press Start 2P)

---

## File Map

| File | Responsibility |
|------|---------------|
| `index.html` | Entry point, canvas element, loads CSS + JS |
| `css/style.css` | Menu screens, overlays, buttons, layout |
| `js/storage.js` | LocalStorage read/write for scores, settings |
| `js/board.js` | 8x8 grid state, place piece, check/clear full lines |
| `js/pieces.js` | Piece definitions (shapes), random piece spawning, seeded RNG |
| `js/score.js` | Score calculation, combo multiplier, streak tracking |
| `js/renderer.js` | Canvas drawing: grid, pieces, preview, particles, UI text |
| `js/input.js` | Mouse + touch drag-and-drop handling |
| `js/audio.js` | Web Audio API: SFX generation + chiptune music |
| `js/modes.js` | Game mode logic (classic, time attack, daily challenge) |
| `js/main.js` | Game state machine, game loop, undo, pause, menu navigation |
| `tests/test.html` | In-browser test runner for logic modules |
| `tests/test.js` | Test cases for board, pieces, score, storage |

---

## Task 1: Project Scaffold + Test Runner

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `tests/test.html`
- Create: `tests/test.js`

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Block Blast Pixel</title>
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <canvas id="gameCanvas"></canvas>
    <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create css/style.css**

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
}

canvas {
    display: block;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
}
```

- [ ] **Step 3: Create test runner tests/test.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Block Blast Pixel — Tests</title>
    <style>
        body { font-family: 'Courier New', monospace; background: #111; color: #0f0; padding: 20px; }
        .pass { color: #0f0; }
        .fail { color: #f00; font-weight: bold; }
        h2 { color: #ff0; margin-top: 20px; }
    </style>
</head>
<body>
    <h1>Block Blast Pixel — Tests</h1>
    <div id="results"></div>
    <script type="module" src="test.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create test framework in tests/test.js**

```js
const results = document.getElementById('results');
let passed = 0;
let failed = 0;

export function describe(name, fn) {
    const h2 = document.createElement('h2');
    h2.textContent = name;
    results.appendChild(h2);
    fn();
}

export function test(name, fn) {
    const div = document.createElement('div');
    try {
        fn();
        div.className = 'pass';
        div.textContent = `  PASS: ${name}`;
        passed++;
    } catch (e) {
        div.className = 'fail';
        div.textContent = `  FAIL: ${name} — ${e.message}`;
        failed++;
    }
    results.appendChild(div);
}

export function assert(condition, msg = 'Assertion failed') {
    if (!condition) throw new Error(msg);
}

export function assertEqual(actual, expected, msg) {
    if (actual !== expected) {
        throw new Error(msg || `Expected ${expected}, got ${actual}`);
    }
}

export function assertDeepEqual(actual, expected, msg) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(msg || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}

// Summary at end
window.addEventListener('load', () => {
    setTimeout(() => {
        const summary = document.createElement('h2');
        summary.style.color = failed > 0 ? '#f00' : '#0f0';
        summary.textContent = `Results: ${passed} passed, ${failed} failed`;
        results.appendChild(summary);
    }, 100);
});
```

- [ ] **Step 5: Verify scaffold opens in browser**

Open `index.html` in browser. Expected: dark background (#1a1a2e), blank canvas.
Open `tests/test.html` in browser. Expected: green "Results: 0 passed, 0 failed".

- [ ] **Step 6: Commit**

```bash
git init
git add index.html css/style.css tests/test.html tests/test.js
git commit -m "feat: project scaffold with index.html, CSS, and test runner"
```

---

## Task 2: Storage Module

**Files:**
- Create: `js/storage.js`
- Modify: `tests/test.js`

- [ ] **Step 1: Write failing tests for storage**

Add to `tests/test.js`:

```js
import { Storage } from '../js/storage.js';

describe('Storage', () => {
    test('getSettings returns defaults when empty', () => {
        localStorage.clear();
        const s = Storage.getSettings();
        assertEqual(s.sfxEnabled, true);
        assertEqual(s.musicEnabled, true);
        assertEqual(s.sfxVolume, 0.7);
        assertEqual(s.musicVolume, 0.5);
    });

    test('saveSettings and getSettings round-trip', () => {
        localStorage.clear();
        const settings = { sfxEnabled: false, musicEnabled: true, sfxVolume: 0.3, musicVolume: 0.8 };
        Storage.saveSettings(settings);
        const loaded = Storage.getSettings();
        assertEqual(loaded.sfxEnabled, false);
        assertEqual(loaded.sfxVolume, 0.3);
    });

    test('getLeaderboard returns empty array when no scores', () => {
        localStorage.clear();
        const lb = Storage.getLeaderboard('classic');
        assertDeepEqual(lb, []);
    });

    test('addScore inserts and sorts top 10', () => {
        localStorage.clear();
        Storage.addScore('classic', 'AAA', 500);
        Storage.addScore('classic', 'BBB', 1000);
        Storage.addScore('classic', 'CCC', 200);
        const lb = Storage.getLeaderboard('classic');
        assertEqual(lb.length, 3);
        assertEqual(lb[0].name, 'BBB');
        assertEqual(lb[0].score, 1000);
        assertEqual(lb[2].name, 'CCC');
    });

    test('addScore caps at 10 entries', () => {
        localStorage.clear();
        for (let i = 0; i < 12; i++) {
            Storage.addScore('classic', `P${i}`, i * 100);
        }
        const lb = Storage.getLeaderboard('classic');
        assertEqual(lb.length, 10);
        assertEqual(lb[0].score, 1100);
    });

    test('isTopScore returns true when score qualifies', () => {
        localStorage.clear();
        assert(Storage.isTopScore('classic', 100));
    });

    test('getDailyStatus returns null when not played', () => {
        localStorage.clear();
        assertEqual(Storage.getDailyStatus('2026-04-06'), null);
    });

    test('saveDailyResult and getDailyStatus round-trip', () => {
        localStorage.clear();
        Storage.saveDailyResult('2026-04-06', 5000);
        const result = Storage.getDailyStatus('2026-04-06');
        assertEqual(result, 5000);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Open `tests/test.html` in browser. Expected: all Storage tests FAIL (module not found).

- [ ] **Step 3: Implement js/storage.js**

```js
const KEYS = {
    settings: 'bbp_settings',
    leaderboard: (mode) => `bbp_leaderboard_${mode}`,
    daily: (date) => `bbp_daily_${date}`,
};

const DEFAULT_SETTINGS = {
    sfxEnabled: true,
    musicEnabled: true,
    sfxVolume: 0.7,
    musicVolume: 0.5,
};

export const Storage = {
    getSettings() {
        const raw = localStorage.getItem(KEYS.settings);
        if (!raw) return { ...DEFAULT_SETTINGS };
        return JSON.parse(raw);
    },

    saveSettings(settings) {
        localStorage.setItem(KEYS.settings, JSON.stringify(settings));
    },

    getLeaderboard(mode) {
        const raw = localStorage.getItem(KEYS.leaderboard(mode));
        if (!raw) return [];
        return JSON.parse(raw);
    },

    addScore(mode, name, score) {
        const lb = this.getLeaderboard(mode);
        lb.push({ name, score, date: new Date().toISOString() });
        lb.sort((a, b) => b.score - a.score);
        const top10 = lb.slice(0, 10);
        localStorage.setItem(KEYS.leaderboard(mode), JSON.stringify(top10));
        return top10;
    },

    isTopScore(mode, score) {
        const lb = this.getLeaderboard(mode);
        if (lb.length < 10) return true;
        return score > lb[lb.length - 1].score;
    },

    getDailyStatus(dateStr) {
        const raw = localStorage.getItem(KEYS.daily(dateStr));
        if (!raw) return null;
        return JSON.parse(raw);
    },

    saveDailyResult(dateStr, score) {
        localStorage.setItem(KEYS.daily(dateStr), JSON.stringify(score));
    },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Open `tests/test.html` in browser. Expected: all Storage tests PASS.

- [ ] **Step 5: Commit**

```bash
git add js/storage.js tests/test.js
git commit -m "feat: storage module with settings, leaderboard, and daily challenge persistence"
```

---

## Task 3: Board Module

**Files:**
- Create: `js/board.js`
- Modify: `tests/test.js`

- [ ] **Step 1: Write failing tests for board**

Add to `tests/test.js`:

```js
import { Board } from '../js/board.js';

describe('Board', () => {
    test('createBoard returns 8x8 grid of zeros', () => {
        const board = Board.create();
        assertEqual(board.length, 8);
        assertEqual(board[0].length, 8);
        assertEqual(board[3][5], 0);
    });

    test('canPlace returns true for valid placement', () => {
        const board = Board.create();
        const piece = { cells: [[0, 0], [0, 1], [1, 0]] };
        assert(Board.canPlace(board, piece, 0, 0));
    });

    test('canPlace returns false when out of bounds', () => {
        const board = Board.create();
        const piece = { cells: [[0, 0], [0, 1], [0, 2]] };
        assert(!Board.canPlace(board, piece, 0, 6));
    });

    test('canPlace returns false when cell occupied', () => {
        const board = Board.create();
        board[0][0] = 1;
        const piece = { cells: [[0, 0]] };
        assert(!Board.canPlace(board, piece, 0, 0));
    });

    test('place sets cells to piece color', () => {
        const board = Board.create();
        const piece = { cells: [[0, 0], [0, 1]], color: 3 };
        Board.place(board, piece, 2, 3);
        assertEqual(board[2][3], 3);
        assertEqual(board[2][4], 3);
    });

    test('checkAndClearLines clears full row', () => {
        const board = Board.create();
        for (let c = 0; c < 8; c++) board[0][c] = 1;
        const cleared = Board.checkAndClearLines(board);
        assertEqual(cleared.rows.length, 1);
        assertEqual(cleared.cols.length, 0);
        assertEqual(cleared.totalLines, 1);
        assertEqual(board[0][0], 0);
    });

    test('checkAndClearLines clears full column', () => {
        const board = Board.create();
        for (let r = 0; r < 8; r++) board[r][3] = 2;
        const cleared = Board.checkAndClearLines(board);
        assertEqual(cleared.rows.length, 0);
        assertEqual(cleared.cols.length, 1);
        assertEqual(cleared.totalLines, 1);
        assertEqual(board[0][3], 0);
    });

    test('checkAndClearLines clears row and col simultaneously', () => {
        const board = Board.create();
        for (let c = 0; c < 8; c++) board[2][c] = 1;
        for (let r = 0; r < 8; r++) board[r][5] = 2;
        const cleared = Board.checkAndClearLines(board);
        assertEqual(cleared.totalLines, 2);
    });

    test('canPlaceAny returns true when piece fits somewhere', () => {
        const board = Board.create();
        const piece = { cells: [[0, 0]] };
        assert(Board.canPlaceAny(board, piece));
    });

    test('canPlaceAny returns false when board full', () => {
        const board = Board.create();
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++)
                board[r][c] = 1;
        const piece = { cells: [[0, 0]] };
        assert(!Board.canPlaceAny(board, piece));
    });

    test('clone creates independent copy', () => {
        const board = Board.create();
        board[0][0] = 5;
        const copy = Board.clone(board);
        copy[0][0] = 0;
        assertEqual(board[0][0], 5);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Open `tests/test.html`. Expected: all Board tests FAIL.

- [ ] **Step 3: Implement js/board.js**

```js
export const Board = {
    SIZE: 8,

    create() {
        return Array.from({ length: 8 }, () => Array(8).fill(0));
    },

    clone(board) {
        return board.map(row => [...row]);
    },

    canPlace(board, piece, row, col) {
        for (const [dr, dc] of piece.cells) {
            const r = row + dr;
            const c = col + dc;
            if (r < 0 || r >= 8 || c < 0 || c >= 8) return false;
            if (board[r][c] !== 0) return false;
        }
        return true;
    },

    place(board, piece, row, col) {
        for (const [dr, dc] of piece.cells) {
            board[row + dr][col + dc] = piece.color;
        }
    },

    checkAndClearLines(board) {
        const rows = [];
        const cols = [];

        for (let r = 0; r < 8; r++) {
            if (board[r].every(cell => cell !== 0)) rows.push(r);
        }
        for (let c = 0; c < 8; c++) {
            let full = true;
            for (let r = 0; r < 8; r++) {
                if (board[r][c] === 0) { full = false; break; }
            }
            if (full) cols.push(c);
        }

        const cellsCleared = new Set();
        for (const r of rows) {
            for (let c = 0; c < 8; c++) cellsCleared.add(`${r},${c}`);
        }
        for (const c of cols) {
            for (let r = 0; r < 8; r++) cellsCleared.add(`${r},${c}`);
        }

        for (const key of cellsCleared) {
            const [r, c] = key.split(',').map(Number);
            board[r][c] = 0;
        }

        return {
            rows,
            cols,
            totalLines: rows.length + cols.length,
            cellsCleared: [...cellsCleared].map(k => k.split(',').map(Number)),
        };
    },

    canPlaceAny(board, piece) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.canPlace(board, piece, r, c)) return true;
            }
        }
        return false;
    },

    getOccupiedCount(board) {
        let count = 0;
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++)
                if (board[r][c] !== 0) count++;
        return count;
    },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Open `tests/test.html`. Expected: all Board tests PASS.

- [ ] **Step 5: Commit**

```bash
git add js/board.js tests/test.js
git commit -m "feat: board module with place, clear lines, and validation logic"
```

---

## Task 4: Pieces Module

**Files:**
- Create: `js/pieces.js`
- Modify: `tests/test.js`

- [ ] **Step 1: Write failing tests for pieces**

Add to `tests/test.js`:

```js
import { Pieces } from '../js/pieces.js';

describe('Pieces', () => {
    test('SHAPES has at least 15 definitions', () => {
        assert(Pieces.SHAPES.length >= 15, `Only ${Pieces.SHAPES.length} shapes defined`);
    });

    test('each shape has cells array with at least 1 cell', () => {
        for (const shape of Pieces.SHAPES) {
            assert(Array.isArray(shape.cells), `Shape ${shape.name} missing cells`);
            assert(shape.cells.length >= 1, `Shape ${shape.name} has no cells`);
        }
    });

    test('each cell is [row, col] with non-negative integers', () => {
        for (const shape of Pieces.SHAPES) {
            for (const [r, c] of shape.cells) {
                assert(Number.isInteger(r) && r >= 0, `Bad row in ${shape.name}`);
                assert(Number.isInteger(c) && c >= 0, `Bad col in ${shape.name}`);
            }
        }
    });

    test('randomPiece returns a piece with color 1-7', () => {
        const piece = Pieces.randomPiece();
        assert(piece.color >= 1 && piece.color <= 7, `Color ${piece.color} out of range`);
        assert(piece.cells.length >= 1);
    });

    test('spawnSet returns 3 pieces', () => {
        const set = Pieces.spawnSet();
        assertEqual(set.length, 3);
    });

    test('seededRandom produces deterministic sequence', () => {
        const rng1 = Pieces.createSeededRng(12345);
        const rng2 = Pieces.createSeededRng(12345);
        const a = [rng1(), rng1(), rng1()];
        const b = [rng2(), rng2(), rng2()];
        assertDeepEqual(a, b);
    });

    test('seededSpawnSet with same seed gives same pieces', () => {
        const set1 = Pieces.seededSpawnSet(Pieces.createSeededRng(99));
        const rng2 = Pieces.createSeededRng(99);
        const set2 = Pieces.seededSpawnSet(rng2);
        assertEqual(set1[0].name, set2[0].name);
        assertEqual(set1[1].name, set2[1].name);
        assertEqual(set1[2].name, set2[2].name);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Open `tests/test.html`. Expected: all Pieces tests FAIL.

- [ ] **Step 3: Implement js/pieces.js**

```js
export const Pieces = {
    SHAPES: [
        { name: '1x1', cells: [[0, 0]] },
        { name: '1x2', cells: [[0, 0], [0, 1]] },
        { name: '1x3', cells: [[0, 0], [0, 1], [0, 2]] },
        { name: '1x4', cells: [[0, 0], [0, 1], [0, 2], [0, 3]] },
        { name: '1x5', cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
        { name: '2x1', cells: [[0, 0], [1, 0]] },
        { name: '3x1', cells: [[0, 0], [1, 0], [2, 0]] },
        { name: '4x1', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
        { name: '5x1', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
        { name: '2x2', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
        { name: '3x3', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]] },
        { name: 'L1', cells: [[0, 0], [1, 0], [1, 1]] },
        { name: 'L2', cells: [[0, 0], [0, 1], [1, 0]] },
        { name: 'L3', cells: [[0, 0], [0, 1], [1, 1]] },
        { name: 'L4', cells: [[0, 1], [1, 0], [1, 1]] },
        { name: 'bigL1', cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]] },
        { name: 'bigL2', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]] },
        { name: 'bigL3', cells: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]] },
        { name: 'bigL4', cells: [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]] },
        { name: 'T', cells: [[0, 0], [0, 1], [0, 2], [1, 1]] },
        { name: 'S', cells: [[0, 1], [0, 2], [1, 0], [1, 1]] },
        { name: 'Z', cells: [[0, 0], [0, 1], [1, 1], [1, 2]] },
    ],

    COLORS: 7,

    randomPiece() {
        const shape = this.SHAPES[Math.floor(Math.random() * this.SHAPES.length)];
        const color = Math.floor(Math.random() * this.COLORS) + 1;
        return { ...shape, color };
    },

    spawnSet() {
        return [this.randomPiece(), this.randomPiece(), this.randomPiece()];
    },

    createSeededRng(seed) {
        let s = seed;
        return () => {
            s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
            return (s >>> 0) / 0xFFFFFFFF;
        };
    },

    seededRandomPiece(rng) {
        const shape = this.SHAPES[Math.floor(rng() * this.SHAPES.length)];
        const color = Math.floor(rng() * this.COLORS) + 1;
        return { ...shape, color };
    },

    seededSpawnSet(rng) {
        return [this.seededRandomPiece(rng), this.seededRandomPiece(rng), this.seededRandomPiece(rng)];
    },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Open `tests/test.html`. Expected: all Pieces tests PASS.

- [ ] **Step 5: Commit**

```bash
git add js/pieces.js tests/test.js
git commit -m "feat: pieces module with 22 shapes, random spawn, and seeded RNG"
```

---

## Task 5: Score Module

**Files:**
- Create: `js/score.js`
- Modify: `tests/test.js`

- [ ] **Step 1: Write failing tests for score**

Add to `tests/test.js`:

```js
import { Score } from '../js/score.js';

describe('Score', () => {
    test('create returns initial state', () => {
        const s = Score.create();
        assertEqual(s.score, 0);
        assertEqual(s.streak, 0);
        assertEqual(s.combo, 0);
    });

    test('addPlacement adds 10 per cell', () => {
        const s = Score.create();
        Score.addPlacement(s, 4);
        assertEqual(s.score, 40);
    });

    test('addLineClear with 1 line gives x1 (100)', () => {
        const s = Score.create();
        const result = Score.addLineClear(s, 1);
        assertEqual(s.score, 100);
        assertEqual(result.comboMultiplier, 1);
    });

    test('addLineClear with 2 lines gives x3 (600)', () => {
        const s = Score.create();
        const result = Score.addLineClear(s, 2);
        assertEqual(s.score, 600);
        assertEqual(result.comboMultiplier, 3);
    });

    test('addLineClear with 3 lines gives x5 (1500)', () => {
        const s = Score.create();
        const result = Score.addLineClear(s, 3);
        assertEqual(s.score, 1500);
    });

    test('addLineClear with 4+ lines gives x8', () => {
        const s = Score.create();
        const result = Score.addLineClear(s, 4);
        assertEqual(s.score, 3200);
        assertEqual(result.comboMultiplier, 8);
    });

    test('streak increments on line clear', () => {
        const s = Score.create();
        Score.addLineClear(s, 1);
        assertEqual(s.streak, 1);
        Score.addLineClear(s, 1);
        assertEqual(s.streak, 2);
    });

    test('streak bonus is streak x 50', () => {
        const s = Score.create();
        Score.addLineClear(s, 1); // streak=1, bonus=50
        assertEqual(s.score, 150); // 100 + 50
        Score.addLineClear(s, 1); // streak=2, bonus=100
        assertEqual(s.score, 350); // 150 + 100 + 100
    });

    test('resetStreak sets streak to 0', () => {
        const s = Score.create();
        Score.addLineClear(s, 1);
        Score.resetStreak(s);
        assertEqual(s.streak, 0);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Open `tests/test.html`. Expected: all Score tests FAIL.

- [ ] **Step 3: Implement js/score.js**

```js
const COMBO_MULTIPLIERS = {
    1: 1,
    2: 3,
    3: 5,
};

function getComboMultiplier(lineCount) {
    if (lineCount >= 4) return 8;
    return COMBO_MULTIPLIERS[lineCount] || 0;
}

export const Score = {
    create() {
        return {
            score: 0,
            streak: 0,
            combo: 0,
        };
    },

    addPlacement(state, cellCount) {
        state.score += cellCount * 10;
    },

    addLineClear(state, lineCount) {
        const comboMultiplier = getComboMultiplier(lineCount);
        const lineScore = lineCount * 100 * comboMultiplier;
        state.score += lineScore;

        state.streak += 1;
        const streakBonus = state.streak * 50;
        state.score += streakBonus;

        state.combo = comboMultiplier;

        return { comboMultiplier, lineScore, streakBonus };
    },

    resetStreak(state) {
        state.streak = 0;
        state.combo = 0;
    },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Open `tests/test.html`. Expected: all Score tests PASS.

- [ ] **Step 5: Commit**

```bash
git add js/score.js tests/test.js
git commit -m "feat: score module with combo multiplier and streak system"
```

---

## Task 6: Renderer — Grid and Pixel Art Blocks

**Files:**
- Create: `js/renderer.js`

- [ ] **Step 1: Implement renderer with pixel art drawing**

```js
const CELL_SIZE = 32;
const GRID_SIZE = 8;
const BOARD_PADDING = 20;

const COLOR_PALETTE = {
    1: { light: '#ff6b6b', base: '#ee4444', dark: '#bb2222' },  // Red
    2: { light: '#ffa94d', base: '#ff8822', dark: '#cc6600' },  // Orange
    3: { light: '#ffe066', base: '#ffcc00', dark: '#cc9900' },  // Yellow
    4: { light: '#69db7c', base: '#44bb44', dark: '#228822' },  // Green
    5: { light: '#74c0fc', base: '#4488ee', dark: '#2266bb' },  // Blue
    6: { light: '#b197fc', base: '#8844ee', dark: '#6622bb' },  // Purple
    7: { light: '#faa2c1', base: '#ee4488', dark: '#bb2266' },  // Pink
};

const BG_COLOR = '#1a1a2e';
const GRID_BG = '#2a2a4a';
const GRID_LINE = '#3a3a5a';

export const Renderer = {
    canvas: null,
    ctx: null,
    boardX: 0,
    boardY: 0,
    spawnY: 0,
    canvasWidth: 0,
    canvasHeight: 0,

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
    },

    resize() {
        const boardPx = GRID_SIZE * CELL_SIZE;
        this.canvasWidth = boardPx + BOARD_PADDING * 2 + 200;
        this.canvasHeight = boardPx + BOARD_PADDING * 2 + 160;
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        this.boardX = BOARD_PADDING;
        this.boardY = 50;
        this.spawnY = this.boardY + boardPx + 20;
    },

    clear() {
        this.ctx.fillStyle = BG_COLOR;
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    },

    drawGrid(board) {
        const ctx = this.ctx;
        const bx = this.boardX;
        const by = this.boardY;

        // Grid background
        ctx.fillStyle = GRID_BG;
        ctx.fillRect(bx, by, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);

        // Grid lines
        ctx.strokeStyle = GRID_LINE;
        ctx.lineWidth = 1;
        for (let i = 0; i <= GRID_SIZE; i++) {
            ctx.beginPath();
            ctx.moveTo(bx + i * CELL_SIZE, by);
            ctx.lineTo(bx + i * CELL_SIZE, by + GRID_SIZE * CELL_SIZE);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(bx, by + i * CELL_SIZE);
            ctx.lineTo(bx + GRID_SIZE * CELL_SIZE, by + i * CELL_SIZE);
            ctx.stroke();
        }

        // Filled cells
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (board[r][c] !== 0) {
                    this.drawCell(bx + c * CELL_SIZE, by + r * CELL_SIZE, board[r][c]);
                }
            }
        }
    },

    drawCell(x, y, colorId) {
        const ctx = this.ctx;
        const pal = COLOR_PALETTE[colorId];
        const s = CELL_SIZE;

        // Base color
        ctx.fillStyle = pal.base;
        ctx.fillRect(x + 1, y + 1, s - 2, s - 2);

        // Light edge (top + left) — 3D pixel effect
        ctx.fillStyle = pal.light;
        ctx.fillRect(x + 1, y + 1, s - 2, 3);
        ctx.fillRect(x + 1, y + 1, 3, s - 2);

        // Dark edge (bottom + right)
        ctx.fillStyle = pal.dark;
        ctx.fillRect(x + 1, y + s - 4, s - 2, 3);
        ctx.fillRect(x + s - 4, y + 1, 3, s - 2);

        // Pixel highlight
        ctx.fillStyle = '#ffffff44';
        ctx.fillRect(x + 4, y + 4, 4, 4);
    },

    drawPreview(board, piece, row, col) {
        if (row === null || col === null) return;
        const ctx = this.ctx;
        const bx = this.boardX;
        const by = this.boardY;

        for (const [dr, dc] of piece.cells) {
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const x = bx + c * CELL_SIZE;
                const y2 = by + r * CELL_SIZE;
                const pal = COLOR_PALETTE[piece.color];
                ctx.fillStyle = pal.base + '66';
                ctx.fillRect(x + 1, y2 + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            }
        }
    },

    drawSpawnPieces(pieces, selectedIndex) {
        const ctx = this.ctx;
        const baseX = this.boardX;
        const baseY = this.spawnY;
        const slotWidth = 80;
        const spacing = 10;

        for (let i = 0; i < pieces.length; i++) {
            const piece = pieces[i];
            if (!piece) continue;

            const slotX = baseX + i * (slotWidth + spacing);
            const slotY = baseY;

            // Slot background
            ctx.fillStyle = i === selectedIndex ? '#4a4a6a' : '#2a2a4a';
            ctx.strokeStyle = '#5a5a7a';
            ctx.lineWidth = 1;
            ctx.fillRect(slotX, slotY, slotWidth, slotWidth);
            ctx.strokeRect(slotX, slotY, slotWidth, slotWidth);

            // Calculate piece bounds for centering
            let maxR = 0, maxC = 0;
            for (const [r, c] of piece.cells) {
                if (r > maxR) maxR = r;
                if (c > maxC) maxC = c;
            }
            const pieceW = (maxC + 1) * 12;
            const pieceH = (maxR + 1) * 12;
            const offsetX = slotX + (slotWidth - pieceW) / 2;
            const offsetY = slotY + (slotWidth - pieceH) / 2;

            // Draw mini cells
            const pal = COLOR_PALETTE[piece.color];
            for (const [r, c] of piece.cells) {
                const cx = offsetX + c * 12;
                const cy = offsetY + r * 12;
                ctx.fillStyle = pal.base;
                ctx.fillRect(cx, cy, 11, 11);
                ctx.fillStyle = pal.light;
                ctx.fillRect(cx, cy, 11, 2);
                ctx.fillRect(cx, cy, 2, 11);
                ctx.fillStyle = pal.dark;
                ctx.fillRect(cx, cy + 9, 11, 2);
                ctx.fillRect(cx + 9, cy, 2, 11);
            }
        }
    },

    drawDraggingPiece(piece, mouseX, mouseY) {
        if (!piece) return;
        const ctx = this.ctx;
        for (const [r, c] of piece.cells) {
            this.drawCell(
                mouseX + c * CELL_SIZE - CELL_SIZE / 2,
                mouseY + r * CELL_SIZE - CELL_SIZE,
                piece.color
            );
        }
    },

    drawScorePanel(scoreState, highScore, undosLeft, mode) {
        const ctx = this.ctx;
        const panelX = this.boardX + GRID_SIZE * CELL_SIZE + 20;
        const panelY = this.boardY;

        ctx.fillStyle = '#ffffff';
        ctx.font = '8px "Press Start 2P"';

        ctx.fillText('SCORE', panelX, panelY + 10);
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText(`${scoreState.score}`, panelX, panelY + 30);

        ctx.font = '8px "Press Start 2P"';
        ctx.fillText('HIGH', panelX, panelY + 60);
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText(`${highScore}`, panelX, panelY + 80);

        // Streak meter
        ctx.font = '8px "Press Start 2P"';
        ctx.fillText('STREAK', panelX, panelY + 110);
        const streakBarW = 80;
        const streakBarH = 12;
        ctx.fillStyle = '#2a2a4a';
        ctx.fillRect(panelX, panelY + 120, streakBarW, streakBarH);
        const streakFill = Math.min(scoreState.streak / 10, 1);
        const streakColor = scoreState.streak >= 5 ? '#ff4444' : scoreState.streak >= 3 ? '#ffcc00' : '#44bb44';
        ctx.fillStyle = streakColor;
        ctx.fillRect(panelX, panelY + 120, streakBarW * streakFill, streakBarH);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`x${scoreState.streak}`, panelX + streakBarW + 5, panelY + 130);

        // Undo
        ctx.fillText(`UNDO: ${undosLeft}`, panelX, panelY + 160);

        // Mode
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText(mode.toUpperCase(), panelX, panelY + 190);
    },

    drawComboText(text, alpha) {
        if (alpha <= 0) return;
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffcc00';
        ctx.font = '16px "Press Start 2P"';
        ctx.textAlign = 'center';
        const cx = this.boardX + (GRID_SIZE * CELL_SIZE) / 2;
        const cy = this.boardY + (GRID_SIZE * CELL_SIZE) / 2;
        ctx.fillText(text, cx, cy);
        ctx.restore();
        ctx.textAlign = 'left';
    },

    drawTimer(timeLeft) {
        const ctx = this.ctx;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = Math.floor(timeLeft % 60);
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        ctx.fillStyle = timeLeft < 30 ? '#ff4444' : '#ffffff';
        ctx.font = '12px "Press Start 2P"';
        ctx.textAlign = 'center';
        const cx = this.boardX + (GRID_SIZE * CELL_SIZE) / 2;
        ctx.fillText(timeStr, cx, this.boardY - 10);
        ctx.textAlign = 'left';
    },

    drawPauseOverlay() {
        const ctx = this.ctx;
        ctx.fillStyle = '#000000cc';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', this.canvasWidth / 2, this.canvasHeight / 2 - 10);
        ctx.font = '8px "Press Start 2P"';
        ctx.fillText('Press ESC to resume', this.canvasWidth / 2, this.canvasHeight / 2 + 20);
        ctx.textAlign = 'left';
    },

    drawGameOver(finalScore) {
        const ctx = this.ctx;
        ctx.fillStyle = '#000000cc';
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        ctx.fillStyle = '#ff4444';
        ctx.font = '16px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', this.canvasWidth / 2, this.canvasHeight / 2 - 30);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText(`Score: ${finalScore}`, this.canvasWidth / 2, this.canvasHeight / 2 + 10);
        ctx.font = '8px "Press Start 2P"';
        ctx.fillText('Click to continue', this.canvasWidth / 2, this.canvasHeight / 2 + 40);
        ctx.textAlign = 'left';
    },

    screenToGrid(x, y) {
        const col = Math.floor((x - this.boardX) / CELL_SIZE);
        const row = Math.floor((y - this.boardY) / CELL_SIZE);
        if (row >= 0 && row < 8 && col >= 0 && col < 8) return { row, col };
        return null;
    },

    getSpawnSlot(x, y) {
        const slotWidth = 80;
        const spacing = 10;
        for (let i = 0; i < 3; i++) {
            const slotX = this.boardX + i * (slotWidth + spacing);
            if (x >= slotX && x < slotX + slotWidth &&
                y >= this.spawnY && y < this.spawnY + slotWidth) {
                return i;
            }
        }
        return -1;
    },

    CELL_SIZE,
};
```

- [ ] **Step 2: Verify renderer draws correctly**

Temporarily add to `js/main.js`:

```js
import { Board } from './board.js';
import { Pieces } from './pieces.js';
import { Renderer } from './renderer.js';

const canvas = document.getElementById('gameCanvas');
Renderer.init(canvas);

const board = Board.create();
board[0][0] = 1; board[0][1] = 2; board[1][0] = 3;
const pieces = Pieces.spawnSet();

Renderer.clear();
Renderer.drawGrid(board);
Renderer.drawSpawnPieces(pieces, -1);
Renderer.drawScorePanel({ score: 1234, streak: 3, combo: 0 }, 5000, 3, 'classic');
```

Open `index.html`. Expected: dark background, 8x8 grid with 3 colored cells, 3 piece slots below, score panel on right.

- [ ] **Step 3: Commit**

```bash
git add js/renderer.js js/main.js
git commit -m "feat: renderer with pixel art grid, pieces, score panel, and overlays"
```

---

## Task 7: Input Module — Drag and Drop

**Files:**
- Create: `js/input.js`

- [ ] **Step 1: Implement input handling**

```js
export const Input = {
    dragging: null,         // { pieceIndex, piece }
    mouseX: 0,
    mouseY: 0,
    onPiecePickup: null,    // callback(pieceIndex)
    onPieceDrop: null,      // callback(pieceIndex, gridRow, gridCol)
    onPieceCancel: null,    // callback(pieceIndex)
    onClick: null,          // callback(x, y)

    init(canvas, renderer) {
        this.renderer = renderer;

        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            if (e.touches) {
                return {
                    x: (e.touches[0].clientX - rect.left) * scaleX,
                    y: (e.touches[0].clientY - rect.top) * scaleY,
                };
            }
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY,
            };
        };

        const onStart = (e) => {
            e.preventDefault();
            const pos = getPos(e);
            this.mouseX = pos.x;
            this.mouseY = pos.y;

            const slot = renderer.getSpawnSlot(pos.x, pos.y);
            if (slot >= 0 && this.onPiecePickup) {
                const piece = this.onPiecePickup(slot);
                if (piece) {
                    this.dragging = { pieceIndex: slot, piece };
                }
            }
        };

        const onMove = (e) => {
            e.preventDefault();
            const pos = e.touches
                ? { x: (e.touches[0].clientX - canvas.getBoundingClientRect().left) * (canvas.width / canvas.getBoundingClientRect().width),
                    y: (e.touches[0].clientY - canvas.getBoundingClientRect().top) * (canvas.height / canvas.getBoundingClientRect().height) }
                : getPos(e);
            this.mouseX = pos.x;
            this.mouseY = pos.y;
        };

        const onEnd = (e) => {
            if (this.dragging) {
                const gridPos = renderer.screenToGrid(this.mouseX, this.mouseY);
                if (gridPos && this.onPieceDrop) {
                    // Adjust for piece offset — drop at top-left of piece
                    this.onPieceDrop(this.dragging.pieceIndex, gridPos.row, gridPos.col);
                } else if (this.onPieceCancel) {
                    this.onPieceCancel(this.dragging.pieceIndex);
                }
                this.dragging = null;
            } else if (this.onClick) {
                this.onClick(this.mouseX, this.mouseY);
            }
        };

        // Mouse events
        canvas.addEventListener('mousedown', onStart);
        canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('mouseup', onEnd);

        // Touch events
        canvas.addEventListener('touchstart', onStart, { passive: false });
        canvas.addEventListener('touchmove', onMove, { passive: false });
        canvas.addEventListener('touchend', onEnd);
    },

    getGridHover() {
        if (!this.dragging) return null;
        return this.renderer.screenToGrid(this.mouseX, this.mouseY);
    },
};
```

- [ ] **Step 2: Verify drag works visually**

Update `js/main.js` to a minimal drag test:

```js
import { Board } from './board.js';
import { Pieces } from './pieces.js';
import { Renderer } from './renderer.js';
import { Input } from './input.js';

const canvas = document.getElementById('gameCanvas');
Renderer.init(canvas);

const board = Board.create();
let pieces = Pieces.spawnSet();

Input.init(canvas, Renderer);
Input.onPiecePickup = (index) => pieces[index] || null;
Input.onPieceDrop = (index, row, col) => {
    const piece = pieces[index];
    if (Board.canPlace(board, piece, row, col)) {
        Board.place(board, piece, row, col);
        pieces[index] = null;
    }
};

function loop() {
    Renderer.clear();
    Renderer.drawGrid(board);
    Renderer.drawSpawnPieces(pieces, Input.dragging ? Input.dragging.pieceIndex : -1);
    Renderer.drawScorePanel({ score: 0, streak: 0, combo: 0 }, 0, 3, 'classic');

    if (Input.dragging) {
        const hover = Input.getGridHover();
        if (hover) Renderer.drawPreview(board, Input.dragging.piece, hover.row, hover.col);
        Renderer.drawDraggingPiece(Input.dragging.piece, Input.mouseX, Input.mouseY);
    }
    requestAnimationFrame(loop);
}
loop();
```

Open `index.html`. Expected: can drag pieces from slots to grid, pieces snap into place.

- [ ] **Step 3: Commit**

```bash
git add js/input.js js/main.js
git commit -m "feat: input module with mouse and touch drag-and-drop"
```

---

## Task 8: Audio Module — SFX and Chiptune Music

**Files:**
- Create: `js/audio.js`

- [ ] **Step 1: Implement audio with Web Audio API**

```js
let audioCtx = null;
let masterSfxGain = null;
let masterMusicGain = null;

function getCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterSfxGain = audioCtx.createGain();
        masterSfxGain.gain.value = 0.7;
        masterSfxGain.connect(audioCtx.destination);
        masterMusicGain = audioCtx.createGain();
        masterMusicGain.gain.value = 0.5;
        masterMusicGain.connect(audioCtx.destination);
    }
    return audioCtx;
}

function playTone(freq, duration, type = 'square', gainValue = 0.3, destination = null) {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(destination || masterSfxGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
}

function playNoise(duration, gainValue = 0.1) {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(masterSfxGain);
    source.start();
}

export const Audio = {
    sfxEnabled: true,
    musicEnabled: true,
    currentMusic: null,
    musicInterval: null,
    tempoMultiplier: 1,

    init(settings) {
        this.sfxEnabled = settings.sfxEnabled;
        this.musicEnabled = settings.musicEnabled;
        if (masterSfxGain) masterSfxGain.gain.value = settings.sfxVolume;
        if (masterMusicGain) masterMusicGain.gain.value = settings.musicVolume;
    },

    resume() {
        const ctx = getCtx();
        if (ctx.state === 'suspended') ctx.resume();
    },

    // --- SFX ---
    playPlace() {
        if (!this.sfxEnabled) return;
        playTone(200, 0.1, 'square', 0.2);
        playNoise(0.05, 0.05);
    },

    playClear(comboLevel) {
        if (!this.sfxEnabled) return;
        const baseFreq = 400 + comboLevel * 100;
        playTone(baseFreq, 0.15, 'square', 0.25);
        setTimeout(() => playTone(baseFreq * 1.5, 0.15, 'square', 0.2), 80);
    },

    playCombo(level) {
        if (!this.sfxEnabled) return;
        const freqs = [523, 659, 784, 1047];
        freqs.slice(0, Math.min(level + 1, 4)).forEach((f, i) => {
            setTimeout(() => playTone(f, 0.12, 'square', 0.2), i * 60);
        });
    },

    playStreak() {
        if (!this.sfxEnabled) return;
        playTone(880, 0.08, 'triangle', 0.15);
    },

    playUndo() {
        if (!this.sfxEnabled) return;
        playTone(600, 0.1, 'sawtooth', 0.15);
        setTimeout(() => playTone(400, 0.1, 'sawtooth', 0.1), 60);
    },

    playGameOver() {
        if (!this.sfxEnabled) return;
        const notes = [440, 370, 330, 262];
        notes.forEach((f, i) => {
            setTimeout(() => playTone(f, 0.3, 'triangle', 0.2), i * 200);
        });
    },

    playClick() {
        if (!this.sfxEnabled) return;
        playTone(1000, 0.05, 'square', 0.1);
    },

    playInvalid() {
        if (!this.sfxEnabled) return;
        playTone(150, 0.15, 'sawtooth', 0.2);
    },

    // --- MUSIC ---
    setTempo(multiplier) {
        this.tempoMultiplier = multiplier;
    },

    setSfxVolume(value) {
        getCtx();
        masterSfxGain.gain.value = value;
    },

    setMusicVolume(value) {
        getCtx();
        masterMusicGain.gain.value = value;
    },

    startMusic() {
        if (!this.musicEnabled) return;
        this.stopMusic();

        const ctx = getCtx();
        const melodies = [
            [262, 294, 330, 349, 392, 349, 330, 294, 262, 0, 392, 440, 392, 349, 330, 294],
            [330, 330, 0, 330, 0, 262, 330, 392, 0, 196, 0, 262, 0, 196, 0, 165],
            [392, 392, 0, 392, 330, 392, 440, 0, 392, 330, 262, 294, 330, 0, 294, 262],
        ];

        const melody = melodies[Math.floor(Math.random() * melodies.length)];
        let noteIndex = 0;

        const playNote = () => {
            if (!this.musicEnabled) return;
            const freq = melody[noteIndex % melody.length];
            if (freq > 0) {
                playTone(freq, 0.15, 'triangle', 0.12, masterMusicGain);
                // Bass line
                playTone(freq / 2, 0.15, 'square', 0.06, masterMusicGain);
            }
            noteIndex++;
        };

        playNote();
        this.musicInterval = setInterval(() => {
            playNote();
        }, 250 / this.tempoMultiplier);
    },

    stopMusic() {
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    },
};
```

- [ ] **Step 2: Verify audio plays**

Add a temporary test in browser console: open `index.html`, in DevTools console run:

```js
import('./js/audio.js').then(m => { m.Audio.resume(); m.Audio.playPlace(); });
```

Expected: hear a short 8-bit "thud" sound.

- [ ] **Step 3: Commit**

```bash
git add js/audio.js
git commit -m "feat: audio module with procedural 8-bit SFX and chiptune music"
```

---

## Task 9: Game Modes Module

**Files:**
- Create: `js/modes.js`
- Modify: `tests/test.js`

- [ ] **Step 1: Write failing tests for modes**

Add to `tests/test.js`:

```js
import { Modes } from '../js/modes.js';

describe('Modes', () => {
    test('classic mode has no timer', () => {
        const mode = Modes.create('classic');
        assertEqual(mode.type, 'classic');
        assertEqual(mode.hasTimer, false);
    });

    test('timeattack mode starts with 180 seconds', () => {
        const mode = Modes.create('timeattack');
        assertEqual(mode.type, 'timeattack');
        assertEqual(mode.hasTimer, true);
        assertEqual(mode.timeLeft, 180);
    });

    test('timeattack addTimeBonus adds 3 seconds', () => {
        const mode = Modes.create('timeattack');
        mode.timeLeft = 100;
        Modes.addTimeBonus(mode, 1);
        assertEqual(mode.timeLeft, 103);
    });

    test('timeattack addTimeBonus adds 3 per line', () => {
        const mode = Modes.create('timeattack');
        mode.timeLeft = 100;
        Modes.addTimeBonus(mode, 3);
        assertEqual(mode.timeLeft, 109);
    });

    test('daily mode generates seed from date', () => {
        const mode = Modes.create('daily');
        assertEqual(mode.type, 'daily');
        assert(mode.seed > 0, 'Seed should be positive');
    });

    test('daily mode same date gives same seed', () => {
        const m1 = Modes.create('daily');
        const m2 = Modes.create('daily');
        assertEqual(m1.seed, m2.seed);
    });

    test('isTimeUp returns false when time remains', () => {
        const mode = Modes.create('timeattack');
        assert(!Modes.isTimeUp(mode));
    });

    test('isTimeUp returns true when time is 0', () => {
        const mode = Modes.create('timeattack');
        mode.timeLeft = 0;
        assert(Modes.isTimeUp(mode));
    });

    test('isTimeUp returns false for classic', () => {
        const mode = Modes.create('classic');
        assert(!Modes.isTimeUp(mode));
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Open `tests/test.html`. Expected: all Modes tests FAIL.

- [ ] **Step 3: Implement js/modes.js**

```js
function dateSeed() {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
        hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash);
}

export const Modes = {
    create(type) {
        switch (type) {
            case 'classic':
                return { type: 'classic', hasTimer: false };
            case 'timeattack':
                return { type: 'timeattack', hasTimer: true, timeLeft: 180 };
            case 'daily':
                return { type: 'daily', hasTimer: false, seed: dateSeed() };
            default:
                return { type: 'classic', hasTimer: false };
        }
    },

    addTimeBonus(mode, lineCount) {
        if (mode.hasTimer) {
            mode.timeLeft += lineCount * 3;
        }
    },

    tick(mode, dt) {
        if (mode.hasTimer) {
            mode.timeLeft = Math.max(0, mode.timeLeft - dt);
        }
    },

    isTimeUp(mode) {
        if (!mode.hasTimer) return false;
        return mode.timeLeft <= 0;
    },

    getTodayString() {
        const d = new Date();
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    },
};
```

- [ ] **Step 4: Run tests to verify they pass**

Open `tests/test.html`. Expected: all Modes tests PASS.

- [ ] **Step 5: Commit**

```bash
git add js/modes.js tests/test.js
git commit -m "feat: game modes module with classic, time attack, and daily challenge"
```

---

## Task 10: Main Game Loop — State Machine

**Files:**
- Rewrite: `js/main.js`

- [ ] **Step 1: Implement complete main.js**

```js
import { Board } from './board.js';
import { Pieces } from './pieces.js';
import { Score } from './score.js';
import { Renderer } from './renderer.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { Modes } from './modes.js';
import { Storage } from './storage.js';

// --- GAME STATE ---
const STATES = { MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused', GAMEOVER: 'gameover', LEADERBOARD: 'leaderboard', SETTINGS: 'settings', NAME_INPUT: 'nameinput' };

let state = STATES.MENU;
let board = null;
let pieces = [];
let scoreState = null;
let highScore = 0;
let mode = null;
let rng = null;              // seeded RNG for daily mode
let undosLeft = 3;
let undoSnapshot = null;     // { board, pieces, scoreState }
let comboText = '';
let comboAlpha = 0;
let lastTime = 0;
let playerName = '';

// --- MENU BUTTONS ---
const menuButtons = [
    { label: 'CLASSIC', mode: 'classic', x: 0, y: 0, w: 180, h: 36 },
    { label: 'TIME ATTACK', mode: 'timeattack', x: 0, y: 0, w: 180, h: 36 },
    { label: 'DAILY', mode: 'daily', x: 0, y: 0, w: 180, h: 36 },
    { label: 'LEADERBOARD', mode: 'leaderboard', x: 0, y: 0, w: 180, h: 36 },
    { label: 'SETTINGS', mode: 'settings', x: 0, y: 0, w: 180, h: 36 },
];

// --- INIT ---
const canvas = document.getElementById('gameCanvas');
Renderer.init(canvas);

const settings = Storage.getSettings();
Audio.init(settings);

Input.init(canvas, Renderer);

Input.onPiecePickup = (index) => {
    if (state !== STATES.PLAYING) return null;
    if (!pieces[index]) return null;
    Audio.resume();
    return pieces[index];
};

Input.onPieceDrop = (index, row, col) => {
    if (state !== STATES.PLAYING) return;
    const piece = pieces[index];
    if (!piece) return;

    if (Board.canPlace(board, piece, row, col)) {
        // Save undo snapshot
        undoSnapshot = {
            board: Board.clone(board),
            pieces: [...pieces],
            scoreState: { ...scoreState },
        };

        Board.place(board, piece, row, col);
        Score.addPlacement(scoreState, piece.cells.length);
        Audio.playPlace();

        pieces[index] = null;

        // Check line clears
        const cleared = Board.checkAndClearLines(board);
        if (cleared.totalLines > 0) {
            const result = Score.addLineClear(scoreState, cleared.totalLines);
            Audio.playClear(cleared.totalLines);
            Modes.addTimeBonus(mode, cleared.totalLines);

            if (result.comboMultiplier > 1) {
                comboText = `COMBO x${result.comboMultiplier}!`;
                comboAlpha = 1;
                Audio.playCombo(result.comboMultiplier);
            }
            if (scoreState.streak > 1) {
                Audio.playStreak();
            }

            // Adjust music tempo based on board fill
            const fill = Board.getOccupiedCount(board) / 64;
            Audio.setTempo(fill > 0.6 ? 1.3 : 1);
        } else {
            Score.resetStreak(scoreState);
        }

        // Check if all 3 pieces used → spawn new set
        if (pieces.every(p => p === null)) {
            spawnNewPieces();
        }

        // Check game over
        checkGameOver();
    } else {
        Audio.playInvalid();
    }
};

Input.onPieceCancel = () => {};

Input.onClick = (x, y) => {
    Audio.resume();

    if (state === STATES.MENU) {
        for (const btn of menuButtons) {
            if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
                Audio.playClick();
                if (btn.mode === 'leaderboard') {
                    state = STATES.LEADERBOARD;
                } else if (btn.mode === 'settings') {
                    state = STATES.SETTINGS;
                } else {
                    startGame(btn.mode);
                }
                return;
            }
        }
    } else if (state === STATES.GAMEOVER) {
        Audio.playClick();
        if (Storage.isTopScore(mode.type, scoreState.score)) {
            playerName = '';
            state = STATES.NAME_INPUT;
        } else {
            state = STATES.MENU;
        }
    } else if (state === STATES.LEADERBOARD || state === STATES.SETTINGS) {
        Audio.playClick();
        state = STATES.MENU;
    }
};

// Keyboard
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (state === STATES.PLAYING) {
            state = STATES.PAUSED;
            Audio.stopMusic();
        } else if (state === STATES.PAUSED) {
            state = STATES.PLAYING;
            Audio.startMusic();
        }
    }

    if (e.key === 'z' && state === STATES.PLAYING) {
        performUndo();
    }

    if (state === STATES.NAME_INPUT) {
        if (e.key === 'Enter' && playerName.length > 0) {
            Storage.addScore(mode.type, playerName, scoreState.score);
            if (mode.type === 'daily') {
                Storage.saveDailyResult(Modes.getTodayString(), scoreState.score);
            }
            state = STATES.LEADERBOARD;
        } else if (e.key === 'Backspace') {
            playerName = playerName.slice(0, -1);
        } else if (e.key.length === 1 && playerName.length < 10) {
            playerName += e.key.toUpperCase();
        }
    }
});

function startGame(modeType) {
    board = Board.create();
    scoreState = Score.create();
    mode = Modes.create(modeType);
    undosLeft = 3;
    undoSnapshot = null;
    comboText = '';
    comboAlpha = 0;

    if (modeType === 'daily') {
        rng = Pieces.createSeededRng(mode.seed);
    } else {
        rng = null;
    }

    const lb = Storage.getLeaderboard(modeType);
    highScore = lb.length > 0 ? lb[0].score : 0;

    spawnNewPieces();
    state = STATES.PLAYING;
    Audio.startMusic();
}

function spawnNewPieces() {
    if (rng) {
        pieces = Pieces.seededSpawnSet(rng);
    } else {
        pieces = Pieces.spawnSet();
    }
}

function performUndo() {
    if (undosLeft <= 0 || !undoSnapshot) return;
    board = undoSnapshot.board;
    pieces = undoSnapshot.pieces;
    scoreState = { ...undoSnapshot.scoreState };
    undoSnapshot = null;
    undosLeft--;
    Audio.playUndo();
}

function checkGameOver() {
    const remaining = pieces.filter(p => p !== null);
    const anyCanPlace = remaining.some(p => Board.canPlaceAny(board, p));
    if (!anyCanPlace && remaining.length > 0) {
        state = STATES.GAMEOVER;
        Audio.stopMusic();
        Audio.playGameOver();
    }
}

// --- DRAW FUNCTIONS ---
function drawMenu() {
    const ctx = Renderer.ctx;
    Renderer.clear();

    ctx.fillStyle = '#ffcc00';
    ctx.font = '20px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('BLOCK BLAST', Renderer.canvasWidth / 2, 80);
    ctx.fillStyle = '#ff6b6b';
    ctx.font = '12px "Press Start 2P"';
    ctx.fillText('PIXEL', Renderer.canvasWidth / 2, 105);

    const startY = 150;
    const gap = 50;
    for (let i = 0; i < menuButtons.length; i++) {
        const btn = menuButtons[i];
        btn.x = (Renderer.canvasWidth - btn.w) / 2;
        btn.y = startY + i * gap;

        ctx.fillStyle = '#2a2a4a';
        ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
        ctx.strokeStyle = '#5a5a7a';
        ctx.lineWidth = 2;
        ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

        ctx.fillStyle = '#ffffff';
        ctx.font = '8px "Press Start 2P"';
        ctx.fillText(btn.label, Renderer.canvasWidth / 2, btn.y + 22);
    }
    ctx.textAlign = 'left';
}

function drawLeaderboard() {
    const ctx = Renderer.ctx;
    Renderer.clear();

    ctx.fillStyle = '#ffcc00';
    ctx.font = '12px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('LEADERBOARD', Renderer.canvasWidth / 2, 40);

    const modes = ['classic', 'timeattack', 'daily'];
    let y = 70;
    for (const m of modes) {
        ctx.fillStyle = '#ff6b6b';
        ctx.font = '8px "Press Start 2P"';
        ctx.fillText(m.toUpperCase(), Renderer.canvasWidth / 2, y);
        y += 20;

        const lb = Storage.getLeaderboard(m);
        ctx.fillStyle = '#ffffff';
        ctx.font = '7px "Press Start 2P"';
        if (lb.length === 0) {
            ctx.fillText('No scores yet', Renderer.canvasWidth / 2, y);
            y += 15;
        } else {
            for (let i = 0; i < Math.min(5, lb.length); i++) {
                ctx.fillText(`${i + 1}. ${lb[i].name} - ${lb[i].score}`, Renderer.canvasWidth / 2, y);
                y += 15;
            }
        }
        y += 10;
    }

    ctx.fillStyle = '#aaaaaa';
    ctx.font = '7px "Press Start 2P"';
    ctx.fillText('Click to go back', Renderer.canvasWidth / 2, y + 20);
    ctx.textAlign = 'left';
}

function drawSettings() {
    const ctx = Renderer.ctx;
    Renderer.clear();

    ctx.fillStyle = '#ffcc00';
    ctx.font = '12px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('SETTINGS', Renderer.canvasWidth / 2, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = '8px "Press Start 2P"';
    const s = Storage.getSettings();
    ctx.fillText(`SFX: ${s.sfxEnabled ? 'ON' : 'OFF'}`, Renderer.canvasWidth / 2, 110);
    ctx.fillText(`MUSIC: ${s.musicEnabled ? 'ON' : 'OFF'}`, Renderer.canvasWidth / 2, 140);
    ctx.fillText(`SFX VOL: ${Math.round(s.sfxVolume * 100)}%`, Renderer.canvasWidth / 2, 170);
    ctx.fillText(`MUSIC VOL: ${Math.round(s.musicVolume * 100)}%`, Renderer.canvasWidth / 2, 200);

    ctx.fillStyle = '#aaaaaa';
    ctx.font = '7px "Press Start 2P"';
    ctx.fillText('Click to go back', Renderer.canvasWidth / 2, 260);
    ctx.textAlign = 'left';
}

function drawNameInput() {
    const ctx = Renderer.ctx;
    Renderer.clear();

    ctx.fillStyle = '#ffcc00';
    ctx.font = '12px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('NEW HIGH SCORE!', Renderer.canvasWidth / 2, 80);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px "Press Start 2P"';
    ctx.fillText(`${scoreState.score}`, Renderer.canvasWidth / 2, 120);

    ctx.font = '8px "Press Start 2P"';
    ctx.fillText('Enter your name:', Renderer.canvasWidth / 2, 170);

    ctx.font = '12px "Press Start 2P"';
    ctx.fillStyle = '#44bb44';
    const displayName = playerName + (Math.floor(Date.now() / 500) % 2 === 0 ? '_' : ' ');
    ctx.fillText(displayName, Renderer.canvasWidth / 2, 200);

    ctx.fillStyle = '#aaaaaa';
    ctx.font = '7px "Press Start 2P"';
    ctx.fillText('Press ENTER to confirm', Renderer.canvasWidth / 2, 240);
    ctx.textAlign = 'left';
}

// --- GAME LOOP ---
function gameLoop(timestamp) {
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // Combo text fade
    if (comboAlpha > 0) comboAlpha -= dt * 1.5;

    switch (state) {
        case STATES.MENU:
            drawMenu();
            break;

        case STATES.PLAYING:
            if (mode.hasTimer) {
                Modes.tick(mode, dt);
                if (Modes.isTimeUp(mode)) {
                    state = STATES.GAMEOVER;
                    Audio.stopMusic();
                    Audio.playGameOver();
                }
            }

            Renderer.clear();
            Renderer.drawGrid(board);
            Renderer.drawSpawnPieces(pieces, Input.dragging ? Input.dragging.pieceIndex : -1);
            Renderer.drawScorePanel(scoreState, highScore, undosLeft, mode.type);

            if (mode.hasTimer) Renderer.drawTimer(mode.timeLeft);
            if (comboAlpha > 0) Renderer.drawComboText(comboText, comboAlpha);

            if (Input.dragging) {
                const hover = Input.getGridHover();
                if (hover) Renderer.drawPreview(board, Input.dragging.piece, hover.row, hover.col);
                Renderer.drawDraggingPiece(Input.dragging.piece, Input.mouseX, Input.mouseY);
            }
            break;

        case STATES.PAUSED:
            Renderer.clear();
            Renderer.drawGrid(Board.create()); // hidden grid
            Renderer.drawPauseOverlay();
            break;

        case STATES.GAMEOVER:
            Renderer.clear();
            Renderer.drawGrid(board);
            Renderer.drawGameOver(scoreState.score);
            break;

        case STATES.LEADERBOARD:
            drawLeaderboard();
            break;

        case STATES.SETTINGS:
            drawSettings();
            break;

        case STATES.NAME_INPUT:
            drawNameInput();
            break;
    }

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
```

- [ ] **Step 2: Verify full game works**

Open `index.html`. Expected:
- Menu appears with 5 buttons
- Click CLASSIC → game starts, can drag pieces, lines clear, score updates
- ESC → pause overlay
- Game over → shows score, click → name input if top score
- Undo with Z key works (max 3 times)

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat: main game loop with state machine, undo, pause, and all modes"
```

---

## Task 11: Polish — Particle Effects and Animations

**Files:**
- Modify: `js/renderer.js`
- Modify: `js/main.js`

- [ ] **Step 1: Add particle system to renderer.js**

Add at the top of `js/renderer.js`:

```js
const particles = [];

export function spawnParticles(cells, colorId) {
    const pal = COLOR_PALETTE[colorId];
    if (!pal) return;
    for (const [r, c] of cells) {
        for (let i = 0; i < 4; i++) {
            particles.push({
                x: Renderer.boardX + c * CELL_SIZE + CELL_SIZE / 2,
                y: Renderer.boardY + r * CELL_SIZE + CELL_SIZE / 2,
                vx: (Math.random() - 0.5) * 120,
                vy: (Math.random() - 0.5) * 120,
                size: 3 + Math.random() * 3,
                color: pal.base,
                life: 1,
            });
        }
    }
}

export function updateAndDrawParticles(ctx, dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt * 2;
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
}
```

- [ ] **Step 2: Integrate particles in main.js**

In `js/main.js`, import the particle functions:

```js
import { spawnParticles, updateAndDrawParticles } from './renderer.js';
```

In the `onPieceDrop` callback, after line clear detection, add:

```js
if (cleared.totalLines > 0) {
    // Spawn particles for cleared cells
    for (const [r, c] of cleared.cellsCleared) {
        spawnParticles([[r, c]], pieces[index] ? pieces[index].color : 1);
    }
    // ... existing code ...
}
```

In the PLAYING draw section of `gameLoop`, add before the combo text:

```js
updateAndDrawParticles(Renderer.ctx, dt);
```

- [ ] **Step 3: Verify particles appear on line clear**

Open `index.html`, play until a line clears. Expected: colored pixel particles explode from cleared cells.

- [ ] **Step 4: Commit**

```bash
git add js/renderer.js js/main.js
git commit -m "feat: particle explosion effects on line clear"
```

---

## Task 12: Final Integration Test and Cleanup

**Files:**
- Modify: `tests/test.js` (ensure all imports work)
- Review: all files

- [ ] **Step 1: Run all tests**

Open `tests/test.html`. Expected: all tests pass (Storage, Board, Pieces, Score, Modes).

- [ ] **Step 2: Full manual playthrough — Classic mode**

1. Open `index.html`
2. Click CLASSIC
3. Drag and place pieces
4. Clear at least one line — verify score, combo text, particles, sound
5. Build a streak — verify streak meter
6. Press Z — verify undo
7. Press ESC — verify pause
8. Play until game over — verify game over screen
9. Enter name — verify leaderboard entry

- [ ] **Step 3: Full manual playthrough — Time Attack**

1. Click TIME ATTACK
2. Verify timer counting down
3. Clear a line — verify +3s bonus
4. Wait for timer to expire — verify game over

- [ ] **Step 4: Full manual playthrough — Daily Challenge**

1. Click DAILY
2. Play a few moves
3. Refresh page, click DAILY again — verify same piece sequence

- [ ] **Step 5: Check Leaderboard and Settings screens**

1. Click LEADERBOARD — verify scores appear per mode
2. Click SETTINGS — verify settings display

- [ ] **Step 6: Commit final state**

```bash
git add -A
git commit -m "feat: Block Blast Pixel complete — all modes, scoring, audio, effects"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Project scaffold + test runner | index.html, style.css, test.html, test.js |
| 2 | Storage module | storage.js |
| 3 | Board module | board.js |
| 4 | Pieces module | pieces.js |
| 5 | Score module | score.js |
| 6 | Renderer — pixel art | renderer.js |
| 7 | Input — drag and drop | input.js |
| 8 | Audio — SFX + music | audio.js |
| 9 | Game modes | modes.js |
| 10 | Main game loop | main.js |
| 11 | Particle effects | renderer.js, main.js |
| 12 | Integration testing | all files |
