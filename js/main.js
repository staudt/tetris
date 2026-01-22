// Main Entry Point - Initialize and Start Game

// Global game instances
let physicsWorld;
let renderer;
let tetrominoFactory;
let lineDetector;
let gameState;
let inputHandler;

// Timing
let lastFrameTime = 0;

// Resize canvas to fill window with integer scaling for sharp pixels
function resizeCanvas() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    const canvasWidth = CONFIG.CANVAS.WIDTH;
    const canvasHeight = CONFIG.CANVAS.HEIGHT;

    // Get available space (accounting for padding and border)
    const padding = 20;
    const border = 8;
    const availableWidth = window.innerWidth - padding - border;
    const availableHeight = window.innerHeight - padding - border;

    // Calculate integer scale factor that fits in window
    const scaleX = Math.floor(availableWidth / canvasWidth);
    const scaleY = Math.floor(availableHeight / canvasHeight);
    const scale = Math.max(1, Math.min(scaleX, scaleY));

    // Apply integer scaling for sharp pixels
    canvas.style.width = (canvasWidth * scale) + 'px';
    canvas.style.height = (canvasHeight * scale) + 'px';
}

// Initialize game systems
function init() {
    console.log('Initializing Physics Tetris...');

    // Get canvas
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas not found!');
        return;
    }

    // Setup responsive canvas sizing
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize systems
    physicsWorld = new PhysicsWorld();
    renderer = new Renderer(canvas);
    tetrominoFactory = new TetrominoFactory(physicsWorld);
    lineDetector = new LineDetector(physicsWorld);
    gameState = new GameState(physicsWorld, tetrominoFactory, lineDetector);
    inputHandler = new InputHandler(gameState);

    console.log('Game initialized successfully!');
    console.log('Press ENTER to start');

    // Start game loop
    requestAnimationFrame(gameLoop);
}

// Main game loop
function gameLoop(currentTime) {
    // Calculate delta time in seconds
    const deltaTime = lastFrameTime ? (currentTime - lastFrameTime) / 1000 : 0;
    lastFrameTime = currentTime;

    // Cap delta time to prevent physics explosions
    const cappedDelta = Math.min(deltaTime, 0.1);

    // Update input
    inputHandler.update(cappedDelta);

    // Update game state
    gameState.update(cappedDelta);

    // Render
    renderer.render(physicsWorld, gameState);

    // Continue loop
    requestAnimationFrame(gameLoop);
}

// Start game when page loads
window.addEventListener('load', init);
