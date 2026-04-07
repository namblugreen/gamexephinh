// ========================================
// BLOCK BLAST PIXEL — All-in-one bundle v2
// Enhanced effects + drag fix
// ========================================

window.Game = {};

(function() {
'use strict';

// === STORAGE ===
const KEYS = {
    settings: 'bbp_settings',
    leaderboard: (mode) => `bbp_leaderboard_${mode}`,
    daily: (date) => `bbp_daily_${date}`,
};
const DEFAULT_SETTINGS = { sfxEnabled: true, musicEnabled: true, sfxVolume: 0.7, musicVolume: 0.5, theme: 'default' };

const Storage = {
    getSettings() {
        const raw = localStorage.getItem(KEYS.settings);
        if (!raw) return { ...DEFAULT_SETTINGS };
        return JSON.parse(raw);
    },
    saveSettings(s) { localStorage.setItem(KEYS.settings, JSON.stringify(s)); },
    getLeaderboard(mode) {
        const raw = localStorage.getItem(KEYS.leaderboard(mode));
        return raw ? JSON.parse(raw) : [];
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
        return lb.length < 10 || score > lb[lb.length - 1].score;
    },
    getDailyStatus(d) { const raw = localStorage.getItem(KEYS.daily(d)); return raw ? JSON.parse(raw) : null; },
    saveDailyResult(d, score) { localStorage.setItem(KEYS.daily(d), JSON.stringify(score)); },
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
};

// === ONLINE LEADERBOARD ===
const JSONBIN_ID = '69d486bdaaba882197d01cc1';
const JSONBIN_KEY = '$2a$10$I45bsPxNB8Q7dzUBNrqayOK5JkDaK31YuB4.7wiYedrefWUA/tDs6';
let onlineLeaderboard = null; // cache

const OnlineLB = {
    async fetch() {
        try {
            const res = await fetch('https://api.jsonbin.io/v3/b/' + JSONBIN_ID + '/latest', {
                headers: {
                    'X-Master-Key': JSONBIN_KEY,
                    'X-Bin-Meta': 'false',
                }
            });
            if (!res.ok) { console.log('OnlineLB fetch fail:', res.status); return null; }
            const data = await res.json();
            onlineLeaderboard = data || { classic: [], timeattack: [], daily: [] };
            return onlineLeaderboard;
        } catch (e) { console.log('OnlineLB fetch error:', e); return null; }
    },
    async addScore(mode, name, score) {
        try {
            // Luôn fetch mới nhất trước để tránh ghi đè điểm người khác
            const freshLb = await this.fetch();
            const lb = freshLb || { classic: [], timeattack: [], daily: [] };
            if (!lb[mode]) lb[mode] = [];
            lb[mode].push({ name, score, date: new Date().toISOString() });
            lb[mode].sort((a, b) => b.score - a.score);
            lb[mode] = lb[mode].slice(0, 20);
            const res = await fetch('https://api.jsonbin.io/v3/b/' + JSONBIN_ID, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_KEY,
                },
                body: JSON.stringify(lb),
            });
            if (res.ok) onlineLeaderboard = lb;
            else console.log('OnlineLB save fail:', res.status);
            return res.ok;
        } catch (e) { console.log('OnlineLB save error:', e); return false; }
    },
    getCache() { return onlineLeaderboard; },
};

Game.Storage = Storage;
Game.OnlineLB = OnlineLB;

// === BOARD ===
const Board = {
    create() { return Array.from({ length: 8 }, () => Array(8).fill(0)); },
    clone(b) { return b.map(r => [...r]); },
    canPlace(b, piece, row, col) {
        for (const [dr, dc] of piece.cells) {
            const r = row + dr, c = col + dc;
            if (r < 0 || r >= 8 || c < 0 || c >= 8 || b[r][c] !== 0) return false;
        }
        return true;
    },
    place(b, piece, row, col) {
        for (const [dr, dc] of piece.cells) b[row + dr][col + dc] = piece.color;
    },
    checkAndClearLines(b) {
        const rows = [], cols = [];
        for (let r = 0; r < 8; r++) if (b[r].every(c => c !== 0)) rows.push(r);
        for (let c = 0; c < 8; c++) {
            let full = true;
            for (let r = 0; r < 8; r++) if (b[r][c] === 0) { full = false; break; }
            if (full) cols.push(c);
        }
        const cleared = new Set();
        for (const r of rows) for (let c = 0; c < 8; c++) cleared.add(r + ',' + c);
        for (const c of cols) for (let r = 0; r < 8; r++) cleared.add(r + ',' + c);
        // Save colors before clearing
        const cellsWithColor = [];
        for (const key of cleared) {
            const p = key.split(',').map(Number);
            cellsWithColor.push({ r: p[0], c: p[1], color: b[p[0]][p[1]] });
            b[p[0]][p[1]] = 0;
        }
        return { rows, cols, totalLines: rows.length + cols.length, cellsCleared: cellsWithColor };
    },
    canPlaceAny(b, piece) {
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (this.canPlace(b, piece, r, c)) return true;
        return false;
    },
    getOccupiedCount(b) {
        let n = 0;
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (b[r][c]) n++;
        return n;
    },
};
Game.Board = Board;

// === PIECES ===
const Pieces = {
    SHAPES: [
        { name: '1x1', cells: [[0,0]] },
        { name: '1x2', cells: [[0,0],[0,1]] },
        { name: '1x3', cells: [[0,0],[0,1],[0,2]] },
        { name: '1x4', cells: [[0,0],[0,1],[0,2],[0,3]] },
        { name: '1x5', cells: [[0,0],[0,1],[0,2],[0,3],[0,4]] },
        { name: '2x1', cells: [[0,0],[1,0]] },
        { name: '3x1', cells: [[0,0],[1,0],[2,0]] },
        { name: '4x1', cells: [[0,0],[1,0],[2,0],[3,0]] },
        { name: '5x1', cells: [[0,0],[1,0],[2,0],[3,0],[4,0]] },
        { name: '2x3', cells: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]] },
        { name: '3x2', cells: [[0,0],[0,1],[1,0],[1,1],[2,0],[2,1]] },
        { name: '2x2', cells: [[0,0],[0,1],[1,0],[1,1]] },
        { name: '3x3', cells: [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2],[2,0],[2,1],[2,2]] },
        { name: 'L1', cells: [[0,0],[1,0],[1,1]] },
        { name: 'L2', cells: [[0,0],[0,1],[1,0]] },
        { name: 'L3', cells: [[0,0],[0,1],[1,1]] },
        { name: 'L4', cells: [[0,1],[1,0],[1,1]] },
        { name: 'bigL1', cells: [[0,0],[1,0],[2,0],[2,1],[2,2]] },
        { name: 'bigL2', cells: [[0,0],[0,1],[0,2],[1,0],[2,0]] },
        { name: 'bigL3', cells: [[0,0],[0,1],[0,2],[1,2],[2,2]] },
        { name: 'bigL4', cells: [[0,2],[1,2],[2,0],[2,1],[2,2]] },
        { name: 'T', cells: [[0,0],[0,1],[0,2],[1,1]] },
        { name: 'S', cells: [[0,1],[0,2],[1,0],[1,1]] },
        { name: 'Z', cells: [[0,0],[0,1],[1,1],[1,2]] },
    ],
    COLORS: 7,
    randomPiece() {
        const s = this.SHAPES[Math.floor(Math.random() * this.SHAPES.length)];
        return { ...s, color: Math.floor(Math.random() * this.COLORS) + 1 };
    },
    spawnSet() { return [this.randomPiece(), this.randomPiece(), this.randomPiece()]; },
    createSeededRng(seed) {
        let s = seed;
        return () => { s = (s * 1664525 + 1013904223) & 0xFFFFFFFF; return (s >>> 0) / 0xFFFFFFFF; };
    },
    seededRandomPiece(rng) {
        const s = this.SHAPES[Math.floor(rng() * this.SHAPES.length)];
        return { ...s, color: Math.floor(rng() * this.COLORS) + 1 };
    },
    seededSpawnSet(rng) { return [this.seededRandomPiece(rng), this.seededRandomPiece(rng), this.seededRandomPiece(rng)]; },
};
Game.Pieces = Pieces;

// === SCORE ===
const COMBO_MUL = { 1: 1, 2: 3, 3: 5 };
const Score = {
    create() { return { score: 0, streak: 0, combo: 0 }; },
    addPlacement(st, n) { st.score += n * 10; },
    addLineClear(st, lines) {
        const mul = lines >= 4 ? 8 : (COMBO_MUL[lines] || 0);
        const lineScore = lines * 100 * mul;
        st.score += lineScore;
        st.streak += 1;
        const streakBonus = st.streak * 50;
        st.score += streakBonus;
        st.combo = mul;
        return { comboMultiplier: mul, lineScore, streakBonus };
    },
    resetStreak(st) { st.streak = 0; st.combo = 0; },
};
Game.Score = Score;

// === MODES ===
function dateSeed() {
    const t = new Date();
    const s = '' + t.getFullYear() + (t.getMonth()+1).toString().padStart(2,'0') + t.getDate().toString().padStart(2,'0');
    let h = 0; for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h &= h; }
    return Math.abs(h);
}
const Modes = {
    create(type) {
        if (type === 'timeattack') return { type, hasTimer: true, timeLeft: 180 };
        if (type === 'daily') return { type, hasTimer: false, seed: dateSeed() };
        return { type: 'classic', hasTimer: false };
    },
    addTimeBonus(m, lines) { if (m.hasTimer) m.timeLeft += lines * 3; },
    tick(m, dt) { if (m.hasTimer) m.timeLeft = Math.max(0, m.timeLeft - dt); },
    isTimeUp(m) { return m.hasTimer && m.timeLeft <= 0; },
    getTodayString() {
        const d = new Date();
        return d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2,'0') + '-' + d.getDate().toString().padStart(2,'0');
    },
};

// === AUDIO ===
let audioCtx = null, masterSfxGain = null, masterMusicGain = null;
function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterSfxGain = audioCtx.createGain(); masterSfxGain.gain.value = 0.7; masterSfxGain.connect(audioCtx.destination);
        masterMusicGain = audioCtx.createGain(); masterMusicGain.gain.value = 0.5; masterMusicGain.connect(audioCtx.destination);
    }
    return audioCtx;
}
function playTone(freq, dur, type, gv, dest) {
    type = type || 'square'; gv = gv || 0.3;
    const ctx = getAudioCtx(), osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(gv, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g); g.connect(dest || masterSfxGain);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);
}
function playNoise(dur, gv) {
    gv = gv || 0.1; const ctx = getAudioCtx();
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.setValueAtTime(gv, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(g); g.connect(masterSfxGain); src.start();
}
const Audio = {
    sfxEnabled: true, musicEnabled: true, musicInterval: null, tempoMultiplier: 1,
    init(s) { this.sfxEnabled = s.sfxEnabled; this.musicEnabled = s.musicEnabled; },
    resume() { const c = getAudioCtx(); if (c.state === 'suspended') c.resume(); },
    playPlace() { if (!this.sfxEnabled) return; playTone(200, 0.1, 'square', 0.2); playNoise(0.05, 0.05); },
    playClear(n) { if (!this.sfxEnabled) return; const f = 400 + n * 100; playTone(f, 0.15, 'square', 0.25); setTimeout(() => playTone(f*1.5, 0.15, 'square', 0.2), 80); },
    playCombo(lv) { if (!this.sfxEnabled) return; [523,659,784,1047].slice(0, Math.min(lv+1,4)).forEach((f,i) => setTimeout(() => playTone(f, 0.12, 'square', 0.2), i*60)); },
    playStreak() { if (!this.sfxEnabled) return; playTone(880, 0.08, 'triangle', 0.15); },
    playUndo() { if (!this.sfxEnabled) return; playTone(600, 0.1, 'sawtooth', 0.15); setTimeout(() => playTone(400, 0.1, 'sawtooth', 0.1), 60); },
    playGameOver() { if (!this.sfxEnabled) return; [440,370,330,262].forEach((f,i) => setTimeout(() => playTone(f, 0.3, 'triangle', 0.2), i*200)); },
    playClick() { if (!this.sfxEnabled) return; playTone(1000, 0.05, 'square', 0.1); },
    playInvalid() { if (!this.sfxEnabled) return; playTone(150, 0.15, 'sawtooth', 0.2); },
    setTempo(m) { this.tempoMultiplier = m; },
    startMusic() {
        if (!this.musicEnabled) return; this.stopMusic();
        const melodies = [
            [262,294,330,349,392,349,330,294,262,0,392,440,392,349,330,294],
            [330,330,0,330,0,262,330,392,0,196,0,262,0,196,0,165],
            [392,392,0,392,330,392,440,0,392,330,262,294,330,0,294,262],
        ];
        const mel = melodies[Math.floor(Math.random() * melodies.length)];
        let ni = 0; const self = this;
        const play = () => { if (!self.musicEnabled) return; const f = mel[ni % mel.length]; if (f > 0) { playTone(f, 0.15, 'triangle', 0.12, masterMusicGain); playTone(f/2, 0.15, 'square', 0.06, masterMusicGain); } ni++; };
        play(); this.musicInterval = setInterval(play, 250 / this.tempoMultiplier);
    },
    stopMusic() { if (this.musicInterval) { clearInterval(this.musicInterval); this.musicInterval = null; } },
};
Game.Audio = Audio;

function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// === RENDERER ===
const CELL = 32, GSIZ = 8, BPAD = 20;
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const CPAL = {
    1: { light: '#ff6b6b', base: '#ee4444', dark: '#bb2222' },
    2: { light: '#ffa94d', base: '#ff8822', dark: '#cc6600' },
    3: { light: '#ffe066', base: '#ffcc00', dark: '#cc9900' },
    4: { light: '#69db7c', base: '#44bb44', dark: '#228822' },
    5: { light: '#74c0fc', base: '#4488ee', dark: '#2266bb' },
    6: { light: '#b197fc', base: '#8844ee', dark: '#6622bb' },
    7: { light: '#faa2c1', base: '#ee4488', dark: '#bb2266' },
};
const BG = '#1a1a2e', GBG = '#2a2a4a', GL = '#3a3a5a';

const R = {
    canvas: null, ctx: null, bx: 0, by: 0, sy: 0, cw: 0, ch: 0,
    shakeX: 0, shakeY: 0, shakeTime: 0,
    init(c) { this.canvas = c; this.ctx = c.getContext('2d'); this.resize(); },
    resize() {
        const bp = GSIZ * CELL;
        this.cw = bp + BPAD * 2 + 200; this.ch = bp + BPAD * 2 + 160;
        this.canvas.width = this.cw; this.canvas.height = this.ch;
        this.bx = BPAD; this.by = 50; this.sy = this.by + bp + 20;
    },
    shake(intensity) { this.shakeTime = 0.3; this.shakeIntensity = intensity || 4; },
    updateShake(dt) {
        if (this.shakeTime > 0) {
            this.shakeTime -= dt;
            const i = this.shakeIntensity * (this.shakeTime / 0.3);
            this.shakeX = (Math.random() - 0.5) * i * 2;
            this.shakeY = (Math.random() - 0.5) * i * 2;
        } else { this.shakeX = 0; this.shakeY = 0; }
    },
    clear() { this.ctx.fillStyle = BG; this.ctx.fillRect(0, 0, this.cw, this.ch); },
    drawCell(x, y, cid, glow) {
        const ctx = this.ctx, p = CPAL[cid], s = CELL;
        if (glow) {
            ctx.shadowColor = p.light; ctx.shadowBlur = 12;
        }
        ctx.fillStyle = p.base; ctx.fillRect(x+1, y+1, s-2, s-2);
        ctx.fillStyle = p.light; ctx.fillRect(x+1, y+1, s-2, 3); ctx.fillRect(x+1, y+1, 3, s-2);
        ctx.fillStyle = p.dark; ctx.fillRect(x+1, y+s-4, s-2, 3); ctx.fillRect(x+s-4, y+1, 3, s-2);
        ctx.fillStyle = '#ffffff44'; ctx.fillRect(x+4, y+4, 4, 4);
        if (glow) { ctx.shadowBlur = 0; }
    },
    drawGrid(board) {
        const ctx = this.ctx, bx = this.bx + this.shakeX, by = this.by + this.shakeY;
        ctx.fillStyle = GBG; ctx.fillRect(bx, by, GSIZ*CELL, GSIZ*CELL);
        ctx.strokeStyle = GL; ctx.lineWidth = 1;
        for (let i = 0; i <= GSIZ; i++) {
            ctx.beginPath(); ctx.moveTo(bx+i*CELL, by); ctx.lineTo(bx+i*CELL, by+GSIZ*CELL); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(bx, by+i*CELL); ctx.lineTo(bx+GSIZ*CELL, by+i*CELL); ctx.stroke();
        }
        for (let r = 0; r < GSIZ; r++) for (let c = 0; c < GSIZ; c++) if (board[r][c] !== 0) this.drawCell(bx+c*CELL, by+r*CELL, board[r][c]);
    },
    drawPreview(board, piece, row, col, canPlace) {
        if (row === null || col === null) return;
        const ctx = this.ctx, bx = this.bx + this.shakeX, by = this.by + this.shakeY;
        for (const [dr, dc] of piece.cells) {
            const r = row + dr, c = col + dc;
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                if (canPlace) {
                    // Valid: show piece color with glow
                    const p = CPAL[piece.color];
                    ctx.shadowColor = p.light; ctx.shadowBlur = 8;
                    ctx.fillStyle = p.base + '88';
                    ctx.fillRect(bx+c*CELL+1, by+r*CELL+1, CELL-2, CELL-2);
                    ctx.shadowBlur = 0;
                } else {
                    // Invalid: red tint
                    ctx.fillStyle = '#ff000044';
                    ctx.fillRect(bx+c*CELL+1, by+r*CELL+1, CELL-2, CELL-2);
                    // Red X
                    ctx.strokeStyle = '#ff000088'; ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.moveTo(bx+c*CELL+6, by+r*CELL+6); ctx.lineTo(bx+c*CELL+CELL-6, by+r*CELL+CELL-6); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(bx+c*CELL+CELL-6, by+r*CELL+6); ctx.lineTo(bx+c*CELL+6, by+r*CELL+CELL-6); ctx.stroke();
                }
            }
        }
    },
    drawSpawnPieces(pieces, selIdx) {
        const ctx = this.ctx, bx = this.bx, by = this.sy, sw = 80, sp = 10;
        for (let i = 0; i < pieces.length; i++) {
            const pc = pieces[i]; if (!pc) continue;
            const sx = bx + i * (sw + sp);
            ctx.fillStyle = i === selIdx ? '#4a4a6a' : '#2a2a4a';
            ctx.strokeStyle = '#5a5a7a'; ctx.lineWidth = 1;
            ctx.fillRect(sx, by, sw, sw); ctx.strokeRect(sx, by, sw, sw);
            let mr = 0, mc = 0;
            for (const [r, c] of pc.cells) { if (r > mr) mr = r; if (c > mc) mc = c; }
            const ox = sx + (sw - (mc+1)*12) / 2, oy = by + (sw - (mr+1)*12) / 2;
            const p = CPAL[pc.color];
            for (const [r, c] of pc.cells) {
                const cx = ox+c*12, cy = oy+r*12;
                ctx.fillStyle = p.base; ctx.fillRect(cx, cy, 11, 11);
                ctx.fillStyle = p.light; ctx.fillRect(cx, cy, 11, 2); ctx.fillRect(cx, cy, 2, 11);
                ctx.fillStyle = p.dark; ctx.fillRect(cx+9, cy, 2, 11); ctx.fillRect(cx, cy+9, 11, 2);
            }
        }
    },
    drawDragging(piece, mx, my) {
        if (!piece) return;
        const yOff = isMobile ? -CELL * 2 : -CELL;
        for (const [r, c] of piece.cells) this.drawCell(mx+c*CELL-CELL/2, my+r*CELL+yOff, piece.color, true);
    },
    drawScorePanel(sc, hi, undo, mode) {
        const ctx = this.ctx, px = this.bx + GSIZ*CELL + 20, py = this.by;
        ctx.fillStyle = '#fff'; ctx.font = '8px "Press Start 2P"';
        ctx.fillText('DIEM', px, py+10);
        ctx.font = '12px "Press Start 2P"'; ctx.fillText(''+sc.score, px, py+30);
        ctx.font = '8px "Press Start 2P"'; ctx.fillText('KY LUC', px, py+60);
        ctx.font = '12px "Press Start 2P"'; ctx.fillText(''+hi, px, py+80);
        ctx.font = '8px "Press Start 2P"'; ctx.fillText('CHUOI', px, py+110);
        ctx.fillStyle = '#2a2a4a'; ctx.fillRect(px, py+120, 80, 12);
        const sf = Math.min(sc.streak / 10, 1);
        ctx.fillStyle = sc.streak >= 5 ? '#ff4444' : sc.streak >= 3 ? '#ffcc00' : '#44bb44';
        ctx.fillRect(px, py+120, 80*sf, 12);
        // Streak glow
        if (sc.streak >= 3) { ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 8; ctx.fillRect(px, py+120, 80*sf, 12); ctx.shadowBlur = 0; }
        ctx.fillStyle = '#fff'; ctx.fillText('x'+sc.streak, px+85, py+130);
        ctx.fillText('HOAN TAC: '+undo, px, py+160);
        const modeVi = {classic:'CO DIEN',timeattack:'VUOT T.GIAN',daily:'HANG NGAY'};
        ctx.fillStyle = '#aaa'; ctx.fillText(modeVi[mode]||mode.toUpperCase(), px, py+190);
    },
    drawComboText(text, alpha, scale) {
        if (alpha <= 0) return;
        const ctx = this.ctx; ctx.save(); ctx.globalAlpha = alpha;
        const cx = this.bx + (GSIZ*CELL)/2, cy = this.by + (GSIZ*CELL)/2;
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        // Glow
        ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 20;
        ctx.fillStyle = '#ffcc00'; ctx.font = '16px "Press Start 2P"'; ctx.textAlign = 'center';
        ctx.fillText(text, 0, 0);
        // Outline
        ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 1; ctx.strokeText(text, 0, 0);
        ctx.restore(); ctx.textAlign = 'left'; ctx.shadowBlur = 0;
    },
    drawTimer(tl) {
        const ctx = this.ctx;
        const ts = Math.floor(tl/60) + ':' + Math.floor(tl%60).toString().padStart(2,'0');
        ctx.fillStyle = tl < 30 ? '#ff4444' : '#fff'; ctx.font = '12px "Press Start 2P"'; ctx.textAlign = 'center';
        if (tl < 30) { ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 10; }
        ctx.fillText(ts, this.bx+(GSIZ*CELL)/2, this.by-10);
        ctx.textAlign = 'left'; ctx.shadowBlur = 0;
    },
    drawPause() {
        const ctx = this.ctx; ctx.fillStyle = '#000000cc'; ctx.fillRect(0,0,this.cw,this.ch);
        ctx.fillStyle = '#fff'; ctx.font = '16px "Press Start 2P"'; ctx.textAlign = 'center';
        ctx.fillText('TAM DUNG', this.cw/2, this.ch/2-10);
        ctx.font = '8px "Press Start 2P"'; ctx.fillText('Nhan ESC de tiep tuc', this.cw/2, this.ch/2+20); ctx.textAlign = 'left';
    },
    drawGameOver(score) {
        const ctx = this.ctx; ctx.fillStyle = '#000000cc'; ctx.fillRect(0,0,this.cw,this.ch);
        ctx.fillStyle = '#ff4444'; ctx.font = '16px "Press Start 2P"'; ctx.textAlign = 'center';
        ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 15;
        ctx.fillText('KET THUC', this.cw/2, this.ch/2-30);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff'; ctx.font = '10px "Press Start 2P"';
        ctx.fillText('Diem: '+score, this.cw/2, this.ch/2+10);
        ctx.font = '8px "Press Start 2P"'; ctx.fillText('Nhan de tiep tuc', this.cw/2, this.ch/2+40); ctx.textAlign = 'left';
    },
    screenToGrid(x, y) {
        const col = Math.floor((x - this.bx) / CELL), row = Math.floor((y - this.by) / CELL);
        if (row >= 0 && row < 8 && col >= 0 && col < 8) return { row, col };
        return null;
    },
    // Convert drag mouse position to grid position (accounting for visual offset)
    dragToGrid(mx, my) {
        const adjX = mx;
        const adjY = isMobile ? my - CELL * 1.5 : my - CELL / 2;
        return this.screenToGrid(adjX, adjY);
    },
    getSpawnSlot(x, y) {
        const sw = 80, sp = 10;
        for (let i = 0; i < 3; i++) {
            const sx = this.bx + i * (sw + sp);
            if (x >= sx && x < sx + sw && y >= this.sy && y < this.sy + sw) return i;
        }
        return -1;
    },
};
Game.R = R; Game.CPAL = CPAL; Game.CELL = CELL; Game.GSIZ = GSIZ;

// === EFFECTS ===
const particles = [];
const floatTexts = [];
const flashCells = []; // {r, c, alpha, color}
const lineExplosions = []; // {type:'row'|'col', index, progress, color, cells}
const shockwaves = []; // {x, y, radius, maxRadius, alpha, color}

function spawnLineExplosion(rows, cols, cellsWithColor) {
    // Sweep effect per row
    for (const r of rows) {
        const rowCells = cellsWithColor.filter(c => c.r === r);
        lineExplosions.push({ type: 'row', index: r, progress: 0, alpha: 1, cells: rowCells });
        // Shockwave from center of row
        const cx = R.bx + 4 * CELL;
        const cy = R.by + r * CELL + CELL / 2;
        shockwaves.push({ x: cx, y: cy, radius: 0, maxRadius: CELL * 5, alpha: 1, color: '#ffffff' });
    }
    // Sweep effect per col
    for (const c of cols) {
        const colCells = cellsWithColor.filter(cl => cl.c === c);
        lineExplosions.push({ type: 'col', index: c, progress: 0, alpha: 1, cells: colCells });
        const cx = R.bx + c * CELL + CELL / 2;
        const cy = R.by + 4 * CELL;
        shockwaves.push({ x: cx, y: cy, radius: 0, maxRadius: CELL * 5, alpha: 1, color: '#ffffff' });
    }
    // Spawn intense particles per cell with its own color
    for (const cell of cellsWithColor) {
        const pal = CPAL[cell.color];
        if (!pal) continue;
        const cx = R.bx + cell.c * CELL + CELL / 2;
        const cy = R.by + cell.r * CELL + CELL / 2;
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 80 + Math.random() * 160;
            particles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 5, color: pal.base, life: 1.2,
                colorLight: pal.light,
            });
        }
        // White flash on each cleared cell
        flashCells.push({ r: cell.r, c: cell.c, alpha: 1.5, color: '#ffffff' });
    }
}

function spawnParticles(cells, colorId, count) {
    const p = CPAL[colorId]; if (!p) return;
    count = count || 6;
    for (const [r, c] of cells) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 100;
            particles.push({
                x: R.bx + c*CELL + CELL/2, y: R.by + r*CELL + CELL/2,
                vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 4, color: p.base, life: 1,
                colorLight: p.light,
            });
        }
    }
}

function spawnPlaceEffect(cells, colorId) {
    for (const [r, c] of cells) {
        flashCells.push({ r, c, alpha: 1, color: CPAL[colorId].light });
    }
}

function spawnFloatText(text, x, y, color) {
    floatTexts.push({ text, x, y, vy: -40, alpha: 1, color: color || '#ffcc00', scale: 1 });
}

function spawnScorePopup(points, row, col) {
    const x = R.bx + col * CELL + CELL/2 + R.shakeX;
    const y = R.by + row * CELL + R.shakeY;
    spawnFloatText('+' + points, x, y, '#ffffff');
}

function spawnComboPopup(mul) {
    const colors = ['#44bb44', '#ffcc00', '#ff8800', '#ff4444'];
    const ci = Math.min(mul - 1, colors.length - 1);
    const x = R.bx + (GSIZ * CELL) / 2;
    const y = R.by + (GSIZ * CELL) / 2 + 30;
    spawnFloatText('x' + mul + ' BONUS!', x, y, colors[ci]);
}
Game.spawnParticles = spawnParticles; Game.spawnPlaceEffect = spawnPlaceEffect; Game.spawnFloatText = spawnFloatText; Game.spawnLineExplosion = spawnLineExplosion;

function updateEffects(ctx, dt) {
    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += 80 * dt; // gravity
        p.life -= dt * 1.8;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life;
        // Glow
        ctx.shadowColor = p.colorLight; ctx.shadowBlur = 6;
        ctx.fillStyle = p.life > 0.5 ? p.colorLight : p.color;
        ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;

    // Flash cells (place effect)
    for (let i = flashCells.length - 1; i >= 0; i--) {
        const f = flashCells[i];
        f.alpha -= dt * 4;
        if (f.alpha <= 0) { flashCells.splice(i, 1); continue; }
        ctx.globalAlpha = f.alpha * 0.6;
        ctx.fillStyle = f.color;
        const x = R.bx + f.c * CELL + R.shakeX, y = R.by + f.r * CELL + R.shakeY;
        ctx.fillRect(x, y, CELL, CELL);
        // White center flash
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = f.alpha * 0.3;
        const shrink = (1 - f.alpha) * CELL/2;
        ctx.fillRect(x + shrink, y + shrink, CELL - shrink*2, CELL - shrink*2);
    }
    ctx.globalAlpha = 1;

    // Line explosion sweep effect
    for (let i = lineExplosions.length - 1; i >= 0; i--) {
        const le = lineExplosions[i];
        le.progress += dt * 3.5; // speed of sweep
        le.alpha -= dt * 2.5;
        if (le.alpha <= 0) { lineExplosions.splice(i, 1); continue; }
        ctx.save();
        if (le.type === 'row') {
            // Horizontal light sweep across the row
            const sweepX = R.bx + le.progress * CELL * 8;
            const y = R.by + le.index * CELL + R.shakeY;
            const grad = ctx.createLinearGradient(sweepX - CELL * 2, 0, sweepX + CELL * 2, 0);
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(0.5, 'rgba(255,255,255,' + (le.alpha * 0.8) + ')');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(R.bx + R.shakeX, y, CELL * 8, CELL);
        } else {
            // Vertical light sweep down the column
            const sweepY = R.by + le.progress * CELL * 8;
            const x = R.bx + le.index * CELL + R.shakeX;
            const grad = ctx.createLinearGradient(0, sweepY - CELL * 2, 0, sweepY + CELL * 2);
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(0.5, 'rgba(255,255,255,' + (le.alpha * 0.8) + ')');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(x, R.by + R.shakeY, CELL, CELL * 8);
        }
        ctx.restore();
    }

    // Shockwave rings
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += dt * 300;
        sw.alpha -= dt * 2.5;
        if (sw.alpha <= 0 || sw.radius > sw.maxRadius) { shockwaves.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = sw.alpha * 0.5;
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 3;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(sw.x + R.shakeX, sw.y + R.shakeY, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // Float texts
    for (let i = floatTexts.length - 1; i >= 0; i--) {
        const f = floatTexts[i];
        f.y += f.vy * dt;
        f.alpha -= dt * 1.5;
        f.scale += dt * 0.5;
        if (f.alpha <= 0) { floatTexts.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = f.alpha;
        ctx.fillStyle = f.color;
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.shadowColor = f.color; ctx.shadowBlur = 8;
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
    }
    ctx.shadowBlur = 0; ctx.textAlign = 'left';
}

// === INPUT ===
const Input = {
    dragging: null, mouseX: 0, mouseY: 0,
    onPiecePickup: null, onPieceDrop: null, onPieceCancel: null, onClick: null,
    init(canvas, renderer) {
        this.renderer = renderer;
        const self = this;
        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            const sx = canvas.width / rect.width, sy = canvas.height / rect.height;
            if (e.touches) return { x: (e.touches[0].clientX - rect.left)*sx, y: (e.touches[0].clientY - rect.top)*sy };
            return { x: (e.clientX - rect.left)*sx, y: (e.clientY - rect.top)*sy };
        };
        canvas.addEventListener('mousedown', (e) => {
            e.preventDefault(); const pos = getPos(e); self.mouseX = pos.x; self.mouseY = pos.y;
            const slot = renderer.getSpawnSlot(pos.x, pos.y);
            if (slot >= 0 && self.onPiecePickup) { const pc = self.onPiecePickup(slot); if (pc) self.dragging = { pieceIndex: slot, piece: pc }; }
        });
        canvas.addEventListener('mousemove', (e) => { e.preventDefault(); const pos = getPos(e); self.mouseX = pos.x; self.mouseY = pos.y; });
        canvas.addEventListener('mouseup', (e) => { self._handleEnd(); });
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); const pos = getPos(e); self.mouseX = pos.x; self.mouseY = pos.y;
            const slot = renderer.getSpawnSlot(pos.x, pos.y);
            if (slot >= 0 && self.onPiecePickup) { const pc = self.onPiecePickup(slot); if (pc) self.dragging = { pieceIndex: slot, piece: pc }; }
        }, { passive: false });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            self.mouseX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
            self.mouseY = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
        }, { passive: false });
        canvas.addEventListener('touchend', (e) => { self._handleEnd(); });
    },
    _handleEnd() {
        if (this.dragging) {
            // FIX: use dragToGrid which accounts for the visual offset of the dragged piece
            const gridPos = this.renderer.dragToGrid(this.mouseX, this.mouseY);
            if (gridPos && this.onPieceDrop) this.onPieceDrop(this.dragging.pieceIndex, gridPos.row, gridPos.col);
            else if (this.onPieceCancel) this.onPieceCancel(this.dragging.pieceIndex);
            this.dragging = null;
        } else if (this.onClick) { this.onClick(this.mouseX, this.mouseY); }
    },
    getGridHover() {
        if (!this.dragging) return null;
        return this.renderer.dragToGrid(this.mouseX, this.mouseY);
    },
};

// === MAIN GAME ===
const ST = { MENU:'menu', PLAY:'playing', PAUSE:'paused', OVER:'gameover', LB:'leaderboard', SET:'settings', NAME:'nameinput' };

let state = ST.MENU;
let settingsHover = -1;
let deleteConfirm = false;
const settingsItems = [
    { key: 'sfxEnabled', label: 'AM THANH', type: 'toggle' },
    { key: 'musicEnabled', label: 'NHAC', type: 'toggle' },
    { key: 'sfxVolume', label: 'AM LUONG', type: 'range' },
    { key: 'musicVolume', label: 'NHAC LUONG', type: 'range' },
    { key: 'theme', label: 'CHU DE', type: 'cycle' },
    { key: 'delete', label: 'XOA DU LIEU', type: 'confirm' },
];
let board = null, pieces = [], scoreState = null, highScore = 0, mode = null, rng = null;
let undosLeft = 3, undoSnapshot = null, comboText = '', comboAlpha = 0, comboScale = 1, lastTime = 0, playerName = '';
let menuHover = -1;
let transitionAlpha = 0;
let prevState = null;
let spawnAnim = 0;
let gameOverAnim = 0;
let powerups = [];
let activePowerup = null;
let powerupScore = 0;
const POWERUP_COST = 300;

const menuBtns = [
    { label: 'CO DIEN', mode: 'classic', x:0, y:0, w:180, h:36 },
    { label: 'VUOT THOI GIAN', mode: 'timeattack', x:0, y:0, w:180, h:36 },
    { label: 'HANG NGAY', mode: 'daily', x:0, y:0, w:180, h:36 },
    { label: 'BANG XEP HANG', mode: 'leaderboard', x:0, y:0, w:180, h:36 },
    { label: 'CAI DAT', mode: 'settings', x:0, y:0, w:180, h:36 },
    { label: 'TOAN MAN HINH', mode: 'fullscreen', x:0, y:0, w:180, h:36 },
];
const continueBtnDef = { label: 'TIEP TUC', mode: 'continue', x:0, y:0, w:180, h:36 };

const canvas = document.getElementById('gameCanvas');
R.init(canvas);
Audio.init(Storage.getSettings());
Input.init(canvas, R);

// Preload Arsenal logo
Game._arsenalImg = new Image();
Game._arsenalImg.src = 'arsenal.png';

Input.onPiecePickup = (i) => {
    if (state !== ST.PLAY || !pieces[i]) return null;
    Audio.resume(); return pieces[i];
};

Input.onPieceDrop = (index, row, col) => {
    if (state !== ST.PLAY) return;
    const piece = pieces[index]; if (!piece) return;
    if (Board.canPlace(board, piece, row, col)) {
        undoSnapshot = { board: Board.clone(board), pieces: [...pieces], scoreState: { ...scoreState } };
        Board.place(board, piece, row, col);
        const pts = piece.cells.length * 10;
        Score.addPlacement(scoreState, piece.cells.length);
        Audio.playPlace();

        // Place effect: flash + score popup
        spawnPlaceEffect(piece.cells.map(([dr,dc]) => [row+dr, col+dc]), piece.color);
        spawnScorePopup(pts, row, col);

        powerupScore += pts;
        while (powerupScore >= POWERUP_COST && powerups.length < 3) {
            const types = ['bom', 'doimau', 'xoay', 'phahang', 'hoandoi', 'ghost'];
            const newPU = types[Math.floor(Math.random() * types.length)];
            powerups.push({ type: newPU });
            powerupScore -= POWERUP_COST;
            spawnFloatText('POWER-UP!', R.bx + (GSIZ*CELL)/2, R.by - 20, '#b197fc');
            Audio.playCombo(2);
        }

        const placedColor = piece.color;
        pieces[index] = null;

        const cleared = Board.checkAndClearLines(board);
        if (cleared.totalLines > 0) {
            // Line explosion effect (sweep + shockwave + per-cell particles)
            spawnLineExplosion(cleared.rows, cleared.cols, cleared.cellsCleared);
            // Screen shake proportional to lines cleared
            R.shake(cleared.totalLines * 3);

            const result = Score.addLineClear(scoreState, cleared.totalLines);
            Audio.playClear(cleared.totalLines);
            Modes.addTimeBonus(mode, cleared.totalLines);

            // Score popup for line clear
            const midR = Math.floor(cleared.cellsCleared.reduce((s,c) => s+c.r, 0) / cleared.cellsCleared.length);
            const midC = Math.floor(cleared.cellsCleared.reduce((s,c) => s+c.c, 0) / cleared.cellsCleared.length);
            spawnScorePopup(result.lineScore + result.streakBonus, midR, midC);

            if (result.comboMultiplier > 1) {
                comboText = 'COMBO x' + result.comboMultiplier + '!';
                comboAlpha = 1; comboScale = 2;
                Audio.playCombo(result.comboMultiplier);
                R.shake(result.comboMultiplier * 2); // screen shake!
                spawnComboPopup(result.comboMultiplier);
            }
            if (scoreState.streak > 1) Audio.playStreak();

            const fill = Board.getOccupiedCount(board) / 64;
            Audio.setTempo(fill > 0.6 ? 1.3 : 1);
        } else {
            Score.resetStreak(scoreState);
        }
        if (pieces.every(p => p === null)) spawnNewPieces();
        checkGameOver();
        autoSave();
    } else {
        Audio.playInvalid();
        R.shake(2); // small shake on invalid
    }
};

Input.onPieceCancel = () => {};

Input.onClick = (x, y) => {
    Audio.resume();
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
                } else if (btn.mode === 'fullscreen') {
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else {
                        document.documentElement.requestFullscreen().catch(() => {});
                    }
                } else {
                    startGame(btn.mode);
                }
                return;
            }
        }
    } else if (state === ST.NAME) {
        const ni = Game._nameInputArea, nb = Game._nameOkBtn;
        if (ni && x >= ni.x && x <= ni.x+ni.w && y >= ni.y && y <= ni.y+ni.h) {
            // Tap on input box - focus hidden input to open mobile keyboard
            mobileInput.value = playerName;
            mobileInput.focus();
        } else if (nb && x >= nb.x && x <= nb.x+nb.w && y >= nb.y && y <= nb.y+nb.h) {
            // Tap OK button
            Audio.playClick();
            submitName();
        }
    } else if (state === ST.OVER) {
        Audio.playClick();
        if (Storage.isTopScore(mode.type, scoreState.score)) { playerName = ''; mobileInput.value = ''; state = ST.NAME; }
        else state = ST.MENU;
    } else if (state === ST.LB) {
        Audio.playClick(); state = ST.MENU; lbFetched = false;
    } else if (state === ST.SET) {
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
                    const midX = item.x + item.w / 2;
                    if (x < midX) {
                        s[item.key] = Math.max(0, Math.round((s[item.key] - 0.1) * 10) / 10);
                    } else {
                        s[item.key] = Math.min(1, Math.round((s[item.key] + 0.1) * 10) / 10);
                    }
                    Storage.saveSettings(s);
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
};

// Hidden input for mobile keyboard
const mobileInput = document.createElement('input');
mobileInput.type = 'text'; mobileInput.maxLength = 10;
mobileInput.autocomplete = 'off'; mobileInput.autocapitalize = 'characters';
mobileInput.style.cssText = 'position:fixed;top:-100px;left:0;opacity:0;font-size:16px;';
document.body.appendChild(mobileInput);

function submitName() {
    if (playerName.length > 0) {
        Storage.addScore(mode.type, playerName, scoreState.score);
        OnlineLB.addScore(mode.type, playerName, scoreState.score);
        if (mode.type === 'daily') Storage.saveDailyResult(Modes.getTodayString(), scoreState.score);
        mobileInput.blur(); mobileInput.value = '';
        state = ST.LB;
    }
}

mobileInput.addEventListener('input', () => {
    if (state === ST.NAME) {
        playerName = mobileInput.value.toUpperCase().slice(0, 10);
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (state === ST.PLAY) { state = ST.PAUSE; Audio.stopMusic(); }
        else if (state === ST.PAUSE) { state = ST.PLAY; Audio.startMusic(); }
    }
    if (e.key === 'z' && state === ST.PLAY) performUndo();
    if (state === ST.NAME) {
        if (e.key === 'Enter') submitName();
        else if (e.key === 'Backspace') { playerName = playerName.slice(0,-1); mobileInput.value = playerName; }
        else if (e.key.length === 1 && playerName.length < 10) { playerName += e.key.toUpperCase(); mobileInput.value = playerName; }
    }
});

function startGame(mType) {
    Storage.clearSave(mType);
    board = Board.create(); scoreState = Score.create(); mode = Modes.create(mType);
    undosLeft = 3; undoSnapshot = null; comboText = ''; comboAlpha = 0;
    powerups = []; activePowerup = null; powerupScore = 0;
    rng = mType === 'daily' ? Pieces.createSeededRng(mode.seed) : null;
    const lb = Storage.getLeaderboard(mType);
    highScore = lb.length > 0 ? lb[0].score : 0;
    spawnNewPieces(); state = ST.PLAY; Audio.startMusic();
}
function spawnNewPieces() { pieces = rng ? Pieces.seededSpawnSet(rng) : Pieces.spawnSet(); spawnAnim = 0; autoSave(); }
function performUndo() {
    if (undosLeft <= 0 || !undoSnapshot) return;
    board = undoSnapshot.board; pieces = undoSnapshot.pieces; scoreState = { ...undoSnapshot.scoreState };
    undoSnapshot = null; undosLeft--; Audio.playUndo();
}
function checkGameOver() {
    const rem = pieces.filter(p => p !== null);
    if (rem.length > 0 && !rem.some(p => Board.canPlaceAny(board, p))) {
        Storage.clearSave(mode.type);
        state = ST.OVER; Audio.stopMusic(); Audio.playGameOver();
    }
}

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
        powerups: [...powerups],
        powerupScore: powerupScore,
    };
    Storage.saveGame(saveData);
}

function loadSavedGame() {
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
    rng = null;
    powerups = save.powerups || [];
    activePowerup = null;
    powerupScore = save.powerupScore || 0;
    comboText = ''; comboAlpha = 0; comboScale = 1;
    state = ST.PLAY;
    Audio.startMusic();
}

// === DRAW SCREENS ===
function drawMenu() {
    const ctx = R.ctx; R.clear();
    // Title glow
    ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffcc00'; ctx.font = '20px "Press Start 2P"'; ctx.textAlign = 'center';
    ctx.fillText('XEP HINH', R.cw/2, 80);
    ctx.shadowColor = '#ff6b6b'; ctx.shadowBlur = 15;
    ctx.fillStyle = '#ff6b6b'; ctx.font = '12px "Press Start 2P"';
    ctx.fillText('PIXEL', R.cw/2, 105);

    ctx.shadowBlur = 0;
    const hasSave = Storage.hasSave();
    const btns = hasSave ? [continueBtnDef, ...menuBtns] : menuBtns;
    const startY = hasSave ? 130 : 150;
    const gap = hasSave ? 42 : 50;
    for (let i = 0; i < btns.length; i++) {
        const btn = btns[i];
        btn.x = (R.cw - btn.w) / 2; btn.y = startY + i * gap;
        const isHover = Input.mouseX >= btn.x && Input.mouseX <= btn.x + btn.w &&
                        Input.mouseY >= btn.y && Input.mouseY <= btn.y + btn.h;
        if (btn.mode === 'continue') {
            // Green styling for continue button
            ctx.shadowColor = '#44bb44'; ctx.shadowBlur = 8;
            ctx.fillStyle = isHover ? '#2a4a2a' : '#1a3a1a'; ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
            ctx.strokeStyle = '#44bb44'; ctx.lineWidth = 2; ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#44bb44'; ctx.font = '8px "Press Start 2P"';
            ctx.fillText(btn.label, R.cw/2, btn.y+22);
        } else {
            // Button with subtle gradient feel
            ctx.fillStyle = isHover ? '#3a3a6a' : '#2a2a4a'; ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
            ctx.fillStyle = '#3a3a5a'; ctx.fillRect(btn.x, btn.y, btn.w, 2); // top highlight
            ctx.strokeStyle = '#5a5a7a'; ctx.lineWidth = 2; ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
            ctx.fillStyle = '#fff'; ctx.font = '8px "Press Start 2P"';
            ctx.fillText(btn.label, R.cw/2, btn.y+22);
        }
    }
    ctx.textAlign = 'left';
}

let lbFetching = false;
let lbFetched = false;

function drawLB() {
    const ctx = R.ctx; R.clear();
    ctx.fillStyle = '#ffcc00'; ctx.font = '12px "Press Start 2P"'; ctx.textAlign = 'center';
    ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 10;
    ctx.fillText('BANG XEP HANG', R.cw/2, 40); ctx.shadowBlur = 0;

    // Tải điểm online khi mở bảng xếp hạng
    if (!lbFetched && !lbFetching) {
        lbFetching = true;
        OnlineLB.fetch().then(() => { lbFetching = false; lbFetched = true; });
    }

    const online = OnlineLB.getCache();
    const modeLabels = {classic:'CO DIEN',timeattack:'VUOT T.GIAN',daily:'HANG NGAY'};
    let y = 70;

    if (lbFetching) {
        ctx.fillStyle = '#aaa'; ctx.font = '8px "Press Start 2P"';
        ctx.fillText('Dang tai...', R.cw/2, y);
        y += 30;
    }

    for (const m of ['classic','timeattack','daily']) {
        ctx.fillStyle = '#ff6b6b'; ctx.font = '8px "Press Start 2P"'; ctx.fillText(modeLabels[m], R.cw/2, y); y += 20;
        // Ưu tiên online, fallback local
        const lb = (online && online[m] && online[m].length > 0) ? online[m] : Storage.getLeaderboard(m);
        ctx.fillStyle = '#fff'; ctx.font = '7px "Press Start 2P"';
        if (!lb.length) { ctx.fillText('Chua co diem', R.cw/2, y); y += 15; }
        else for (let i = 0; i < Math.min(5, lb.length); i++) { ctx.fillText((i+1)+'. '+lb[i].name+' - '+lb[i].score, R.cw/2, y); y += 15; }
        y += 10;
    }

    // Hiển thị nguồn dữ liệu
    ctx.fillStyle = online ? '#44bb44' : '#ff4444';
    ctx.font = '6px "Press Start 2P"';
    ctx.fillText(online ? 'TRUC TUYEN' : 'MAY NAY', R.cw/2, y + 5);

    ctx.fillStyle = '#aaa'; ctx.font = '7px "Press Start 2P"'; ctx.fillText('Nhan de quay lai', R.cw/2, y+25); ctx.textAlign = 'left';
}

function drawSettings() {
    const ctx = R.ctx; R.clear();
    ctx.fillStyle = '#ffcc00'; ctx.font = '12px "Press Start 2P"'; ctx.textAlign = 'center';
    ctx.fillText('CAI DAT', R.cw/2, 50);

    const s = Storage.getSettings();
    const startY = 80, rowH = 35, rowW = 240;
    const rx = (R.cw - rowW) / 2;

    settingsHover = -1;
    const mx = Input.mouseX, my = Input.mouseY;

    for (let i = 0; i < settingsItems.length; i++) {
        const item = settingsItems[i];
        const ry = startY + i * rowH;
        item.x = rx; item.y = ry; item.w = rowW; item.h = rowH - 5;

        if (mx >= rx && mx <= rx + rowW && my >= ry && my <= ry + rowH - 5) settingsHover = i;

        ctx.fillStyle = settingsHover === i ? '#3a3a6a' : '#2a2a4a';
        ctx.fillRect(rx, ry, rowW, rowH - 5);
        ctx.strokeStyle = '#5a5a7a'; ctx.lineWidth = 1;
        ctx.strokeRect(rx, ry, rowW, rowH - 5);

        let valueText = '';
        let valueColor = '#fff';
        if (item.type === 'toggle') {
            valueText = s[item.key] ? 'BAT' : 'TAT';
            valueColor = s[item.key] ? '#44bb44' : '#ff4444';
        } else if (item.type === 'range') {
            valueText = '< ' + Math.round(s[item.key] * 100) + '% >';
            valueColor = '#74c0fc';
        } else if (item.type === 'cycle') {
            const themeNames = { default: 'MAC DINH', retro: 'RETRO XANH', sunset: 'HOANG HON', galaxy: 'GALAXY' };
            valueText = themeNames[s.theme || 'default'] || 'MAC DINH';
            valueColor = '#b197fc';
        } else if (item.type === 'confirm') {
            valueText = deleteConfirm ? 'CHAC CHUA?' : 'NHAN DE XOA';
            valueColor = deleteConfirm ? '#ff4444' : '#aaa';
        }

        ctx.textAlign = 'left'; ctx.font = '7px "Press Start 2P"';
        ctx.fillStyle = '#fff';
        ctx.fillText(item.label, rx + 8, ry + 18);

        ctx.textAlign = 'right';
        ctx.fillStyle = valueColor;
        ctx.fillText(valueText, rx + rowW - 8, ry + 18);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#aaa'; ctx.font = '7px "Press Start 2P"';
    ctx.fillText('Nhan de quay lai', R.cw/2, startY + settingsItems.length * rowH + 20);
    ctx.textAlign = 'left';
}

// Name input touch areas
const nameInputArea = { x: 0, y: 0, w: 0, h: 0 };
const nameOkBtn = { x: 0, y: 0, w: 0, h: 0 };

function drawNameInput() {
    const ctx = R.ctx; R.clear();
    ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffcc00'; ctx.font = '12px "Press Start 2P"'; ctx.textAlign = 'center';
    ctx.fillText('KY LUC MOI!', R.cw/2, 80); ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.font = '16px "Press Start 2P"';
    ctx.fillText(''+scoreState.score, R.cw/2, 120);
    ctx.font = '8px "Press Start 2P"'; ctx.fillText('Nhap ten cua ban:', R.cw/2, 170);

    // Draw input box (tappable on mobile)
    const boxW = 200, boxH = 30, boxX = R.cw/2 - boxW/2, boxY = 185;
    ctx.strokeStyle = '#44bb44'; ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.fillStyle = '#1a1a2e'; ctx.fillRect(boxX+1, boxY+1, boxW-2, boxH-2);
    nameInputArea.x = boxX; nameInputArea.y = boxY; nameInputArea.w = boxW; nameInputArea.h = boxH;

    ctx.font = '12px "Press Start 2P"'; ctx.fillStyle = '#44bb44';
    ctx.shadowColor = '#44bb44'; ctx.shadowBlur = 8;
    ctx.fillText(playerName + (Math.floor(Date.now()/500)%2===0?'_':' '), R.cw/2, 207);
    ctx.shadowBlur = 0;

    // Draw OK button
    const btnW = 100, btnH = 30, btnX = R.cw/2 - btnW/2, btnY = 230;
    const canSubmit = playerName.length > 0;
    ctx.fillStyle = canSubmit ? '#44bb44' : '#555555';
    ctx.fillRect(btnX, btnY, btnW, btnH);
    if (canSubmit) {
        ctx.fillStyle = '#66dd66'; ctx.fillRect(btnX, btnY, btnW, 3);
        ctx.fillStyle = '#228822'; ctx.fillRect(btnX, btnY+btnH-3, btnW, 3);
    }
    ctx.fillStyle = canSubmit ? '#fff' : '#888'; ctx.font = '10px "Press Start 2P"';
    ctx.fillText('OK', R.cw/2, btnY + 20);
    nameOkBtn.x = btnX; nameOkBtn.y = btnY; nameOkBtn.w = btnW; nameOkBtn.h = btnH;

    ctx.fillStyle = '#666'; ctx.font = '6px "Press Start 2P"';
    ctx.fillText('Nhan vao o de nhap ten', R.cw/2, btnY + 55);
    ctx.textAlign = 'left';
}

// Expose for Input click handling
Game._nameInputArea = nameInputArea;
Game._nameOkBtn = nameOkBtn;
Game._submitName = submitName;
Game._mobileInput = mobileInput;

// === GAME LOOP ===
function gameLoop(ts) {
    const dt = Math.min((ts - lastTime) / 1000, 0.05); // cap dt to prevent huge jumps
    lastTime = ts;

    R.updateShake(dt);
    if (Game.getTheme) document.body.style.background = Game.getTheme().bgColor;

    if (comboAlpha > 0) { comboAlpha -= dt * 1.2; comboScale = 1 + comboAlpha * 0.8; }

    if (state !== prevState) {
        transitionAlpha = 1;
        prevState = state;
        if (state === ST.OVER) gameOverAnim = 0;
    }
    if (transitionAlpha > 0) transitionAlpha -= dt * 3;

    switch (state) {
        case ST.MENU: drawMenu(); break;
        case ST.PLAY:
            if (mode.hasTimer) { Modes.tick(mode, dt); if (Modes.isTimeUp(mode)) { state = ST.OVER; Audio.stopMusic(); Audio.playGameOver(); } }
            R.clear(); R.drawGrid(board);
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
            updateEffects(R.ctx, dt);
            R.drawScorePanel(scoreState, highScore, undosLeft, mode.type);
            if (mode.hasTimer) R.drawTimer(mode.timeLeft);
            if (comboAlpha > 0) R.drawComboText(comboText, comboAlpha, comboScale);
            if (Input.dragging) {
                const hover = Input.getGridHover();
                if (hover) {
                    const canPlace = Board.canPlace(board, Input.dragging.piece, hover.row, hover.col);
                    R.drawPreview(board, Input.dragging.piece, hover.row, hover.col, canPlace);
                }
                R.drawDragging(Input.dragging.piece, Input.mouseX, Input.mouseY);
            }
            break;
        case ST.PAUSE: R.clear(); R.drawGrid(Board.create()); R.drawPause(); break;
        case ST.OVER:
            R.clear();
            gameOverAnim = Math.min(1, gameOverAnim + dt * 1.5);
            const goCtx = R.ctx;
            const goBx = R.bx + R.shakeX, goBy = R.by + R.shakeY;
            const goTheme = Game.getTheme ? Game.getTheme() : null;
            goCtx.fillStyle = goTheme ? goTheme.gridBg : '#2a2a4a';
            goCtx.fillRect(goBx, goBy, GSIZ * CELL, GSIZ * CELL);
            // Phase 1: cascade board to gray
            for (let r = 0; r < 8; r++) {
                const rowProgress = Math.max(0, Math.min(1, gameOverAnim * 10 - r * 0.8));
                for (let c = 0; c < 8; c++) {
                    if (board[r][c] !== 0) {
                        if (rowProgress >= 1) {
                            goCtx.fillStyle = '#333344';
                            goCtx.fillRect(goBx + c * CELL + 1, goBy + r * CELL + 1, CELL - 2, CELL - 2);
                        } else {
                            R.drawCell(goBx + c * CELL, goBy + r * CELL, board[r][c]);
                        }
                    }
                }
            }
            // Phase 2: draw Arsenal logo on grid after cascade
            if (gameOverAnim > 0.5) {
                const logoAlpha = Math.min(1, (gameOverAnim - 0.5) * 3);
                goCtx.globalAlpha = logoAlpha;
                const gridSize = GSIZ * CELL;
                if (Game._arsenalImg && Game._arsenalImg.naturalWidth > 0) {
                    // Real image loaded
                    const pad = CELL * 0.3;
                    goCtx.drawImage(Game._arsenalImg, goBx + pad, goBy + pad, gridSize - pad * 2, gridSize - pad * 2);
                } else {
                    // Fallback pixel art cannon: 1=red, 2=gold
                    const logo = [
                        [0,0,0,1,1,1,1,0],
                        [0,0,1,1,2,2,2,2],
                        [0,1,1,1,1,1,1,0],
                        [0,1,1,1,1,1,0,0],
                        [1,1,1,1,1,1,0,0],
                        [1,1,2,2,1,1,0,0],
                        [1,2,1,1,2,1,0,0],
                        [0,1,2,2,1,0,0,0],
                    ];
                    const lc = { 1: '#db0007', 2: '#eec900' };
                    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
                        if (logo[r][c] !== 0) {
                            const cx = goBx + c * CELL, cy = goBy + r * CELL;
                            goCtx.fillStyle = lc[logo[r][c]];
                            goCtx.fillRect(cx + 1, cy + 1, CELL - 2, CELL - 2);
                            goCtx.fillStyle = 'rgba(255,255,255,0.25)';
                            goCtx.fillRect(cx + 1, cy + 1, CELL - 2, 3);
                            goCtx.fillRect(cx + 1, cy + 1, 3, CELL - 2);
                            goCtx.fillStyle = 'rgba(0,0,0,0.25)';
                            goCtx.fillRect(cx + 1, cy + CELL - 4, CELL - 2, 3);
                            goCtx.fillRect(cx + CELL - 4, cy + 1, 3, CELL - 2);
                        }
                    }
                }
                goCtx.globalAlpha = 1;
            }
            if (gameOverAnim > 0.6) {
                const textAlpha = Math.min(1, (gameOverAnim - 0.6) * 2.5);
                goCtx.globalAlpha = textAlpha;
                R.drawGameOver(scoreState.score);
                goCtx.globalAlpha = 1;
            }
            break;
        case ST.LB: drawLB(); break;
        case ST.SET: drawSettings(); break;
        case ST.NAME: drawNameInput(); break;
    }
    if (transitionAlpha > 0) {
        R.ctx.fillStyle = '#000000';
        R.ctx.globalAlpha = Math.max(0, transitionAlpha);
        R.ctx.fillRect(0, 0, R.cw, R.ch);
        R.ctx.globalAlpha = 1;
    }
    requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);

Game.getMasterGains = () => ({ masterSfxGain, masterMusicGain });
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
Game.autoSave = autoSave;
Game.loadSavedGame = loadSavedGame;
Game.continueBtnDef = continueBtnDef;
Game.getPowerups = () => ({ powerups, activePowerup, powerupScore });
Game.setPowerups = (p) => { powerups = p.powerups; activePowerup = p.activePowerup; powerupScore = p.powerupScore; };
Game._ghostActive = false;
Game._puSlots = [];

})();
