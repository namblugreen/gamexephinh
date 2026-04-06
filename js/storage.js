const KEYS = {
    settings: 'bbp_settings',
    leaderboard: (mode) => `bbp_leaderboard_${mode}`,
    daily: (date) => `bbp_daily_${date}`,
};

const DEFAULT_SETTINGS = {
    sfxEnabled: true,
    musicEnabled: true,
    sfxVolume: 0.7,
    musicVolume: 0.5,
};

export const Storage = {
    getSettings() {
        const raw = localStorage.getItem(KEYS.settings);
        if (!raw) return { ...DEFAULT_SETTINGS };
        return JSON.parse(raw);
    },

    saveSettings(settings) {
        localStorage.setItem(KEYS.settings, JSON.stringify(settings));
    },

    getLeaderboard(mode) {
        const raw = localStorage.getItem(KEYS.leaderboard(mode));
        if (!raw) return [];
        return JSON.parse(raw);
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
        if (lb.length < 10) return true;
        return score > lb[lb.length - 1].score;
    },

    getDailyStatus(dateStr) {
        const raw = localStorage.getItem(KEYS.daily(dateStr));
        if (!raw) return null;
        return JSON.parse(raw);
    },

    saveDailyResult(dateStr, score) {
        localStorage.setItem(KEYS.daily(dateStr), JSON.stringify(score));
    },
};
