// GameBoy Aesthetic Renderer

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Disable anti-aliasing for pixel-perfect rendering
        this.ctx.imageSmoothingEnabled = false;

        // Offscreen canvas for static elements (border, UI)
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = CONFIG.CANVAS.WIDTH;
        this.offscreenCanvas.height = CONFIG.CANVAS.HEIGHT;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        this.offscreenCtx.imageSmoothingEnabled = false;

        this.drawStaticBackground();
    }

    clear() {
        this.ctx.fillStyle = CONFIG.COLORS.LIGHTEST;
        this.ctx.fillRect(0, 0, CONFIG.CANVAS.WIDTH, CONFIG.CANVAS.HEIGHT);
    }

    drawStaticBackground() {
        const ctx = this.offscreenCtx;

        // Background
        ctx.fillStyle = CONFIG.COLORS.LIGHTEST;
        ctx.fillRect(0, 0, CONFIG.CANVAS.WIDTH, CONFIG.CANVAS.HEIGHT);

        // Draw brick border pattern
        this.drawBrickBorder(ctx);

        // Draw UI panel labels
        this.drawUILabels(ctx);
    }

    drawBrickBorder(ctx) {
        const blockSize = CONFIG.GAME.BLOCK_SIZE;
        const playOffsetX = CONFIG.GAME.PLAY_OFFSET_X;
        const playOffsetY = CONFIG.GAME.PLAY_OFFSET_Y;
        const playWidthPx = CONFIG.GAME.PLAY_WIDTH * blockSize;
        const playHeightPx = CONFIG.GAME.PLAY_HEIGHT * blockSize;

        ctx.fillStyle = CONFIG.COLORS.DARKEST;

        // Create brick pattern
        const brickSize = 8;

        // Top border
        for (let x = playOffsetX - blockSize; x < playOffsetX + playWidthPx + blockSize; x += brickSize) {
            for (let y = playOffsetY - blockSize; y < playOffsetY; y += brickSize) {
                if ((Math.floor(x / brickSize) + Math.floor(y / brickSize)) % 2 === 0) {
                    ctx.fillRect(x, y, brickSize, brickSize);
                }
            }
        }

        // Bottom border
        for (let x = playOffsetX - blockSize; x < playOffsetX + playWidthPx + blockSize; x += brickSize) {
            for (let y = playOffsetY + playHeightPx; y < playOffsetY + playHeightPx + blockSize; y += brickSize) {
                if ((Math.floor(x / brickSize) + Math.floor(y / brickSize)) % 2 === 0) {
                    ctx.fillRect(x, y, brickSize, brickSize);
                }
            }
        }

        // Left border
        for (let x = playOffsetX - blockSize; x < playOffsetX; x += brickSize) {
            for (let y = playOffsetY; y < playOffsetY + playHeightPx; y += brickSize) {
                if ((Math.floor(x / brickSize) + Math.floor(y / brickSize)) % 2 === 0) {
                    ctx.fillRect(x, y, brickSize, brickSize);
                }
            }
        }

        // Right border
        for (let x = playOffsetX + playWidthPx; x < playOffsetX + playWidthPx + blockSize; x += brickSize) {
            for (let y = playOffsetY; y < playOffsetY + playHeightPx; y += brickSize) {
                if ((Math.floor(x / brickSize) + Math.floor(y / brickSize)) % 2 === 0) {
                    ctx.fillRect(x, y, brickSize, brickSize);
                }
            }
        }

        // Draw play area background
        ctx.fillStyle = CONFIG.COLORS.LIGHTEST;
        ctx.fillRect(playOffsetX, playOffsetY, playWidthPx, playHeightPx);
    }

    drawUILabels(ctx) {
        const panelX = CONFIG.GAME.UI_PANEL_X;
        const panelY = CONFIG.GAME.UI_PANEL_Y;

        ctx.fillStyle = CONFIG.COLORS.DARKEST;
        ctx.font = '16px monospace';

        // SCORE label
        ctx.fillText('SCORE', panelX, panelY + 16);

        // LEVEL label
        ctx.fillText('LEVEL', panelX, panelY + 64);

        // LINES label
        ctx.fillText('LINES', panelX, panelY + 112);

        // NEXT label
        ctx.fillText('NEXT', panelX, panelY + 160);
    }

    render(physicsWorld, gameState) {
        // Draw static background
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);

        // Get blinking fixtures info from line detector
        const blinkInfo = gameState.lineDetector.getBlinkingFixtures();
        const blinkingSet = new Set(blinkInfo.fixtures);
        const blinkVisible = blinkInfo.visible;

        // Draw all physics bodies
        const bodies = physicsWorld.getBodies();
        bodies.forEach(body => {
            const userData = body.getUserData();
            if (userData && userData.type === 'wall') {
                return; // Don't render walls
            }

            this.drawBody(body, blinkingSet, blinkVisible);
        });

        // Draw UI values
        this.drawUIValues(gameState);

        // Draw game state overlays
        if (gameState.state === CONFIG.STATE.MENU) {
            this.drawMenuOverlay();
        } else if (gameState.state === CONFIG.STATE.PAUSED) {
            this.drawPausedOverlay();
        } else if (gameState.state === CONFIG.STATE.GAME_OVER) {
            this.drawGameOverOverlay(gameState);
        }
    }

    drawBody(body, blinkingSet = new Set(), blinkVisible = true) {
        const userData = body.getUserData();
        const color = userData?.color || CONFIG.COLORS.DARK;

        let fixture = body.getFixtureList();
        while (fixture) {
            // Check if this fixture is blinking
            const isBlinking = blinkingSet.has(fixture);

            // Skip drawing if blinking and currently invisible
            if (isBlinking && !blinkVisible) {
                fixture = fixture.getNext();
                continue;
            }

            const shape = fixture.getShape();

            if (shape.getType() === 'polygon') {
                // Use white/bright color for blinking visible phase
                const drawColor = isBlinking ? CONFIG.COLORS.LIGHTEST : color;
                this.drawPolygon(body, shape, drawColor);
            }

            fixture = fixture.getNext();
        }
    }

    drawPolygon(body, shape, color) {
        const vertices = shape.m_vertices;
        const position = body.getPosition();
        const angle = body.getAngle();

        this.ctx.save();
        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = CONFIG.COLORS.DARKEST;
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();

        for (let i = 0; i < vertices.length; i++) {
            const v = vertices[i];

            // Rotate vertex
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const rx = v.x * cos - v.y * sin;
            const ry = v.x * sin + v.y * cos;

            // Transform to screen coordinates
            const screenX = this.physicsToPixelX(position.x + rx);
            const screenY = this.physicsToPixelY(position.y + ry);

            if (i === 0) {
                this.ctx.moveTo(screenX, screenY);
            } else {
                this.ctx.lineTo(screenX, screenY);
            }
        }

        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.restore();
    }

    drawUIValues(gameState) {
        const panelX = CONFIG.GAME.UI_PANEL_X;
        const panelY = CONFIG.GAME.UI_PANEL_Y;

        this.ctx.fillStyle = CONFIG.COLORS.DARKEST;
        this.ctx.font = '16px monospace';

        // Score value
        this.ctx.fillText(gameState.score.toString().padStart(6, '0'), panelX, panelY + 40);

        // Level value
        this.ctx.fillText(gameState.level.toString().padStart(2, ' '), panelX + 16, panelY + 88);

        // Lines value
        this.ctx.fillText(gameState.lines.toString().padStart(3, ' '), panelX + 16, panelY + 136);

        // Draw next piece preview
        if (gameState.nextPieceType) {
            this.drawNextPiecePreview(gameState.nextPieceType, panelX, panelY + 176);
        }
    }

    drawNextPiecePreview(pieceType, x, y) {
        const blocks = TETROMINO_SHAPES[pieceType];
        const color = TETROMINO_COLORS[pieceType];
        const previewBlockSize = 8;

        this.ctx.fillStyle = color;
        this.ctx.strokeStyle = CONFIG.COLORS.DARKEST;
        this.ctx.lineWidth = 2;

        blocks.forEach(([bx, by]) => {
            const px = x + bx * previewBlockSize + 16;
            const py = y + by * previewBlockSize;
            this.ctx.fillRect(px, py, previewBlockSize, previewBlockSize);
            this.ctx.strokeRect(px, py, previewBlockSize, previewBlockSize);
        });
    }

    drawMenuOverlay() {
        const centerX = CONFIG.CANVAS.WIDTH / 2;
        const centerY = CONFIG.CANVAS.HEIGHT / 2;

        // Semi-transparent background
        this.ctx.fillStyle = 'rgba(15, 56, 15, 0.8)';
        this.ctx.fillRect(0, 0, CONFIG.CANVAS.WIDTH, CONFIG.CANVAS.HEIGHT);

        // Title
        this.ctx.fillStyle = CONFIG.COLORS.LIGHTEST;
        this.ctx.font = 'bold 24px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Tetris', centerX, centerY - 40);
        this.ctx.fillText('with Physics', centerX, centerY - 12);

        // Press any key text
        this.ctx.font = '16px monospace';
        this.ctx.fillText('Press any key', centerX, centerY + 40);
        this.ctx.fillText('to play', centerX, centerY + 64);

        // Credits
        this.ctx.font = '10px monospace';
        this.ctx.fillText('Made by Andre, Ricardo and Opus 4.5', centerX, CONFIG.CANVAS.HEIGHT - 16);
        this.ctx.textAlign = 'left';
    }

    drawPausedOverlay() {
        const centerX = CONFIG.CANVAS.WIDTH / 2;
        const centerY = CONFIG.CANVAS.HEIGHT / 2;

        // Semi-transparent background
        this.ctx.fillStyle = 'rgba(15, 56, 15, 0.7)';
        this.ctx.fillRect(0, 0, CONFIG.CANVAS.WIDTH, CONFIG.CANVAS.HEIGHT);

        // PAUSED text
        this.ctx.fillStyle = CONFIG.COLORS.LIGHTEST;
        this.ctx.font = 'bold 32px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSED', centerX, centerY);
        this.ctx.textAlign = 'left';
    }

    drawGameOverOverlay(gameState) {
        const centerX = CONFIG.CANVAS.WIDTH / 2;
        const centerY = CONFIG.CANVAS.HEIGHT / 2;

        // Semi-transparent background
        this.ctx.fillStyle = 'rgba(15, 56, 15, 0.8)';
        this.ctx.fillRect(0, 0, CONFIG.CANVAS.WIDTH, CONFIG.CANVAS.HEIGHT);

        // GAME OVER text
        this.ctx.fillStyle = CONFIG.COLORS.LIGHTEST;
        this.ctx.font = 'bold 24px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', centerX, centerY - 20);

        this.ctx.font = '16px monospace';
        this.ctx.fillText('Score: ' + gameState.score, centerX, centerY + 16);
        this.ctx.fillText('Press any key', centerX, centerY + 48);
        this.ctx.textAlign = 'left';
    }

    // Coordinate transformation helpers
    physicsToPixelX(physicsX) {
        return CONFIG.GAME.PLAY_OFFSET_X + physicsX * CONFIG.GAME.BLOCK_SIZE;
    }

    physicsToPixelY(physicsY) {
        return CONFIG.GAME.PLAY_OFFSET_Y + physicsY * CONFIG.GAME.BLOCK_SIZE;
    }
}
