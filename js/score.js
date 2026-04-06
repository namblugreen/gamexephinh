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
