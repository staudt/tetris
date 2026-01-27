// Sound Manager for game audio

class SoundManager {
    constructor() {
        this.sounds = {};
        this.enabled = true;
        this.music = null;
        this.musicEnabled = this.loadMusicState();
        this.unlocked = false;
        this.loadSounds();
        this.loadMusic();
        this.setupUnlock();
    }

    loadMusicState() {
        try {
            const saved = localStorage.getItem('tetris_music_enabled');
            return saved !== null ? saved === 'true' : false; // Default to false
        } catch (e) {
            return false;
        }
    }

    saveMusicState() {
        try {
            localStorage.setItem('tetris_music_enabled', this.musicEnabled.toString());
        } catch (e) {
            // localStorage not available
        }
    }

    // Mobile browsers require user interaction to unlock audio
    setupUnlock() {
        const unlock = () => {
            if (this.unlocked) return;
            this.unlocked = true;

            // Silently unlock audio elements by playing muted then pausing
            const unlockAudio = (audio) => {
                if (!audio) return;
                const vol = audio.volume;
                audio.volume = 0;
                const playPromise = audio.play();
                if (playPromise) {
                    playPromise.then(() => {
                        audio.pause();
                        audio.currentTime = 0;
                        audio.volume = vol;
                    }).catch(() => {
                        audio.volume = vol;
                    });
                }
            };

            unlockAudio(this.music);
            for (const sound of Object.values(this.sounds)) {
                unlockAudio(sound);
            }
        };

        // Listen for first interaction - use capture to run before game handlers
        ['touchstart', 'touchend', 'click', 'keydown'].forEach(event => {
            document.addEventListener(event, unlock, { once: true, capture: true });
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
            // Retry with increasing delays for browsers with strict autoplay
            const retryDelays = [50, 150, 300];
            retryDelays.forEach(delay => {
                setTimeout(() => {
                    if (this.music && this.musicEnabled && this.music.paused) {
                        this.music.play().catch(() => {});
                    }
                }, delay);
            });
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

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        this.saveMusicState();
        if (!this.musicEnabled && this.music) {
            this.music.pause();
        } else if (this.musicEnabled && this.music) {
            this.music.play().catch(() => {});
        }
        return this.musicEnabled;
    }
}

// Global sound manager instance
let soundManager;
