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
