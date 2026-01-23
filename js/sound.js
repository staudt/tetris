// Sound Manager for game audio

class SoundManager {
    constructor() {
        this.sounds = {};
        this.enabled = true;
        this.music = null;
        this.musicEnabled = true;
        this.unlocked = false;
        this.loadSounds();
        this.loadMusic();
        this.setupUnlock();
    }

    // Mobile browsers require user interaction to unlock audio
    setupUnlock() {
        const unlock = () => {
            if (this.unlocked) return;

            // Play and immediately pause to unlock audio on mobile
            if (this.music) {
                this.music.play().then(() => {
                    this.music.pause();
                    this.music.currentTime = 0;
                    this.unlocked = true;
                }).catch(() => {});
            }

            // Also unlock sound effects
            for (const sound of Object.values(this.sounds)) {
                sound.play().then(() => {
                    sound.pause();
                    sound.currentTime = 0;
                }).catch(() => {});
            }
        };

        // Listen for first interaction
        ['touchstart', 'touchend', 'click', 'keydown'].forEach(event => {
            document.addEventListener(event, unlock, { once: true });
        });
    }

    loadSounds() {
        const soundFiles = {
            gameover: 'media/gameover.wav',
            levelup: 'media/levelup.wav',
            line: 'media/line.wav',
            rotate: 'media/rotate.wav',
            touch: 'media/touch.wav'
        };

        for (const [name, path] of Object.entries(soundFiles)) {
            this.sounds[name] = new Audio(path);
            this.sounds[name].preload = 'auto';
        }
    }

    loadMusic() {
        this.music = new Audio('media/theme.mp3');
        this.music.loop = true;
        this.music.volume = 0.5;
        this.music.preload = 'auto';
    }

    playMusic() {
        if (!this.musicEnabled || !this.music) {
            return;
        }
        this.music.currentTime = 0;
        this.music.play().catch(() => {
            // Retry after a short delay (gives unlock time to complete)
            setTimeout(() => {
                if (this.music && this.musicEnabled) {
                    this.music.play().catch(() => {});
                }
            }, 100);
        });
    }

    stopMusic() {
        if (this.music) {
            this.music.pause();
            this.music.currentTime = 0;
        }
    }

    play(soundName) {
        if (!this.enabled || !this.sounds[soundName]) {
            return;
        }

        // Clone the audio to allow overlapping sounds
        const sound = this.sounds[soundName].cloneNode();
        sound.play().catch(() => {
            // Ignore autoplay errors (browser policy)
        });
    }

    // Play a sound multiple times sequentially with delay
    playSequential(soundName, count, delayMs = 100) {
        if (!this.enabled || !this.sounds[soundName] || count <= 0) {
            return;
        }

        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                this.play(soundName);
            }, i * delayMs);
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }
}

// Global sound manager instance
let soundManager;
