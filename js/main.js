import { Board } from './board.js';
import { Pieces } from './pieces.js';
import { Score } from './score.js';
import { Renderer, spawnParticles, updateAndDrawParticles } from './renderer.js';
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
let rng = null;
let undosLeft = 3;
let undoSnapshot = null;
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

        const placedColor = piece.color;
        pieces[index] = null;

        // Check line clears
        const cleared = Board.checkAndClearLines(board);
        if (cleared.totalLines > 0) {
            // Spawn particles for cleared cells
            for (const cell of cleared.cellsCleared) {
                spawnParticles([cell], placedColor);
            }
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
            updateAndDrawParticles(Renderer.ctx, dt);
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
            Renderer.drawGrid(Board.create());
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
