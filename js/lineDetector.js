// Line Detection using AABB Queries

class LineDetector {
    constructor(physicsWorld) {
        this.physicsWorld = physicsWorld;

        // Animation state for line clearing
        this.pendingClear = null;  // { fixtures, startTime, blinkCount }
        this.blinkDuration = 0.5;  // Total animation time in seconds
        this.blinkRate = 0.08;     // Time per blink toggle
    }

    // Check if we're currently animating a line clear
    isAnimating() {
        return this.pendingClear !== null;
    }

    // Get fixtures currently being animated (for renderer)
    getBlinkingFixtures() {
        if (!this.pendingClear) return { fixtures: [], visible: true };

        const elapsed = (Date.now() - this.pendingClear.startTime) / 1000;
        const blinkPhase = Math.floor(elapsed / this.blinkRate);
        const visible = blinkPhase % 2 === 0;

        return {
            fixtures: this.pendingClear.fixtures,
            visible: visible
        };
    }

    // Update animation and clear when done
    updateAnimation(gameState) {
        if (!this.pendingClear) return;

        const elapsed = (Date.now() - this.pendingClear.startTime) / 1000;

        if (elapsed >= this.blinkDuration) {
            // Animation complete, now actually clear the lines
            this.finishClear(gameState);
        }
    }

    // Actually destroy the fixtures after animation
    finishClear(gameState) {
        if (!this.pendingClear) return;

        const fixturesToDestroy = this.pendingClear.fixtures;
        const affectedBodies = new Set();

        // Collect affected bodies
        fixturesToDestroy.forEach(fixture => {
            try {
                const body = fixture.getBody();
                if (body) {
                    affectedBodies.add(body);
                }
            } catch (e) {}
        });

        // Destroy individual fixtures
        fixturesToDestroy.forEach(fixture => {
            try {
                const body = fixture.getBody();
                if (body) {
                    body.destroyFixture(fixture);
                }
            } catch (e) {}
        });

        // Check for empty bodies and split disconnected fixtures
        affectedBodies.forEach(body => {
            try {
                if (!body.getFixtureList()) {
                    // Body has no fixtures left, destroy it
                    this.physicsWorld.destroyBody(body);
                } else {
                    // Body still has fixtures - check if they're disconnected
                    this.splitDisconnectedFixtures(body);
                }
            } catch (e) {}
        });

        // Update score
        this.updateScore(this.pendingClear.lineCount, gameState);

        // Clear pending state
        this.pendingClear = null;
    }

    // Get the centroid of a fixture in world coordinates
    getFixtureCentroid(fixture) {
        const body = fixture.getBody();
        const shape = fixture.getShape();

        // Get the vertices of the polygon shape
        if (shape.getType() === 'polygon') {
            const vertices = [];
            for (let i = 0; i < shape.m_count; i++) {
                const localVertex = shape.m_vertices[i];
                const worldVertex = body.getWorldPoint(localVertex);
                vertices.push(worldVertex);
            }

            // Calculate centroid
            let sumX = 0, sumY = 0;
            for (const v of vertices) {
                sumX += v.x;
                sumY += v.y;
            }
            return { x: sumX / vertices.length, y: sumY / vertices.length };
        }

        // Fallback to body position
        const pos = body.getPosition();
        return { x: pos.x, y: pos.y };
    }

    // Cluster fixtures by their Y-centroid to find blocks on the same row
    clusterByRow(fixtures, tolerance) {
        if (fixtures.length === 0) return [];

        // Get centroid for each fixture
        const fixturesWithCentroid = fixtures.map(f => ({
            fixture: f,
            centroid: this.getFixtureCentroid(f)
        }));

        // Sort by Y position
        fixturesWithCentroid.sort((a, b) => a.centroid.y - b.centroid.y);

        // Group into clusters where Y positions are within tolerance
        const clusters = [];
        let currentCluster = [fixturesWithCentroid[0]];

        for (let i = 1; i < fixturesWithCentroid.length; i++) {
            const prev = fixturesWithCentroid[i - 1];
            const curr = fixturesWithCentroid[i];

            if (curr.centroid.y - prev.centroid.y <= tolerance) {
                currentCluster.push(curr);
            } else {
                clusters.push(currentCluster);
                currentCluster = [curr];
            }
        }
        clusters.push(currentCluster);

        return clusters;
    }

    // Check if a cluster of fixtures covers enough columns
    checkHorizontalCoverage(cluster, playWidth, minBlocks) {
        const columnsCovered = new Set();

        for (const item of cluster) {
            // Determine which column this block is in (0-9)
            const column = Math.floor(item.centroid.x);
            if (column >= 0 && column < playWidth) {
                columnsCovered.add(column);
            }
        }

        // Need at least minBlocks columns covered
        return columnsCovered.size >= minBlocks;
    }

    // Detect completed lines by scanning vertically with thin slices
    detectCompletedLines() {
        const completedRows = [];
        const minBlocks = CONFIG.LINE_DETECTION.MIN_BLOCKS_FOR_LINE;
        const rowTolerance = CONFIG.LINE_DETECTION.ROW_TOLERANCE;
        const sliceHeight = 0.8; // Wider slice to catch potential rows
        const scanStep = 0.5;    // Scan every half block
        const playHeight = CONFIG.GAME.PLAY_HEIGHT;
        const playWidth = CONFIG.GAME.PLAY_WIDTH;

        // Track which fixtures we've already cleared to avoid double-counting
        const alreadyCleared = new Set();

        // Scan from bottom to top
        for (let y = playHeight - 0.5; y >= 0; y -= scanStep) {
            const sliceTop = y - sliceHeight / 2;
            const sliceBottom = y + sliceHeight / 2;

            // Create AABB for this thin horizontal slice
            const lowerBound = planck.Vec2(0, sliceTop);
            const upperBound = planck.Vec2(playWidth, sliceBottom);

            const fixturesInSlice = [];

            // Query all fixtures overlapping this slice
            this.physicsWorld.queryAABB(lowerBound, upperBound, (fixture) => {
                // Skip if already marked for clearing
                if (alreadyCleared.has(fixture)) {
                    return true;
                }

                const body = fixture.getBody();
                const userData = body.getUserData();

                // Only count settled pieces
                if (userData && userData.type === 'piece' && !userData.isActive) {
                    const velocity = body.getLinearVelocity();
                    const speed = velocity.length();

                    if (speed < CONFIG.PHYSICS.SETTLE_VELOCITY_THRESHOLD) {
                        fixturesInSlice.push(fixture);
                    }
                }

                return true; // Continue query
            });

            // Need at least minimum blocks to even consider
            if (fixturesInSlice.length < minBlocks) {
                continue;
            }

            // Cluster fixtures by their actual Y position
            const clusters = this.clusterByRow(fixturesInSlice, rowTolerance);

            // Check each cluster for a complete line
            for (const cluster of clusters) {
                // Must have enough blocks
                if (cluster.length < minBlocks) {
                    continue;
                }

                // Must cover enough columns horizontally
                if (!this.checkHorizontalCoverage(cluster, playWidth, minBlocks)) {
                    continue;
                }

                // This cluster forms a complete line!
                const clusterFixtures = cluster.map(item => item.fixture);

                // Mark these fixtures as cleared so they don't count again
                clusterFixtures.forEach(f => alreadyCleared.add(f));

                // Calculate the average Y for this row
                const avgY = cluster.reduce((sum, item) => sum + item.centroid.y, 0) / cluster.length;

                completedRows.push({
                    row: avgY,
                    fixtures: clusterFixtures
                });
            }
        }

        return completedRows;
    }

    // Start clearing animation (don't destroy yet)
    clearLines(completedRows, gameState) {
        if (completedRows.length === 0) {
            return;
        }

        // Don't start new clear if already animating
        if (this.pendingClear) {
            return;
        }

        // Collect all fixtures to destroy
        const fixturesToDestroy = [];

        completedRows.forEach(rowInfo => {
            rowInfo.fixtures.forEach(fixture => {
                try {
                    const body = fixture.getBody();
                    if (body) {
                        fixturesToDestroy.push(fixture);
                    }
                } catch (e) {}
            });
        });

        if (fixturesToDestroy.length === 0) {
            return;
        }

        // Play line clear sound(s) sequentially
        if (soundManager) {
            soundManager.playSequential('line', completedRows.length, CONFIG.SOUND.LINE_CLEAR_DELAY);
        }

        // Start blinking animation
        this.pendingClear = {
            fixtures: fixturesToDestroy,
            startTime: Date.now(),
            lineCount: completedRows.length
        };
    }

    // Update score based on lines cleared
    updateScore(lineCount, gameState) {
        let points = 0;

        switch (lineCount) {
            case 1:
                points = CONFIG.SCORE.SINGLE;
                break;
            case 2:
                points = CONFIG.SCORE.DOUBLE;
                break;
            case 3:
                points = CONFIG.SCORE.TRIPLE;
                break;
            case 4:
                points = CONFIG.SCORE.TETRIS;
                break;
            default:
                points = lineCount * CONFIG.SCORE.SINGLE; // Fallback
        }

        gameState.score += points * gameState.level;
        gameState.lines += lineCount;

        // Level up every 10 lines
        const newLevel = Math.floor(gameState.lines / CONFIG.SCORE.LINES_PER_LEVEL) + 1;
        if (newLevel > gameState.level) {
            gameState.level = newLevel;
            if (soundManager) soundManager.play('levelup');
        }
    }

    // Get the local center position of a fixture (relative to body)
    getFixtureLocalCenter(fixture) {
        const shape = fixture.getShape();
        if (shape.getType() === 'polygon') {
            let sumX = 0, sumY = 0;
            for (let i = 0; i < shape.m_count; i++) {
                sumX += shape.m_vertices[i].x;
                sumY += shape.m_vertices[i].y;
            }
            return { x: sumX / shape.m_count, y: sumY / shape.m_count };
        }
        return { x: 0, y: 0 };
    }

    // Find connected components of fixtures in a body
    // Two fixtures are adjacent if their centers are ~1 unit apart (sharing an edge)
    findConnectedComponents(body) {
        const fixtures = [];
        let fixture = body.getFixtureList();
        while (fixture) {
            fixtures.push({
                fixture: fixture,
                center: this.getFixtureLocalCenter(fixture)
            });
            fixture = fixture.getNext();
        }

        if (fixtures.length <= 1) {
            return [fixtures]; // Single fixture or empty - no splitting needed
        }

        // Use union-find to group connected fixtures
        const parent = fixtures.map((_, i) => i);

        const find = (i) => {
            if (parent[i] !== i) parent[i] = find(parent[i]);
            return parent[i];
        };

        const union = (i, j) => {
            parent[find(i)] = find(j);
        };

        // Check each pair - fixtures are adjacent if centers are ~1 unit apart
        const adjacencyThreshold = 1.1; // Slightly more than 1 to account for floating point

        for (let i = 0; i < fixtures.length; i++) {
            for (let j = i + 1; j < fixtures.length; j++) {
                const dx = Math.abs(fixtures[i].center.x - fixtures[j].center.x);
                const dy = Math.abs(fixtures[i].center.y - fixtures[j].center.y);

                // Adjacent if sharing an edge (one dimension ~1, other ~0)
                const isHorizontallyAdjacent = dx < adjacencyThreshold && dx > 0.5 && dy < 0.5;
                const isVerticallyAdjacent = dy < adjacencyThreshold && dy > 0.5 && dx < 0.5;

                if (isHorizontallyAdjacent || isVerticallyAdjacent) {
                    union(i, j);
                }
            }
        }

        // Group fixtures by their root parent
        const components = new Map();
        for (let i = 0; i < fixtures.length; i++) {
            const root = find(i);
            if (!components.has(root)) {
                components.set(root, []);
            }
            components.get(root).push(fixtures[i]);
        }

        return Array.from(components.values());
    }

    // Split disconnected fixtures into separate bodies
    splitDisconnectedFixtures(body) {
        const components = this.findConnectedComponents(body);

        // If only one component, nothing to split
        if (components.length <= 1) {
            return;
        }

        const userData = body.getUserData();
        const bodyAngle = body.getAngle();

        // Keep the first (largest) component on the original body
        // Create new bodies for the rest
        components.sort((a, b) => b.length - a.length);

        for (let i = 1; i < components.length; i++) {
            const component = components[i];

            // Calculate center of mass for this component
            let centerX = 0, centerY = 0;
            component.forEach(item => {
                centerX += item.center.x;
                centerY += item.center.y;
            });
            centerX /= component.length;
            centerY /= component.length;

            // Get world position for the new body center
            const localCenter = planck.Vec2(centerX, centerY);
            const worldCenter = body.getWorldPoint(localCenter);

            // Create new body at this position
            const newBody = this.physicsWorld.world.createBody({
                type: 'dynamic',
                position: worldCenter,
                angle: bodyAngle,
                linearDamping: 0.1,
                angularDamping: 0.5,
                fixedRotation: false
            });

            // Copy velocity from original body
            newBody.setLinearVelocity(body.getLinearVelocity());
            newBody.setAngularVelocity(body.getAngularVelocity());

            // Move fixtures to new body
            component.forEach(item => {
                const oldFixture = item.fixture;
                const shape = oldFixture.getShape();

                // Create new fixture with offset relative to new center
                const newOffsetX = item.center.x - centerX;
                const newOffsetY = item.center.y - centerY;

                newBody.createFixture({
                    shape: planck.Box(0.45, 0.45, planck.Vec2(newOffsetX, newOffsetY), 0),
                    density: CONFIG.PHYSICS.PIECE_DENSITY,
                    friction: CONFIG.PHYSICS.PIECE_FRICTION,
                    restitution: CONFIG.PHYSICS.PIECE_RESTITUTION
                });

                // Remove from original body
                body.destroyFixture(oldFixture);
            });

            // Copy user data to new body
            newBody.setUserData({
                type: 'piece',
                pieceType: userData ? userData.pieceType : 'fragment',
                color: userData ? userData.color : '#9bbc0f',
                isActive: false,
                spawnTime: Date.now(),
                settleTimer: 0
            });
        }

        // Update the original body's center of mass if needed
        // (Planck.js handles this automatically when fixtures change)
    }

    // Check if game is over (pieces reached top)
    isGameOver() {
        const topRows = 2; // Check top 2 rows
        let hasBlocksAtTop = false;

        for (let row = 0; row < topRows; row++) {
            const rowY = row + 0.5;
            const lowerBound = planck.Vec2(0, rowY - 0.3);
            const upperBound = planck.Vec2(CONFIG.GAME.PLAY_WIDTH, rowY + 0.3);

            this.physicsWorld.queryAABB(lowerBound, upperBound, (fixture) => {
                const body = fixture.getBody();
                const userData = body.getUserData();

                // Check for settled pieces at top
                if (userData && userData.type === 'piece' && !userData.isActive) {
                    const velocity = body.getLinearVelocity();
                    if (velocity.length() < CONFIG.PHYSICS.SETTLE_VELOCITY_THRESHOLD) {
                        hasBlocksAtTop = true;
                        return false; // Stop query
                    }
                }

                return true;
            });

            if (hasBlocksAtTop) {
                break;
            }
        }

        return hasBlocksAtTop;
    }
}
