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
