let velocity = new THREE.Vector2();
const gravity = -0.02; //default -0.02
const friction = 0.98; //default 0.98
const groundedDamping = 0.8;
const rollingFriction = 0.98;
const velocityThreshold = 0.0005;
const groundedThreshold = 0.01;
const slopeFriction = 0.05; // Universal friction coefficient for slopes

import { terrainPoints, terrainWidth } from './terrain.js';
import { terrain, ball, ballRadius} from './main.js';
import { isDragging} from './controls.js';

export { applyPhysics, velocity };

function getTerrainHeightAt(x) {
    let closestPointLeft = null;
    let closestPointRight = null;

    if (!terrainPoints || terrainPoints.length === 0) {
        console.error("terrainPoints is empty or undefined.");
        return terrain.position.y;
    }

    terrainPoints.forEach(point => {
        if (point.x <= x && (!closestPointLeft || point.x > closestPointLeft.x)) {
            closestPointLeft = point;
        }
        if (point.x >= x && (!closestPointRight || point.x < closestPointRight.x)) {
            closestPointRight = point;
        }
    });

    if (closestPointLeft && closestPointRight && closestPointLeft.x === closestPointRight.x) {
        return closestPointLeft.y;
    }

    if (closestPointLeft && closestPointRight) {
        const t = (x - closestPointLeft.x) / (closestPointRight.x - closestPointLeft.x);
        return closestPointLeft.y * (1 - t) + closestPointRight.y * t;
    }

    if (closestPointLeft) return closestPointLeft.y;
    if (closestPointRight) return closestPointRight.y;

    return terrain.position.y;
}

function getTerrainSlopeAngleAt(x) {
    const delta = 0.01;
    const heightAtX1 = getTerrainHeightAt(x - delta);
    const heightAtX2 = getTerrainHeightAt(x + delta);
    return Math.atan2(heightAtX2 - heightAtX1, 2 * delta);
}

function isInValley(x, slopeAngle) {
    const leftSlope = getTerrainSlopeAngleAt(x - 0.1);
    const rightSlope = getTerrainSlopeAngleAt(x + 0.1);
    return leftSlope < -0.1 && rightSlope > 0.1;
}

function handleGroundedState(slopeAngle, inValley) {
    // Base force from gravity along the slope
    // This naturally handles both uphill and downhill cases
    const slopeForce = gravity * Math.sin(slopeAngle);

    // Normal force perpendicular to the slope
    const normalForce = gravity * Math.cos(slopeAngle);

    // Apply force along the slope
    velocity.x += slopeForce;

    // Apply friction based on normal force and slope
    const frictionForce = -Math.sign(velocity.x) * Math.abs(normalForce) * slopeFriction;
    velocity.x += frictionForce;

    // Additional rolling resistance based on slope steepness
    const rollingResistance = 1 - (Math.abs(Math.sin(slopeAngle)) * 0.1);
    velocity.x *= rollingResistance;

    // Valley handling
    if (inValley) {
        velocity.x *= 0.95;
        if (Math.abs(velocity.x) < velocityThreshold * 2) {
            velocity.x = 0;
        }
    }

    // Damp vertical velocity when grounded
    velocity.y *= groundedDamping;

    // Stop if barely moving
    if (Math.abs(velocity.x) < velocityThreshold && Math.abs(velocity.y) < velocityThreshold) {
        velocity.x = 0;
        velocity.y = 0;
    }
}

function applyPhysics() {
    if (!isDragging) {
        const terrainHeight = getTerrainHeightAt(ball.position.x) + ballRadius;
        const slopeAngle = getTerrainSlopeAngleAt(ball.position.x);
        const inValley = isInValley(ball.position.x, slopeAngle);

        const distanceToGround = ball.position.y - terrainHeight;
        const isGrounded = distanceToGround < groundedThreshold;

        if (isGrounded) {
            ball.position.y = terrainHeight;
            handleGroundedState(slopeAngle, inValley);
        } else {
            velocity.y += gravity; // Apply gravity when not grounded
        }

        // Update position
        ball.position.x += velocity.x;
        ball.position.y += velocity.y;

        // Prevent sinking into terrain
        const finalTerrainHeight = getTerrainHeightAt(ball.position.x) + ballRadius;
        if (ball.position.y < finalTerrainHeight) {
            ball.position.y = finalTerrainHeight;
            if (velocity.y < 0) {
                velocity.y = 0;
            }
        }

        // **Boundary Collision Detection** - Check if ball is out of bounds
        if (ball.position.x - ballRadius < -terrainWidth / 2) {
            ball.position.x = -terrainWidth / 2 + ballRadius; // Prevent ball from going left off terrain
            velocity.x = 0; // Stop horizontal movement
        }

        if (ball.position.x + ballRadius > terrainWidth / 2) {
            ball.position.x = terrainWidth / 2 - ballRadius; // Prevent ball from going right off terrain
            velocity.x = 0; // Stop horizontal movement
        }
    }
}
