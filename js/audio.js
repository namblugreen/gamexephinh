let audioCtx = null;
let masterSfxGain = null;
let masterMusicGain = null;

function getCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterSfxGain = audioCtx.createGain();
        masterSfxGain.gain.value = 0.7;
        masterSfxGain.connect(audioCtx.destination);
        masterMusicGain = audioCtx.createGain();
        masterMusicGain.gain.value = 0.5;
        masterMusicGain.connect(audioCtx.destination);
    }
    return audioCtx;
}

function playTone(freq, duration, type = 'square', gainValue = 0.3, destination = null) {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(destination || masterSfxGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
}

function playNoise(duration, gainValue = 0.1) {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(masterSfxGain);
    source.start();
}

export const Audio = {
    sfxEnabled: true,
    musicEnabled: true,
    currentMusic: null,
    musicInterval: null,
    tempoMultiplier: 1,

    init(settings) {
        this.sfxEnabled = settings.sfxEnabled;
        this.musicEnabled = settings.musicEnabled;
        if (masterSfxGain) masterSfxGain.gain.value = settings.sfxVolume;
        if (masterMusicGain) masterMusicGain.gain.value = settings.musicVolume;
    },

    resume() {
        const ctx = getCtx();
        if (ctx.state === 'suspended') ctx.resume();
    },

    playPlace() {
        if (!this.sfxEnabled) return;
        playTone(200, 0.1, 'square', 0.2);
        playNoise(0.05, 0.05);
    },

    playClear(comboLevel) {
        if (!this.sfxEnabled) return;
        const baseFreq = 400 + comboLevel * 100;
        playTone(baseFreq, 0.15, 'square', 0.25);
        setTimeout(() => playTone(baseFreq * 1.5, 0.15, 'square', 0.2), 80);
    },

    playCombo(level) {
        if (!this.sfxEnabled) return;
        const freqs = [523, 659, 784, 1047];
        freqs.slice(0, Math.min(level + 1, 4)).forEach((f, i) => {
            setTimeout(() => playTone(f, 0.12, 'square', 0.2), i * 60);
        });
    },

    playStreak() {
        if (!this.sfxEnabled) return;
        playTone(880, 0.08, 'triangle', 0.15);
    },

    playUndo() {
        if (!this.sfxEnabled) return;
        playTone(600, 0.1, 'sawtooth', 0.15);
        setTimeout(() => playTone(400, 0.1, 'sawtooth', 0.1), 60);
    },

    playGameOver() {
        if (!this.sfxEnabled) return;
        const notes = [440, 370, 330, 262];
        notes.forEach((f, i) => {
            setTimeout(() => playTone(f, 0.3, 'triangle', 0.2), i * 200);
        });
    },

    playClick() {
        if (!this.sfxEnabled) return;
        playTone(1000, 0.05, 'square', 0.1);
    },

    playInvalid() {
        if (!this.sfxEnabled) return;
        playTone(150, 0.15, 'sawtooth', 0.2);
    },

    setTempo(multiplier) {
        this.tempoMultiplier = multiplier;
    },

    setSfxVolume(value) {
        getCtx();
        masterSfxGain.gain.value = value;
    },

    setMusicVolume(value) {
        getCtx();
        masterMusicGain.gain.value = value;
    },

    startMusic() {
        if (!this.musicEnabled) return;
        this.stopMusic();

        const ctx = getCtx();
        const melodies = [
            [262, 294, 330, 349, 392, 349, 330, 294, 262, 0, 392, 440, 392, 349, 330, 294],
            [330, 330, 0, 330, 0, 262, 330, 392, 0, 196, 0, 262, 0, 196, 0, 165],
            [392, 392, 0, 392, 330, 392, 440, 0, 392, 330, 262, 294, 330, 0, 294, 262],
        ];

        const melody = melodies[Math.floor(Math.random() * melodies.length)];
        let noteIndex = 0;

        const playNote = () => {
            if (!this.musicEnabled) return;
            const freq = melody[noteIndex % melody.length];
            if (freq > 0) {
                playTone(freq, 0.15, 'triangle', 0.12, masterMusicGain);
                playTone(freq / 2, 0.15, 'square', 0.06, masterMusicGain);
            }
            noteIndex++;
        };

        playNote();
        this.musicInterval = setInterval(() => {
            playNote();
        }, 250 / this.tempoMultiplier);
    },

    stopMusic() {
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    },
};
