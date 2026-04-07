// powerups.js — Power-up system
(function() {
'use strict';

const { R, Board, Audio, Input, ST, CPAL, CELL, GSIZ, spawnParticles, spawnPlaceEffect, spawnFloatText, spawnLineExplosion } = Game;

// === POWER-UP DEFINITIONS ===
const PU_NAMES = {
    bom: 'BOM', doimau: 'MAU', xoay: 'XOAY',
    phahang: 'PHA', hoandoi: 'DOI', ghost: 'MA'
};
const PU_COLORS = {
    bom: '#ff4444', doimau: '#ffcc00', xoay: '#74c0fc',
    phahang: '#ff8822', hoandoi: '#44bb44', ghost: '#b197fc'
};

// === POWER-UP SFX ===
function playPowerupSfx(type) {
    if (!Audio.sfxEnabled) return;
    const ctx = Game.getMasterGains();
    const aCtx = new (window.AudioContext || window.webkitAudioContext)();
    const gain = aCtx.createGain();
    gain.gain.setValueAtTime(0.2, aCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, aCtx.currentTime + 0.3);
    gain.connect(aCtx.destination);

    const tones = {
        bom: [200, 150, 100],
        doimau: [400, 500, 600],
        xoay: [300, 400, 500],
        phahang: [250, 200, 150, 100],
        hoandoi: [350, 450, 350],
        ghost: [600, 500, 400, 300]
    };
    const freqs = tones[type] || [440];
    freqs.forEach(function(f, i) {
        const osc = aCtx.createOscillator();
        osc.type = 'square';
        osc.frequency.value = f;
        const g = aCtx.createGain();
        g.gain.setValueAtTime(0.15, aCtx.currentTime + i * 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, aCtx.currentTime + i * 0.06 + 0.1);
        osc.connect(g);
        g.connect(aCtx.destination);
        osc.start(aCtx.currentTime + i * 0.06);
        osc.stop(aCtx.currentTime + i * 0.06 + 0.1);
    });
}

// === OVERRIDE R.drawScorePanel to add power-up slots ===
const origDrawScorePanel = R.drawScorePanel.bind(R);

R.drawScorePanel = function(sc, hi, undo, mode) {
    origDrawScorePanel(sc, hi, undo, mode);

    const ctx = this.ctx;
    const px = this.bx + GSIZ * CELL + 20;
    const py = this.by + 200;
    const slotSize = 40;
    const slotGap = 6;

    const puState = Game.getPowerups();
    const powerups = puState.powerups;
    const activePowerup = puState.activePowerup;

    // Draw power-up progress bar
    ctx.fillStyle = '#aaa';
    ctx.font = '6px "Press Start 2P"';
    ctx.fillText('POWER-UP', px, py - 8);
    ctx.fillStyle = '#2a2a4a';
    ctx.fillRect(px, py - 4, 80, 6);
    const prog = puState.powerupScore / 300;
    ctx.fillStyle = '#b197fc';
    ctx.fillRect(px, py - 4, 80 * Math.min(prog, 1), 6);

    // Draw 3 slots
    for (let i = 0; i < 3; i++) {
        const sx = px + i * (slotSize + slotGap);
        const sy = py + 8;

        // Store hitbox
        Game._puSlots[i] = { x: sx, y: sy, w: slotSize, h: slotSize };

        const pu = powerups[i];
        if (pu) {
            // Filled slot
            const isActive = activePowerup && activePowerup.index === i;
            if (isActive) {
                ctx.fillStyle = '#4a4a1a';
                ctx.fillRect(sx, sy, slotSize, slotSize);
                ctx.strokeStyle = '#ffcc00';
                ctx.lineWidth = 2;
                ctx.strokeRect(sx, sy, slotSize, slotSize);
                // Pulsing glow
                ctx.shadowColor = '#ffcc00';
                ctx.shadowBlur = 8;
                ctx.strokeRect(sx, sy, slotSize, slotSize);
                ctx.shadowBlur = 0;
            } else {
                const col = PU_COLORS[pu.type] || '#666';
                ctx.fillStyle = col + '44';
                ctx.fillRect(sx, sy, slotSize, slotSize);
                ctx.strokeStyle = col;
                ctx.lineWidth = 1;
                ctx.strokeRect(sx, sy, slotSize, slotSize);
            }
            // Draw abbreviated name
            ctx.fillStyle = '#fff';
            ctx.font = '7px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(PU_NAMES[pu.type] || '?', sx + slotSize / 2, sy + slotSize / 2 + 3);
            ctx.textAlign = 'left';
        } else {
            // Empty slot
            ctx.fillStyle = '#2a2a4a';
            ctx.fillRect(sx, sy, slotSize, slotSize);
            ctx.strokeStyle = '#5a5a7a';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx, sy, slotSize, slotSize);
        }
    }
};

// === HELPER: consume power-up ===
function consumePowerup(slotIndex) {
    const puState = Game.getPowerups();
    puState.powerups.splice(slotIndex, 1);
    puState.activePowerup = null;
    Game.setPowerups(puState);
    Game.autoSave();
}

// === OVERRIDE Input.onClick for power-up interactions ===
const origOnClick = Input.onClick;

Input.onClick = function(x, y) {
    const gs = Game.getState();

    if (gs.state === ST.PLAY) {
        const puState = Game.getPowerups();

        // Check if clicked a power-up slot
        for (let i = 0; i < 3; i++) {
            const slot = Game._puSlots[i];
            if (!slot) continue;
            if (x >= slot.x && x < slot.x + slot.w && y >= slot.y && y < slot.y + slot.h) {
                if (!puState.powerups[i]) return; // empty slot

                Audio.playClick();

                // Toggle activation
                if (puState.activePowerup && puState.activePowerup.index === i) {
                    // Deactivate
                    puState.activePowerup = null;
                    Game.setPowerups(puState);
                    return;
                }

                // Activate
                const pu = puState.powerups[i];

                // Ghost is immediate
                if (pu.type === 'ghost') {
                    Game._ghostActive = true;
                    playPowerupSfx('ghost');
                    spawnFloatText('GHOST MODE!', R.bx + (GSIZ * CELL) / 2, R.by - 20, '#b197fc');
                    consumePowerup(i);
                    return;
                }

                puState.activePowerup = { index: i, type: pu.type, step: 0, firstSlot: -1 };
                Game.setPowerups(puState);
                return;
            }
        }

        // Check if activePowerup and clicked on board grid
        if (puState.activePowerup) {
            const gridPos = R.screenToGrid(x, y);
            if (gridPos) {
                const ap = puState.activePowerup;
                const board = gs.board;

                if (ap.type === 'bom') {
                    // BOM: clear 3x3 area
                    const cleared = [];
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            const r = gridPos.row + dr, c = gridPos.col + dc;
                            if (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r][c] !== 0) {
                                cleared.push({ r: r, c: c, color: board[r][c] });
                                board[r][c] = 0;
                            }
                        }
                    }
                    if (cleared.length > 0) {
                        spawnLineExplosion([], [], cleared);
                        R.shake(6);
                        playPowerupSfx('bom');
                        spawnFloatText('BOM!', R.bx + gridPos.col * CELL + CELL / 2, R.by + gridPos.row * CELL, '#ff4444');
                        Game.setState({ board: board });
                        consumePowerup(ap.index);
                    }
                    return;
                }

                if (ap.type === 'phahang') {
                    // PHA HANG: clear entire row + column
                    const row = gridPos.row, col = gridPos.col;
                    const cleared = [];
                    for (let c = 0; c < 8; c++) {
                        if (board[row][c] !== 0) {
                            cleared.push({ r: row, c: c, color: board[row][c] });
                            board[row][c] = 0;
                        }
                    }
                    for (let r = 0; r < 8; r++) {
                        if (board[r][col] !== 0) {
                            cleared.push({ r: r, c: col, color: board[r][col] });
                            board[r][col] = 0;
                        }
                    }
                    if (cleared.length > 0) {
                        spawnLineExplosion([row], [col], cleared);
                        R.shake(8);
                        playPowerupSfx('phahang');
                        spawnFloatText('PHA HANG!', R.bx + col * CELL + CELL / 2, R.by + row * CELL, '#ff8822');
                        Game.setState({ board: board });
                        consumePowerup(ap.index);
                    }
                    return;
                }
            }

            // Check if clicked a spawn piece slot (for piece-targeting power-ups)
            const spawnSlot = R.getSpawnSlot(x, y);
            if (spawnSlot >= 0) {
                const ap = puState.activePowerup;
                const pieces = gs.pieces;
                const piece = pieces[spawnSlot];
                if (!piece) return;

                if (ap.type === 'doimau') {
                    // DOI MAU: change piece color to random different color
                    let newColor = piece.color;
                    while (newColor === piece.color) {
                        newColor = Math.floor(Math.random() * 7) + 1;
                    }
                    piece.color = newColor;
                    spawnPlaceEffect(piece.cells.map(function(c) { return [c[0], c[1]]; }), newColor);
                    playPowerupSfx('doimau');
                    spawnFloatText('DOI MAU!', R.bx + spawnSlot * 90 + 40, R.sy - 10, '#ffcc00');
                    Game.setState({ pieces: pieces });
                    consumePowerup(ap.index);
                    return;
                }

                if (ap.type === 'xoay') {
                    // XOAY: rotate piece 90 degrees clockwise [r,c] -> [c, -r], then normalize
                    const rotated = piece.cells.map(function(cell) { return [cell[1], -cell[0]]; });
                    // Normalize to 0-based
                    let minR = Infinity, minC = Infinity;
                    for (var k = 0; k < rotated.length; k++) {
                        if (rotated[k][0] < minR) minR = rotated[k][0];
                        if (rotated[k][1] < minC) minC = rotated[k][1];
                    }
                    for (var k = 0; k < rotated.length; k++) {
                        rotated[k][0] -= minR;
                        rotated[k][1] -= minC;
                    }
                    piece.cells = rotated;
                    playPowerupSfx('xoay');
                    spawnFloatText('XOAY!', R.bx + spawnSlot * 90 + 40, R.sy - 10, '#74c0fc');
                    Game.setState({ pieces: pieces });
                    consumePowerup(ap.index);
                    return;
                }

                if (ap.type === 'hoandoi') {
                    // HOAN DOI: two-step swap
                    if (ap.step === 0) {
                        // First click: select piece
                        ap.step = 1;
                        ap.firstSlot = spawnSlot;
                        Game.setPowerups(puState);
                        spawnFloatText('CHON KHOI 2', R.bx + spawnSlot * 90 + 40, R.sy - 10, '#44bb44');
                        return;
                    } else if (ap.step === 1) {
                        // Second click: swap with different piece
                        if (spawnSlot === ap.firstSlot) return; // same slot, ignore
                        if (!pieces[ap.firstSlot]) return; // first piece gone
                        const temp = pieces[spawnSlot];
                        pieces[spawnSlot] = pieces[ap.firstSlot];
                        pieces[ap.firstSlot] = temp;
                        playPowerupSfx('hoandoi');
                        spawnFloatText('HOAN DOI!', R.bx + (GSIZ * CELL) / 2, R.sy - 10, '#44bb44');
                        Game.setState({ pieces: pieces });
                        consumePowerup(ap.index);
                        return;
                    }
                }
            }
        }
    }

    // Fall through to original handler
    origOnClick(x, y);
};

// === OVERRIDE Board.canPlace for Ghost ===
const origCanPlace = Board.canPlace;
Board.canPlace = function(b, piece, row, col) {
    if (Game._ghostActive) {
        for (const [dr, dc] of piece.cells) {
            const r = row + dr, c = col + dc;
            if (r < 0 || r >= 8 || c < 0 || c >= 8) return false;
        }
        return true;
    }
    return origCanPlace.call(Board, b, piece, row, col);
};

// === OVERRIDE Board.place for Ghost ===
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

// === ESC to cancel active power-up ===
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const puState = Game.getPowerups();
        if (puState.activePowerup) {
            puState.activePowerup = null;
            Game.setPowerups(puState);
        }
    }
});

})();
