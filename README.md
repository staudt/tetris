# Physics Tetris - GameBoy Edition

A Tetris game with physics. You can [play online here](https://staudt.github.io/tetris) 🎮

### Controls

| Key | Action |
|-----|--------|
| **← Left Arrow** | Move piece left |
| **→ Right Arrow** | Move piece right |
| **↑ Up Arrow** | Rotate piece clockwise (90°) |
| **↓ Down Arrow** | Soft drop (faster fall) |
| **SPACE** | Hard drop (instant fall + settle) |
| **ESC** | Pause/Resume game |
| **ENTER** | Start game / Restart after game over |

### Scoring

- **Single Line**: 40 × level
- **Double Line**: 100 × level
- **Triple Line**: 300 × level
- **Tetris (4 lines)**: 1200 × level

**Level Up**: Every 10 lines cleared
**Effect**: Pieces fall faster with each level

### Tech Stack

- **HTML5 Canvas 2D** for rendering
- **Planck.js** (Box2D) for physics simulation
- **Vanilla JavaScript** (no build tools required)
- Built using Claude Code

### Hybrid Physics-Grid System

The game uses an innovative hybrid approach:

1. **Active Piece (Falling)**: Kinematic physics body with direct player control for responsive feel
2. **Settled Pieces**: Dynamic physics bodies with full gravity and collision simulation
3. **Line Detection**: AABB queries at each row height to detect completed lines. It assumes 9 instead of 10 pieces per line to account for physics

### GameBoy Specifications

- **Resolution**: 160×144 pixels (scaled 4× to 640×576 for display)
- **Color Palette**: 4 shades of green matching original GameBoy
- **Play Area**: 10 blocks wide × 18 blocks high
- **Block Size**: 8×8 pixels
- **Frame Rate**: 60 FPS

## License

MIT. No intention of commercial use