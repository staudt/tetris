// Physics World Management using Planck.js

class PhysicsWorld {
    constructor() {
        // Create physics world with gravity
        this.world = planck.World({
            gravity: planck.Vec2(0, CONFIG.PHYSICS.GRAVITY)
        });

        this.walls = [];
        this.timeAccumulator = 0;
        this.createWalls();
    }

    createWalls() {
        const playWidth = CONFIG.GAME.PLAY_WIDTH;
        const playHeight = CONFIG.GAME.PLAY_HEIGHT;
        const wallThickness = 0.5;

        // Bottom wall
        const bottomWall = this.world.createBody({
            type: 'static',
            position: planck.Vec2(playWidth / 2, playHeight + wallThickness / 2)
        });
        bottomWall.createFixture({
            shape: planck.Box(playWidth / 2 + wallThickness, wallThickness),
            friction: CONFIG.PHYSICS.WALL_FRICTION,
            restitution: CONFIG.PHYSICS.WALL_RESTITUTION
        });
        bottomWall.setUserData({ type: 'wall', side: 'bottom' });
        this.walls.push(bottomWall);

        // Left wall
        const leftWall = this.world.createBody({
            type: 'static',
            position: planck.Vec2(-wallThickness / 2, playHeight / 2)
        });
        leftWall.createFixture({
            shape: planck.Box(wallThickness, playHeight / 2 + wallThickness),
            friction: CONFIG.PHYSICS.WALL_FRICTION,
            restitution: CONFIG.PHYSICS.WALL_RESTITUTION
        });
        leftWall.setUserData({ type: 'wall', side: 'left' });
        this.walls.push(leftWall);

        // Right wall
        const rightWall = this.world.createBody({
            type: 'static',
            position: planck.Vec2(playWidth + wallThickness / 2, playHeight / 2)
        });
        rightWall.createFixture({
            shape: planck.Box(wallThickness, playHeight / 2 + wallThickness),
            friction: CONFIG.PHYSICS.WALL_FRICTION,
            restitution: CONFIG.PHYSICS.WALL_RESTITUTION
        });
        rightWall.setUserData({ type: 'wall', side: 'right' });
        this.walls.push(rightWall);
    }

    step(deltaTime) {
        // Accumulate time and step physics in fixed increments
        // This ensures consistent physics regardless of frame rate
        this.timeAccumulator += deltaTime;

        const fixedStep = CONFIG.PHYSICS.TIME_STEP;
        const maxSteps = 4; // Prevent spiral of death on very slow devices
        let steps = 0;

        while (this.timeAccumulator >= fixedStep && steps < maxSteps) {
            this.world.step(
                fixedStep,
                CONFIG.PHYSICS.VELOCITY_ITERATIONS,
                CONFIG.PHYSICS.POSITION_ITERATIONS
            );
            this.timeAccumulator -= fixedStep;
            steps++;
        }

        // Prevent accumulator from growing too large
        if (this.timeAccumulator > fixedStep * 2) {
            this.timeAccumulator = 0;
        }
    }

    // Query bodies in a specific area (for line detection)
    queryAABB(lowerBound, upperBound, callback) {
        const aabb = planck.AABB(lowerBound, upperBound);
        this.world.queryAABB(aabb, callback);
    }

    // Get all bodies (for rendering, debugging)
    getBodies() {
        const bodies = [];
        let body = this.world.getBodyList();
        while (body) {
            bodies.push(body);
            body = body.getNext();
        }
        return bodies;
    }

    // Destroy a body
    destroyBody(body) {
        if (body) {
            this.world.destroyBody(body);
        }
    }

    // Clear all dynamic bodies (for game reset)
    clearDynamicBodies() {
        const bodiesToDestroy = [];
        let body = this.world.getBodyList();

        while (body) {
            const userData = body.getUserData();
            if (body.isDynamic() || body.isKinematic()) {
                if (!userData || userData.type !== 'wall') {
                    bodiesToDestroy.push(body);
                }
            }
            body = body.getNext();
        }

        bodiesToDestroy.forEach(b => this.world.destroyBody(b));
    }
}
