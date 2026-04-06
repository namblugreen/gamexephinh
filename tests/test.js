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

// --- MODULE TESTS ---

import { Storage } from '../js/storage.js';
import { Board } from '../js/board.js';
import { Pieces } from '../js/pieces.js';
import { Score } from '../js/score.js';
import { Modes } from '../js/modes.js';

// --- Storage Tests ---
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

// --- Board Tests ---
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

// --- Pieces Tests ---
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

// --- Score Tests ---
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
        assertEqual(s.score, 100 + 50); // 100 line + 50 streak bonus (streak=1)
        assertEqual(result.comboMultiplier, 1);
    });

    test('addLineClear with 2 lines gives x3 (600)', () => {
        const s = Score.create();
        const result = Score.addLineClear(s, 2);
        assertEqual(s.score, 600 + 50); // 600 line + 50 streak bonus
        assertEqual(result.comboMultiplier, 3);
    });

    test('addLineClear with 3 lines gives x5 (1500)', () => {
        const s = Score.create();
        const result = Score.addLineClear(s, 3);
        assertEqual(s.score, 1500 + 50); // 1500 + 50 streak
    });

    test('addLineClear with 4+ lines gives x8', () => {
        const s = Score.create();
        const result = Score.addLineClear(s, 4);
        assertEqual(s.score, 3200 + 50); // 3200 + 50 streak
        assertEqual(result.comboMultiplier, 8);
    });

    test('streak increments on line clear', () => {
        const s = Score.create();
        Score.addLineClear(s, 1);
        assertEqual(s.streak, 1);
        Score.addLineClear(s, 1);
        assertEqual(s.streak, 2);
    });

    test('resetStreak sets streak to 0', () => {
        const s = Score.create();
        Score.addLineClear(s, 1);
        Score.resetStreak(s);
        assertEqual(s.streak, 0);
    });
});

// --- Modes Tests ---
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

    test('timeattack addTimeBonus adds 3 seconds per line', () => {
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
