// Keyboard Input Handler

class InputHandler {
    constructor(gameState) {
        this.gameState = gameState;
        this.keys = {};
        this.lastMoveTime = 0;
        this.lastRotateTime = 0;
        this.lastKnownState = null;

        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Mobile touch controls
        this.setupTouchControls();
    }

    setupTouchControls() {
        // D-Pad buttons
        const dpadButtons = document.querySelectorAll('.dpad-btn');
        dpadButtons.forEach(btn => {
            const key = btn.dataset.key;

            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleKeyDown({ key, preventDefault: () => {} });
            }, { passive: false });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.handleKeyUp({ key });
            }, { passive: false });

            // Also handle mouse for testing on desktop
            btn.addEventListener('mousedown', (e) => {
                this.handleKeyDown({ key, preventDefault: () => {} });
            });

            btn.addEventListener('mouseup', (e) => {
                this.handleKeyUp({ key });
            });

            btn.addEventListener('mouseleave', (e) => {
                this.handleKeyUp({ key });
            });
        });

        // Action button (Start/Pause)
        const actionBtn = document.getElementById('btn-action');
        if (actionBtn) {
            actionBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleActionButton();
            }, { passive: false });

            actionBtn.addEventListener('click', (e) => {
                this.handleActionButton();
            });
        }
    }

    handleActionButton() {
        // Determine action based on game state
        if (this.gameState.state === CONFIG.STATE.MENU) {
            this.gameState.start();
        } else if (this.gameState.state === CONFIG.STATE.PLAYING) {
            this.gameState.togglePause();
        } else if (this.gameState.state === CONFIG.STATE.PAUSED) {
            this.gameState.togglePause();
        } else if (this.gameState.state === CONFIG.STATE.GAME_OVER) {
            this.gameState.reset();
        }
        this.updateActionButtonLabel();
    }

    updateActionButtonLabel() {
        const actionBtn = document.getElementById('btn-action');
        if (!actionBtn) return;

        switch (this.gameState.state) {
            case CONFIG.STATE.MENU:
                actionBtn.textContent = 'START';
                break;
            case CONFIG.STATE.PLAYING:
                actionBtn.textContent = 'PAUSE';
                break;
            case CONFIG.STATE.PAUSED:
                actionBtn.textContent = 'PLAY';
                break;
            case CONFIG.STATE.GAME_OVER:
                actionBtn.textContent = 'RETRY';
                break;
        }
    }

    // Map WASD to arrow keys
    normalizeKey(key) {
        const keyMap = {
            'w': 'ArrowUp',
            'W': 'ArrowUp',
            'a': 'ArrowLeft',
            'A': 'ArrowLeft',
            's': 'ArrowDown',
            'S': 'ArrowDown',
            'd': 'ArrowRight',
            'D': 'ArrowRight'
        };
        return keyMap[key] || key;
    }

    // Check if key is a game control key
    isGameKey(key) {
        const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Escape', 'Enter', 'w', 'W', 'a', 'A', 's', 'S', 'd', 'D'];
        return gameKeys.includes(key);
    }

    handleKeyDown(e) {
        // Prevent default for game keys
        if (this.isGameKey(e.key)) {
            e.preventDefault();
        }

        // Normalize WASD to arrow keys
        const key = this.normalizeKey(e.key);

        // Store key state
        this.keys[key] = true;

        const now = Date.now() / 1000; // Convert to seconds

        // Handle state-specific controls
        if (this.gameState.state === CONFIG.STATE.GAME_OVER) {
            if (this.isGameKey(e.key)) {
                this.gameState.reset();
                this.updateActionButtonLabel();
            }
            return;
        }

        if (this.gameState.state === CONFIG.STATE.MENU) {
            if (this.isGameKey(e.key)) {
                this.gameState.start();
                this.updateActionButtonLabel();
            }
            return;
        }

        // Pause/Resume
        if (e.key === 'Escape') {
            this.gameState.togglePause();
            this.updateActionButtonLabel();
            return;
        }

        // Don't process game controls if paused
        if (this.gameState.state !== CONFIG.STATE.PLAYING) {
            return;
        }

        // Get active piece
        const activePiece = this.gameState.activePiece;
        if (!activePiece) {
            return;
        }

        const tetrominoFactory = this.gameState.tetrominoFactory;

        // Rotation (with cooldown)
        if (key === 'ArrowUp' && now - this.lastRotateTime > CONFIG.TIMING.ROTATION_COOLDOWN) {
            if (tetrominoFactory.rotatePiece(activePiece, true)) {
                this.lastRotateTime = now;
                // Reset settle timer when piece is rotated
                const userData = activePiece.getUserData();
                if (userData) {
                    userData.settleTimer = 0;
                }
            }
        }

        // Hard drop
        if (key === ' ') {
            tetrominoFactory.hardDropPiece(activePiece);
            this.gameState.spawnNextPiece();
        }
    }

    handleKeyUp(e) {
        const key = this.normalizeKey(e.key);
        this.keys[key] = false;
    }

    // Update method called each frame
    update(deltaTime) {
        // Keep action button label in sync with game state (only when state changes)
        if (this.lastKnownState !== this.gameState.state) {
            this.lastKnownState = this.gameState.state;
            this.updateActionButtonLabel();
        }

        if (this.gameState.state !== CONFIG.STATE.PLAYING) {
            return;
        }

        const activePiece = this.gameState.activePiece;
        if (!activePiece) {
            return;
        }

        const userData = activePiece.getUserData();
        if (!userData || !userData.isActive) {
            return; // Only apply forces to active piece
        }

        const tetrominoFactory = this.gameState.tetrominoFactory;

        // Horizontal movement - instant velocity, no acceleration
        if (this.keys['ArrowLeft']) {
            tetrominoFactory.applyHorizontalVelocity(activePiece, -1);
        } else if (this.keys['ArrowRight']) {
            tetrominoFactory.applyHorizontalVelocity(activePiece, 1);
        } else {
            // Stop horizontal movement when no keys pressed
            tetrominoFactory.stopHorizontalMovement(activePiece);
        }

        // Gravity control: slow fall normally, fast fall when holding down
        const currentVel = activePiece.getLinearVelocity();
        if (this.keys['ArrowDown']) {
            // Fast fall - let gravity work naturally
            tetrominoFactory.applyDownwardForce(activePiece, 2.0);
        } else {
            // Slow fall - force constant slow descent
            activePiece.setLinearVelocity(planck.Vec2(currentVel.x, CONFIG.TIMING.BASE_FALL_SPEED));
        }
    }
}
