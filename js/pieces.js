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
