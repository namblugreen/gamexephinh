// themes.js — Theme definitions and rendering overrides
(function () {
'use strict';

const { R, Storage, CELL, GSIZ } = Game;

// === THEME DEFINITIONS ===
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
        bgEffect: null, particleStyle: 'square',
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
        bgEffect: null, particleStyle: 'square',
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
        bgEffect: null, particleStyle: 'circle',
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
        bgEffect: 'stars', particleStyle: 'circle',
    },
};

function getTheme() {
    const s = Storage.getSettings();
    return THEMES[s.theme || 'default'] || THEMES.default;
}

// === STAR FIELD (galaxy bgEffect) ===
const stars = [];
(function initStars() {
    for (let i = 0; i < 80; i++) {
        stars.push({
            x: Math.random(),      // normalized 0-1
            y: Math.random(),      // normalized 0-1
            size: 0.5 + Math.random() * 1.5,
            phase: Math.random() * Math.PI * 2,
            speed: 0.5 + Math.random() * 1.5,
        });
    }
})();

// === OVERRIDE R.clear() ===
const origClear = R.clear.bind(R);
R.clear = function () {
    const theme = getTheme();
    const ctx = this.ctx;
    ctx.fillStyle = theme.bgColor;
    ctx.fillRect(0, 0, this.cw, this.ch);

    if (theme.bgEffect === 'stars') {
        const now = performance.now() / 1000;
        for (const star of stars) {
            const alpha = 0.4 + 0.6 * Math.abs(Math.sin(now * star.speed + star.phase));
            ctx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')';
            const sx = star.x * this.cw;
            const sy = star.y * this.ch;
            ctx.fillRect(sx, sy, star.size, star.size);
        }
    }
};

// === OVERRIDE R.drawGrid() ===
const origDrawGrid = R.drawGrid.bind(R);
R.drawGrid = function (board) {
    const theme = getTheme();
    const ctx = this.ctx;
    const bx = this.bx + this.shakeX, by = this.by + this.shakeY;

    ctx.fillStyle = theme.gridBg;
    ctx.fillRect(bx, by, GSIZ * CELL, GSIZ * CELL);

    ctx.strokeStyle = theme.gridLine;
    ctx.lineWidth = 1;
    for (let i = 0; i <= GSIZ; i++) {
        ctx.beginPath(); ctx.moveTo(bx + i * CELL, by); ctx.lineTo(bx + i * CELL, by + GSIZ * CELL); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx, by + i * CELL); ctx.lineTo(bx + GSIZ * CELL, by + i * CELL); ctx.stroke();
    }

    for (let r = 0; r < GSIZ; r++) {
        for (let c = 0; c < GSIZ; c++) {
            if (board[r][c] !== 0) this.drawCell(bx + c * CELL, by + r * CELL, board[r][c]);
        }
    }
};

// === OVERRIDE R.drawCell() ===
const origDrawCell = R.drawCell.bind(R);
R.drawCell = function (x, y, cid, glow) {
    const theme = getTheme();
    const ctx = this.ctx;
    const p = theme.palette[cid];
    const s = CELL;

    if (!p) { origDrawCell(x, y, cid, glow); return; }

    if (glow) {
        ctx.shadowColor = p.light;
        ctx.shadowBlur = 12;
    }

    const style = theme.cellStyle || 'square';

    if (style === 'square') {
        // Same as original pixel-3D shading
        ctx.fillStyle = p.base; ctx.fillRect(x + 1, y + 1, s - 2, s - 2);
        ctx.fillStyle = p.light; ctx.fillRect(x + 1, y + 1, s - 2, 3); ctx.fillRect(x + 1, y + 1, 3, s - 2);
        ctx.fillStyle = p.dark; ctx.fillRect(x + 1, y + s - 4, s - 2, 3); ctx.fillRect(x + s - 4, y + 1, 3, s - 2);
        ctx.fillStyle = '#ffffff44'; ctx.fillRect(x + 4, y + 4, 4, 4);

    } else if (style === 'rounded') {
        const r = 4;
        // Base fill with rounded corners
        ctx.fillStyle = p.base;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x + 1, y + 1, s - 2, s - 2, r);
        } else {
            // Manual fallback arc-based rounded rect
            const rx = x + 1, ry = y + 1, rw = s - 2, rh = s - 2;
            ctx.moveTo(rx + r, ry);
            ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, r);
            ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, r);
            ctx.arcTo(rx, ry + rh, rx, ry, r);
            ctx.arcTo(rx, ry, rx + rw, ry, r);
            ctx.closePath();
        }
        ctx.fill();

        // Light top edge
        ctx.fillStyle = p.light;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x + 1, y + 1, s - 2, 3, [r, r, 0, 0]);
        } else {
            ctx.rect(x + 1, y + 1, s - 2, 3);
        }
        ctx.fill();

        // Dark bottom edge
        ctx.fillStyle = p.dark;
        ctx.fillRect(x + 1, y + s - 4, s - 2, 3);

        // Specular dot
        ctx.fillStyle = '#ffffff55';
        ctx.beginPath();
        ctx.arc(x + 7, y + 7, 2, 0, Math.PI * 2);
        ctx.fill();

    } else if (style === 'diamond') {
        const cx = x + s / 2, cy = y + s / 2;
        const hw = s / 2 - 2; // half-width

        // Base diamond
        ctx.fillStyle = p.base;
        ctx.beginPath();
        ctx.moveTo(cx, cy - hw);       // top
        ctx.lineTo(cx + hw, cy);       // right
        ctx.lineTo(cx, cy + hw);       // bottom
        ctx.lineTo(cx - hw, cy);       // left
        ctx.closePath();
        ctx.fill();

        // Light top-right facet
        ctx.fillStyle = p.light;
        ctx.beginPath();
        ctx.moveTo(cx, cy - hw);       // top
        ctx.lineTo(cx + hw, cy);       // right
        ctx.lineTo(cx, cy);            // center
        ctx.closePath();
        ctx.fill();

        // Dark bottom-left facet
        ctx.fillStyle = p.dark;
        ctx.beginPath();
        ctx.moveTo(cx, cy + hw);       // bottom
        ctx.lineTo(cx - hw, cy);       // left
        ctx.lineTo(cx, cy);            // center
        ctx.closePath();
        ctx.fill();

        // Specular center highlight
        ctx.fillStyle = '#ffffff55';
        ctx.beginPath();
        ctx.arc(cx, cy - hw * 0.3, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    if (glow) { ctx.shadowBlur = 0; }
};

// === OVERRIDE R.drawSpawnPieces() ===
const origDrawSpawnPieces = R.drawSpawnPieces.bind(R);
R.drawSpawnPieces = function (pieces, selIdx) {
    const theme = getTheme();
    const ctx = this.ctx;
    const bx = this.bx, by = this.sy, sw = 80, sp = 10;

    for (let i = 0; i < pieces.length; i++) {
        const pc = pieces[i]; if (!pc) continue;
        const sx = bx + i * (sw + sp);

        // Slot background: selected uses lighter gridLine, normal uses gridBg
        ctx.fillStyle = i === selIdx ? theme.gridLine : theme.gridBg;
        ctx.strokeStyle = theme.gridLine;
        ctx.lineWidth = 1;
        ctx.fillRect(sx, by, sw, sw);
        ctx.strokeRect(sx, by, sw, sw);

        let mr = 0, mc = 0;
        for (const [r, c] of pc.cells) { if (r > mr) mr = r; if (c > mc) mc = c; }
        const ox = sx + (sw - (mc + 1) * 12) / 2;
        const oy = by + (sw - (mr + 1) * 12) / 2;
        const p = theme.palette[pc.color];
        if (!p) continue;

        for (const [r, c] of pc.cells) {
            const cx = ox + c * 12, cy = oy + r * 12;
            ctx.fillStyle = p.base; ctx.fillRect(cx, cy, 11, 11);
            ctx.fillStyle = p.light; ctx.fillRect(cx, cy, 11, 2); ctx.fillRect(cx, cy, 2, 11);
            ctx.fillStyle = p.dark; ctx.fillRect(cx + 9, cy, 2, 11); ctx.fillRect(cx, cy + 9, 11, 2);
        }
    }
};

// === EXPOSE ===
Game.getTheme = getTheme;
Game.THEMES = THEMES;

})();
