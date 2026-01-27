// Game State Management and Main Loop

class GameState {
    constructor(physicsWorld, tetrominoFactory, lineDetector) {
        this.physicsWorld = physicsWorld;
        this.tetrominoFactory = tetrominoFactory;
        this.lineDetector = lineDetector;

        this.state = CONFIG.STATE.MENU;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.highScore = this.loadHighScore();

        this.activePiece = null;
        this.nextPieceType = this.tetrominoFactory.getRandomType();

        this.lastUpdateTime = 0;
    }

    loadHighScore() {
        try {
            const saved = localStorage.getItem('tetris_highscore');
            return saved ? parseInt(saved, 10) : 0;
        } catch (e) {
            return 0;
        }
    }

    saveHighScore() {
        try {
            localStorage.setItem('tetris_highscore', this.highScore.toString());
        } catch (e) {
            // localStorage not available
        }
    }

    start() {
        this.state = CONFIG.STATE.PLAYING;
        this.spawnNextPiece();
        if (soundManager) soundManager.playMusic();
    }

    reset() {
        // Clear all pieces
        this.physicsWorld.clearDynamicBodies();

        // Reset game stats
        this.score = 0;
        this.level = 1;
        this.lines = 0;

        // Reset pieces
        this.activePiece = null;
        this.nextPieceType = this.tetrominoFactory.getRandomType();

        // Return to menu
        this.state = CONFIG.STATE.MENU;
    }

    togglePause() {
        if (this.state === CONFIG.STATE.PLAYING) {
            this.state = CONFIG.STATE.PAUSED;
        } else if (this.state === CONFIG.STATE.PAUSED) {
            this.state = CONFIG.STATE.PLAYING;
        }
    }

    spawnNextPiece() {
        // Spawn at top-center of play area
        const spawnX = CONFIG.GAME.PLAY_WIDTH / 2;
        const spawnY = 1;

        this.activePiece = this.tetrominoFactory.createPiece(
            this.nextPieceType,
            spawnX,
            spawnY,
            true // kinematic for player control
        );

        // Generate next piece
        this.nextPieceType = this.tetrominoFactory.getRandomType();
    }

    update(deltaTime) {
        if (this.state !== CONFIG.STATE.PLAYING) {
            return;
        }

        // Step physics simulation
        this.physicsWorld.step(deltaTime);

        // Check if active piece should settle
        if (this.activePiece) {
            this.updateActivePiece(deltaTime);
        }

        // Spawn new piece if needed
        if (!this.activePiece) {
            this.spawnNextPiece();
        }

        // Update line clear animation if active
        this.lineDetector.updateAnimation(this);

        // Only detect new lines if not currently animating
        if (!this.lineDetector.isAnimating()) {
            const completedRows = this.lineDetector.detectCompletedLines();
            if (completedRows.length > 0) {
                this.lineDetector.clearLines(completedRows, this);
            }
        }

        // Check for game over (only if not animating)
        if (!this.lineDetector.isAnimating() && this.lineDetector.isGameOver()) {
            this.state = CONFIG.STATE.GAME_OVER;
            this.gameOverTime = Date.now();

            // Update high score if needed
            if (this.score > this.highScore) {
                this.highScore = this.score;
                this.saveHighScore();
            }

            if (soundManager) {
                soundManager.stopMusic();
                soundManager.play('gameover');
            }
        }
    }

    updateActivePiece(deltaTime) {
        if (!this.activePiece) {
            return;
        }

        const userData = this.activePiece.getUserData();
        if (!userData || !userData.isActive) {
            return;
        }

        const velocity = this.activePiece.getLinearVelocity();

        // Check vertical velocity specifically - horizontal slowdown from walls shouldn't trigger settle
        // Piece should only settle when it's not falling significantly
        const verticalSpeed = Math.abs(velocity.y);
        const isVerticallyStable = verticalSpeed < CONFIG.PHYSICS.SETTLE_VELOCITY_THRESHOLD;

        // Check if piece is touching ground (floor or other pieces below) - ignores side walls
        const isTouchingGround = this.tetrominoFactory.isTouchingGround(this.activePiece);

        if (isTouchingGround && isVerticallyStable) {
            // Piece is resting and can't move down - start settle timer
            userData.settleTimer = (userData.settleTimer || 0) + deltaTime;

            if (userData.settleTimer >= CONFIG.PHYSICS.SETTLE_DELAY) {
                // Settle the piece
                this.tetrominoFactory.settlePiece(this.activePiece);
                this.activePiece = null;
                if (soundManager) soundManager.play('touch');
            }
        } else {
            // Piece is still moving or can move down - reset settle timer
            userData.settleTimer = 0;
        }
    }
}
