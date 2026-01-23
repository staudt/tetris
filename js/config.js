// GameBoy Tetris - Configuration Constants

const CONFIG = {
    // Display Settings
    CANVAS: {
        WIDTH: 320,
        HEIGHT: 320,
        SCALE: 4 // Display scale multiplier (1280×1280)
    },

    // GameBoy Color Palette
    COLORS: {
        LIGHTEST: '#9bbc0f',
        LIGHT: '#8bac0f',
        DARK: '#306230',
        DARKEST: '#0f380f'
    },

    // Game Area
    GAME: {
        PLAY_WIDTH: 10,      // blocks
        PLAY_HEIGHT: 18,     // blocks
        BLOCK_SIZE: 16,      // pixels
        PLAY_OFFSET_X: 32,   // pixels from left edge
        PLAY_OFFSET_Y: 16,   // pixels from top edge
        UI_PANEL_X: 208,     // pixels from left edge
        UI_PANEL_Y: 16       // pixels from top edge
    },

    // Physics Parameters
    PHYSICS: {
        GRAVITY: 8,               // units per second squared (reduced for better control)
        WALL_FRICTION: 0.7,       // 0.0 to 1.0
        WALL_RESTITUTION: 0.05,   // bounciness (low = less bounce)
        PIECE_DENSITY: 1.0,
        PIECE_FRICTION: 0.5,
        PIECE_RESTITUTION: 0.05,
        TIME_STEP: 1/60,          // 60 FPS
        VELOCITY_ITERATIONS: 8,
        POSITION_ITERATIONS: 3,
        SETTLE_VELOCITY_THRESHOLD: 0.2,  // units/sec (higher threshold)
        SETTLE_DELAY: 0            // seconds (instant settle, physics always active)
    },

    // Gameplay Timing
    TIMING: {
        BASE_FALL_SPEED: 2,     // base downward velocity
        FAST_FALL_MULTIPLIER: 5, // speed when holding down
        LEVEL_SPEED_INCREASE: 1.0, // speed increase per level
        MAX_FALL_SPEED: 8.0,       // maximum fall speed cap
        ROTATION_COOLDOWN: 0.15,   // seconds between rotations
        MOVE_COOLDOWN: 0.1         // seconds between moves
    },

    // Scoring
    SCORE: {
        SINGLE: 40,
        DOUBLE: 100,
        TRIPLE: 300,
        TETRIS: 1200,
        LINES_PER_LEVEL: 10
    },

    // Line Detection
    LINE_DETECTION: {
        ROW_TOLERANCE: 0.3,        // units above/below row center
        MIN_BLOCKS_FOR_LINE: 10     // blocks needed to complete line
    },

    // Game States
    STATE: {
        MENU: 'menu',
        PLAYING: 'playing',
        PAUSED: 'paused',
        GAME_OVER: 'gameOver'
    },

    // Sound Settings
    SOUND: {
        ENABLED: true,
        LINE_CLEAR_DELAY: 100  // ms between sequential line sounds
    }
};

// Tetromino Color Assignments (using GameBoy palette)
const TETROMINO_COLORS = {
    I: CONFIG.COLORS.LIGHTEST,
    O: CONFIG.COLORS.LIGHT,
    T: CONFIG.COLORS.DARKEST,
    S: CONFIG.COLORS.DARK,
    Z: CONFIG.COLORS.DARK,
    J: CONFIG.COLORS.DARKEST,
    L: CONFIG.COLORS.DARKEST
};
