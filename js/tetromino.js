// Tetromino Piece Definitions and Creation

// Tetromino shapes as block coordinates [x, y]
const TETROMINO_SHAPES = {
    I: [[0, 0], [1, 0], [2, 0], [3, 0]],
    O: [[0, 0], [1, 0], [0, 1], [1, 1]],
    T: [[1, 0], [0, 1], [1, 1], [2, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]],
    Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
    J: [[0, 0], [0, 1], [1, 1], [2, 1]],
    L: [[2, 0], [0, 1], [1, 1], [2, 1]]
};

const TETROMINO_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

class TetrominoFactory {
    constructor(physicsWorld) {
        this.physicsWorld = physicsWorld;
    }

    // Create a new tetromino piece
    createPiece(type, x, y, isActive = true) {
        const blocks = TETROMINO_SHAPES[type];
        const color = TETROMINO_COLORS[type];

        // Calculate center of mass for the piece
        let centerX = 0;
        let centerY = 0;
        blocks.forEach(([bx, by]) => {
            centerX += bx;
            centerY += by;
        });
        centerX = centerX / blocks.length;
        centerY = centerY / blocks.length;

        // Create body at spawn position - ALWAYS dynamic for physics
        const body = this.physicsWorld.world.createBody({
            type: 'dynamic',
            position: planck.Vec2(x, y),
            angle: 0,
            linearDamping: 0.1,   // Low damping for responsive physics
            angularDamping: 0.5,  // Allow rotation from physics
            bullet: false,
            fixedRotation: false  // Always allow physics rotation
        });

        // Create fixture for each block, offset from center of mass
        blocks.forEach(([bx, by]) => {
            const offsetX = bx - centerX;
            const offsetY = by - centerY;

            body.createFixture({
                shape: planck.Box(
                    0.45, // Half-width (slightly less than 0.5 for visual gap)
                    0.45, // Half-height
                    planck.Vec2(offsetX, offsetY), // Local position
                    0 // Angle
                ),
                density: CONFIG.PHYSICS.PIECE_DENSITY,
                friction: CONFIG.PHYSICS.PIECE_FRICTION,
                restitution: CONFIG.PHYSICS.PIECE_RESTITUTION
            });
        });

        // Store piece data
        body.setUserData({
            type: 'piece',
            pieceType: type,
            color: color,
            isActive: isActive,
            spawnTime: Date.now(),
            lastMoveTime: 0,
            settleTimer: 0
        });

        return body;
    }

    // Get a random piece type
    getRandomType() {
        return TETROMINO_TYPES[Math.floor(Math.random() * TETROMINO_TYPES.length)];
    }

    // Settle piece (mark as inactive)
    settlePiece(body) {
        if (body) {
            const userData = body.getUserData();
            if (userData) {
                userData.isActive = false;
            }
        }
    }

    // Apply horizontal velocity to piece (instant movement, no acceleration)
    applyHorizontalVelocity(body, direction) {
        // direction: -1 for left, 1 for right
        const currentVel = body.getLinearVelocity();
        const horizontalSpeed = 4; // Constant horizontal speed
        body.setLinearVelocity(planck.Vec2(direction * horizontalSpeed, currentVel.y));
    }

    // Stop horizontal movement
    stopHorizontalMovement(body) {
        const currentVel = body.getLinearVelocity();
        body.setLinearVelocity(planck.Vec2(0, currentVel.y));
    }

    // Apply downward force for fast fall
    applyDownwardForce(body, multiplier = 1) {
        const force = planck.Vec2(0, 30 * multiplier); // Strong downward force
        body.applyForceToCenter(force, true);
    }

    // Check if piece is touching ground (floor or settled pieces below) - ignores walls
    isTouchingGround(body) {
        let touchingGround = false;
        const checkDistance = 0.15; // Small distance below to check for contact

        let fixture = body.getFixtureList();
        while (fixture && !touchingGround) {
            // Get the AABB for this fixture
            const aabb = fixture.getAABB(0);

            // Create a thin AABB directly below this fixture (ignore sides)
            // Shrink horizontally to avoid catching side walls
            const horizontalInset = 0.1;
            const lowerBound = planck.Vec2(
                aabb.lowerBound.x + horizontalInset,
                aabb.upperBound.y  // Start at bottom of fixture
            );
            const upperBound = planck.Vec2(
                aabb.upperBound.x - horizontalInset,
                aabb.upperBound.y + checkDistance  // Small area below
            );

            // Query for fixtures directly below
            this.physicsWorld.world.queryAABB({ lowerBound, upperBound }, (otherFixture) => {
                const otherBody = otherFixture.getBody();

                // Don't check against self
                if (otherBody === body) {
                    return true;
                }

                const otherData = otherBody.getUserData();
                if (otherData) {
                    // Check for bottom wall (floor) - NOT side walls
                    if (otherData.type === 'wall' && otherData.side === 'bottom') {
                        touchingGround = true;
                        return false; // Stop query
                    }
                    // Check for settled pieces
                    if (otherData.type === 'piece' && !otherData.isActive) {
                        touchingGround = true;
                        return false; // Stop query
                    }
                }

                return true;
            });

            fixture = fixture.getNext();
        }

        return touchingGround;
    }

    // Check if a position is valid (no collisions)
    isValidPosition(body, newPos, newAngle = null) {
        const currentPos = body.getPosition().clone();
        const currentAngle = body.getAngle();

        // Temporarily move the body
        body.setPosition(newPos);
        if (newAngle !== null) {
            body.setAngle(newAngle);
        }

        let isValid = true;

        // Check for overlaps with other bodies and walls
        let fixture = body.getFixtureList();
        while (fixture && isValid) {
            // Get AABB for this fixture
            const aabb = fixture.getAABB(0);

            // Query for overlapping fixtures
            this.physicsWorld.world.queryAABB(aabb, (otherFixture) => {
                const otherBody = otherFixture.getBody();

                // Don't check against self
                if (otherBody === body) {
                    return true;
                }

                // Check if this is a wall or another piece
                const otherData = otherBody.getUserData();
                if (otherData && (otherData.type === 'wall' || otherData.type === 'piece')) {
                    // Found overlap - position is invalid
                    isValid = false;
                    return false;
                }

                return true;
            });

            fixture = fixture.getNext();
        }

        // Restore original position
        body.setPosition(currentPos);
        if (newAngle !== null) {
            body.setAngle(currentAngle);
        }

        return isValid;
    }

    // Rotate piece 90 degrees clockwise with wall kick
    rotatePiece(body, clockwise = true) {
        const currentAngle = body.getAngle();
        const rotationAmount = clockwise ? Math.PI / 2 : -Math.PI / 2;
        const newAngle = currentAngle + rotationAmount;

        // Snap to nearest 90 degrees
        const snappedAngle = Math.round(newAngle / (Math.PI / 2)) * (Math.PI / 2);

        // Try rotation at current position
        if (this.isValidPosition(body, body.getPosition(), snappedAngle)) {
            body.setAngle(snappedAngle);
            body.setAngularVelocity(0); // Stop any rotation
            return true;
        }

        // Try wall kicks (shift piece if rotation would collide)
        const kickOffsets = [
            planck.Vec2(0.5, 0),   // Right
            planck.Vec2(-0.5, 0),  // Left
            planck.Vec2(0, -0.5),  // Up
            planck.Vec2(0.5, -0.5), // Up-right
            planck.Vec2(-0.5, -0.5) // Up-left
        ];

        for (const offset of kickOffsets) {
            const newPos = planck.Vec2(
                body.getPosition().x + offset.x,
                body.getPosition().y + offset.y
            );

            if (this.isValidPosition(body, newPos, snappedAngle)) {
                body.setPosition(newPos);
                body.setAngle(snappedAngle);
                body.setAngularVelocity(0);
                return true;
            }
        }

        // Rotation failed
        return false;
    }

    // Hard drop piece (instant fall to bottom)
    hardDropPiece(body) {
        let dropDistance = 0;
        const currentPos = body.getPosition();

        // Find lowest valid position
        for (let dy = 0.1; dy < CONFIG.GAME.PLAY_HEIGHT; dy += 0.1) {
            const testPos = planck.Vec2(currentPos.x, currentPos.y + dy);
            if (this.isValidPosition(body, testPos)) {
                dropDistance = dy;
            } else {
                break;
            }
        }

        // Move to lowest position
        if (dropDistance > 0) {
            const finalPos = planck.Vec2(currentPos.x, currentPos.y + dropDistance);
            body.setPosition(finalPos);
        }

        // Immediately settle the piece
        this.settlePiece(body);
    }
}
