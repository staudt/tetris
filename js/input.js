// Keyboard Input Handler

class InputHandler {
    constructor(gameState) {
        this.gameState = gameState;
        this.keys = {};
        this.lastMoveTime = 0;
        this.lastRotateTime = 0;

        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    handleKeyDown(e) {
        // Prevent default for game keys
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Escape', 'Enter'].includes(e.key)) {
            e.preventDefault();
        }

        // Store key state
        this.keys[e.key] = true;

        const now = Date.now() / 1000; // Convert to seconds

        // Handle state-specific controls
        if (this.gameState.state === CONFIG.STATE.GAME_OVER) {
            if (e.key === 'Enter') {
                this.gameState.reset();
            }
            return;
        }

        if (this.gameState.state === CONFIG.STATE.MENU) {
            if (e.key === 'Enter' || e.key === ' ') {
                this.gameState.start();
            }
            return;
        }

        // Pause/Resume
        if (e.key === 'Escape') {
            this.gameState.togglePause();
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
        if (e.key === 'ArrowUp' && now - this.lastRotateTime > CONFIG.TIMING.ROTATION_COOLDOWN) {
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
        if (e.key === ' ') {
            tetrominoFactory.hardDropPiece(activePiece);
            this.gameState.spawnNextPiece();
        }
    }

    handleKeyUp(e) {
        this.keys[e.key] = false;
    }

    // Update method called each frame
    update(deltaTime) {
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
            const slowFallSpeed = 1.0;
            activePiece.setLinearVelocity(planck.Vec2(currentVel.x, slowFallSpeed));
        }
    }
}
