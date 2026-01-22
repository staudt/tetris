// Sound Manager for game audio

class SoundManager {
    constructor() {
        this.sounds = {};
        this.enabled = true;
        this.loadSounds();
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
