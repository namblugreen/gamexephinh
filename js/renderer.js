const CELL_SIZE = 32;
const GRID_SIZE = 8;
const BOARD_PADDING = 20;

const COLOR_PALETTE = {
    1: { light: '#ff6b6b', base: '#ee4444', dark: '#bb2222' },
    2: { light: '#ffa94d', base: '#ff8822', dark: '#cc6600' },
    3: { light: '#ffe066', base: '#ffcc00', dark: '#cc9900' },
    4: { light: '#69db7c', base: '#44bb44', dark: '#228822' },
    5: { light: '#74c0fc', base: '#4488ee', dark: '#2266bb' },
    6: { light: '#b197fc', base: '#8844ee', dark: '#6622bb' },
    7: { light: '#faa2c1', base: '#ee4488', dark: '#bb2266' },
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

        ctx.fillStyle = GRID_BG;
        ctx.fillRect(bx, by, GRID_SIZE * CELL_SIZE, GRID_SIZE * CELL_SIZE);

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

        ctx.fillStyle = pal.base;
        ctx.fillRect(x + 1, y + 1, s - 2, s - 2);

        ctx.fillStyle = pal.light;
        ctx.fillRect(x + 1, y + 1, s - 2, 3);
        ctx.fillRect(x + 1, y + 1, 3, s - 2);

        ctx.fillStyle = pal.dark;
        ctx.fillRect(x + 1, y + s - 4, s - 2, 3);
        ctx.fillRect(x + s - 4, y + 1, 3, s - 2);

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

            ctx.fillStyle = i === selectedIndex ? '#4a4a6a' : '#2a2a4a';
            ctx.strokeStyle = '#5a5a7a';
            ctx.lineWidth = 1;
            ctx.fillRect(slotX, slotY, slotWidth, slotWidth);
            ctx.strokeRect(slotX, slotY, slotWidth, slotWidth);

            let maxR = 0, maxC = 0;
            for (const [r, c] of piece.cells) {
                if (r > maxR) maxR = r;
                if (c > maxC) maxC = c;
            }
            const pieceW = (maxC + 1) * 12;
            const pieceH = (maxR + 1) * 12;
            const offsetX = slotX + (slotWidth - pieceW) / 2;
            const offsetY = slotY + (slotWidth - pieceH) / 2;

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

        ctx.fillText(`UNDO: ${undosLeft}`, panelX, panelY + 160);

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
